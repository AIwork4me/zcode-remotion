#!/usr/bin/env node
// Static verifier for the ZCode remotion plugin. CI gate + local dev tool.
// Pure functions are exported for unit tests; CLI mode runs the full check.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_NAME_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const COMMAND_NAME_RE = /^[a-z0-9][a-z0-9_:-]{0,63}$/;
const PLACEHOLDER_RE = /\b(TBD|TODO|FIXME|XXX)\b/;

export function parseFrontmatter(text) {
  if (!text.startsWith('---')) throw new Error('frontmatter: missing opening ---');
  const end = text.indexOf('\n---', 3);
  if (end === -1) throw new Error('frontmatter: missing closing ---');
  const raw = text.slice(4, end).trim();
  const data = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (m) data[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  }
  return { data, body: text.slice(end + 4) };
}

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});

const extractUrls = (text) => [...text.matchAll(/https?:\/\/[^\s)\]>'"]+/g)].map((m) => m[0]);

export async function verifyPlugin(root, { offline = false } = {}) {
  const errors = [];
  const warnings = [];

  // 1. plugin.json
  const manifestPath = join(root, '.zcode-plugin', 'plugin.json');
  if (!existsSync(manifestPath)) return { errors: ['.zcode-plugin/plugin.json is missing'], warnings };
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!PLUGIN_NAME_RE.test(manifest.name ?? '')) errors.push(`invalid plugin name: ${manifest.name}`);
  if (!/^\d+\.\d+\.\d+/.test(manifest.version ?? '')) errors.push('plugin.json: version must be semver');
  for (const key of ['hooks', 'mcpServers', 'userConfig', 'dependencies']) {
    if (manifest[key]) errors.push(`plugin.json: ${key} is forbidden by spec (zero-config plugin)`);
  }

  // 2. declared component dirs exist
  const declaredDirs = [...(manifest.skills ?? []), ...(manifest.commands ?? [])]
    .filter((p) => typeof p === 'string' && !p.endsWith('.md'));
  for (const d of declaredDirs) {
    if (!existsSync(join(root, d))) errors.push(`declared component directory missing: ${d}`);
  }

  // 3. skills
  const skillsRoot = join(root, 'skills');
  if (existsSync(skillsRoot)) {
    for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const md = join(skillsRoot, entry.name, 'SKILL.md');
      if (!existsSync(md)) { errors.push(`skills/${entry.name}: SKILL.md missing`); continue; }
      try {
        const { data } = parseFrontmatter(readFileSync(md, 'utf8'));
        if (!data.name) errors.push(`skills/${entry.name}: frontmatter name missing`);
        if (!data.description || data.description.length < 20) {
          errors.push(`skills/${entry.name}: description missing or too short to state when-to-use`);
        }
        if ((data.description ?? '').length > 1024) {
          errors.push(`skills/${entry.name}: description exceeds 1024 chars`);
        }
      } catch (err) {
        errors.push(`skills/${entry.name}: ${err.message}`);
      }
    }
  }

  // 4. commands
  const commandsRoot = join(root, 'commands');
  if (existsSync(commandsRoot)) {
    for (const f of readdirSync(commandsRoot)) {
      if (!f.endsWith('.md')) continue;
      if (!COMMAND_NAME_RE.test(f.replace(/\.md$/, ''))) {
        errors.push(`commands/${f}: filename violates ZCode command naming`);
      }
      try {
        const { data } = parseFrontmatter(readFileSync(join(commandsRoot, f), 'utf8'));
        if (!data.description) errors.push(`commands/${f}: description frontmatter missing`);
      } catch (err) {
        errors.push(`commands/${f}: ${err.message}`);
      }
    }
  }

  // 5. marketplace.json version sync
  const mpPath = join(root, 'marketplace.json');
  if (!existsSync(mpPath)) {
    errors.push('marketplace.json missing');
  } else {
    const mp = JSON.parse(readFileSync(mpPath, 'utf8'));
    const entry = (mp.plugins ?? []).find((p) => p.name === manifest.name);
    if (!entry) errors.push('marketplace.json: plugin entry not found');
    else if (entry.version !== manifest.version) {
      errors.push(`version mismatch: plugin.json ${manifest.version} vs marketplace.json ${entry.version}`);
    }
  }

  // 6. placeholder scan in shipped files
  const shippedRoots = ['skills', 'commands', '.zcode-plugin'].map((d) => join(root, d));
  const shippedFiles = [...shippedRoots.filter(existsSync).flatMap(walk),
    ...['README.md', 'marketplace.json'].map((f) => join(root, f)).filter(existsSync)];
  for (const f of shippedFiles) {
    const text = readFileSync(f, 'utf8');
    const m = text.match(PLACEHOLDER_RE);
    if (m) errors.push(`${f}: contains placeholder token ${m[0]}`);
  }

  // 7. link check (online only)
  if (!offline) {
    const urls = new Set(shippedFiles.flatMap((f) => extractUrls(readFileSync(f, 'utf8'))));
    for (const url of urls) {
      try {
        const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        if (!res.ok) errors.push(`link check failed (${res.status}): ${url}`);
      } catch {
        warnings.push(`link check unreachable (network?): ${url}`);
      }
    }
  }

  return { errors, warnings };
}

if (process.argv[1] && process.argv[1].endsWith('verify-plugin.mjs')) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const offline = process.argv.includes('--offline');
  const { errors, warnings } = await verifyPlugin(root, { offline });
  for (const w of warnings) console.warn(`WARN: ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`FAIL: ${e}`);
    process.exit(1);
  }
  console.log('verify-plugin: all checks passed');
}
