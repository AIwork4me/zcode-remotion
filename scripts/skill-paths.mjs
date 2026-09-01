// Canonical official-skill discovery + installation integrity for zcode-remotion.
// Pure logic over paths — unit-tested with fake temp homes; no network, no mutation.
//
// ZCode scans BOTH of these user-scope locations (canonical first):
//   ~/.zcode/skills   (ZCode-native path)
//   ~/.agents/skills  (where the official `skills` installer puts global installs)
// Project scope is always <repo>/.zcode/skills.
//
// Expected skill names come from compatibility/remotion.json → skills.names
// (the single canonical list). Presence of the router skill alone is NOT
// enough evidence of a complete installation.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROUTER_SKILL = 'remotion-best-practices';

export const userSkillDirs = (home = homedir()) =>
  [join(home, '.zcode', 'skills'), join(home, '.agents', 'skills')];

export const projectSkillDir = (projectRoot) => join(projectRoot, '.zcode', 'skills');

export const loadExpectedSkillNames = () =>
  JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'compatibility', 'remotion.json'), 'utf8')).skills.names;

const listInstalled = (dir) => {
  if (!existsSync(dir)) return [];
  // Test the SKILL.md path (existsSync follows symlinks) rather than the
  // Dirent type: the installer mirrors user-scope skills as symlinks/junctions,
  // whose Dirent.isDirectory() is false on real machines.
  try {
    return readdirSync(dir)
      .filter((name) => name.startsWith('remotion-') && existsSync(join(dir, name, 'SKILL.md')));
  } catch {
    return []; // unreadable dir — treat as no listing (caller still reports scope)
  }
};

// Inspect the official-skill installation.
// Precedence: the FIRST scope (project → ~/.zcode/skills → ~/.agents/skills)
// that contains the router skill's SKILL.md is THE detected installation —
// scopes are never mixed, so an incomplete higher-priority install is
// reported as incomplete rather than silently filled from another scope.
//   scope 'none'    → bootstrap required (no router skill anywhere)
//   complete true   → every expected skill present (extra[] may be non-empty;
//                     extra skills are surfaced, not a failure — upstream may
//                     have changed topology)
//   complete false  → INCOMPLETE: repair at the detected scope (do not claim
//                     "installed")
export function inspectSkillInstall({ projectRoot = null, home = homedir(), expectedSkillNames } = {}) {
  const expected = expectedSkillNames ?? loadExpectedSkillNames();
  const candidates = [];
  if (projectRoot) candidates.push({ scope: 'project', dir: projectSkillDir(projectRoot) });
  for (const dir of userSkillDirs(home)) candidates.push({ scope: 'user', dir });

  for (const { scope, dir } of candidates) {
    if (!existsSync(join(dir, ROUTER_SKILL, 'SKILL.md'))) continue;
    const installed = new Set(listInstalled(dir));
    const missing = expected.filter((n) => !installed.has(n));
    const found = expected.length - missing.length;
    return {
      scope, dir,
      expected: expected.length,
      found,
      missing,
      extra: [...installed].filter((n) => !expected.includes(n)),
      complete: missing.length === 0,
    };
  }
  return { scope: 'none', dir: null, expected: expected.length, found: 0, missing: [], extra: [], complete: false };
}

// CLI: node scripts/skill-paths.mjs [--project <dir>|--global] [--home <dir>]
// Prints the integrity report. Exit code: 0 complete · 1 incomplete · 2 none.
if (process.argv[1] && process.argv[1].endsWith('skill-paths.mjs')) {
  const args = process.argv.slice(2);
  const flag = (name) => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1]; };
  const result = inspectSkillInstall({
    projectRoot: flag('--project') ?? process.cwd(),
    home: flag('--home') ?? homedir(),
  });
  console.log(`scope: ${result.scope}`);
  if (result.scope === 'none') {
    console.log('Official Remotion skills: not installed — bootstrap required (/remotion-setup)');
  } else {
    console.log(`dir: ${result.dir}`);
    console.log(`Official Remotion skills: ${result.found}/${result.expected} present${result.complete ? '' : ' — INCOMPLETE'}`);
    if (result.missing.length) console.log(`Missing:\n${result.missing.map((n) => `- ${n}`).join('\n')}`);
    if (result.extra.length) console.log(`Extra (upstream topology may have changed):\n${result.extra.map((n) => `- ${n}`).join('\n')}`);
    console.log(result.complete
      ? 'Repair: none needed (/remotion-update keeps them current)'
      : 'Repair: /remotion-setup (installs into the detected scope — never a different one)');
  }
  process.exit(result.scope === 'none' ? 2 : result.complete ? 0 : 1);
}
