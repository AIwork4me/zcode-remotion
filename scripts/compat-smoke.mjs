#!/usr/bin/env node
// Real compatibility smoke test: builds a throwaway Remotion project at the
// version recorded in compatibility/remotion.json, bootstraps the official
// skills from a clean state (project scope), and renders — no mocks.
//
//   node scripts/compat-smoke.mjs          still frame only (CI default)
//   node scripts/compat-smoke.mjs --mp4    also render a minimal MP4
//   node scripts/compat-smoke.mjs --keep   keep the temp project for inspection
//
// Exit 0 only if: install OK, skill names/count/version on disk match the
// manifest, `remotion versions` OK, still PNG exists and is non-trivial
// (and MP4 exists when --mp4).

import { exec } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(exec);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const keep = process.argv.includes('--keep');
const withMp4 = process.argv.includes('--mp4');
const STEPS = [];

const step = async (name, fn, { timeout = 420_000 } = {}) => {
  process.stdout.write(`smoke: ${name} ... `);
  const started = Date.now();
  try {
    const out = await fn({ timeout });
    console.log(`OK (${Math.round((Date.now() - started) / 1000)}s)`);
    STEPS.push([name, 'PASS', out ?? '']);
    return out;
  } catch (err) {
    console.log('FAIL');
    STEPS.push([name, 'FAIL', String(err.message || err)]);
    fail();
  }
};

const fail = () => {
  console.error('\nsmoke: FAILED — transcript:');
  for (const [name, status, detail] of STEPS) {
    console.error(`  ${status}  ${name}${status === 'FAIL' ? `\n    ${String(detail).slice(0, 800)}` : ''}`);
  }
  if (!keep) cleanup();
  process.exit(1);
};

let project = null;
const cleanup = () => { if (project && existsSync(project)) { rmSync(project, { recursive: true, force: true }); } };

const compat = JSON.parse(readFileSync(join(ROOT, 'compatibility', 'remotion.json'), 'utf8'));
const REMOTION_V = compat.remotion.tested;
const SKILLS_V = compat.skills.tested;
const SKILL_NAMES = compat.skills.names;

const SRC = {
  'src/index.ts': `import { registerRoot } from 'remotion';\nimport { RemotionRoot } from './Root';\n\nregisterRoot(RemotionRoot);\n`,
  'src/Root.tsx': `import React from 'react';\nimport { Composition } from 'remotion';\nimport { Smoke } from './Smoke';\n\nexport const RemotionRoot = () => (\n  <Composition\n    id="Smoke"\n    component={Smoke}\n    durationInFrames={10}\n    fps={30}\n    width={1280}\n    height={720}\n    defaultProps={{ label: 'zcode-remotion compat smoke' }}\n  />\n);\n`,
  'src/Smoke.tsx': `import React from 'react';\nimport { useCurrentFrame, interpolate } from 'remotion';\n\nexport const Smoke = ({ label }) => {\n  const frame = useCurrentFrame();\n  const opacity = interpolate(frame, [0, 9], [1, 0.4]);\n  return (\n    <div style={{ flex: 1, background: '#0b1020', color: '#7dd3fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 54, fontFamily: 'sans-serif', opacity }}>\n      {label} @ {frame}\n    </div>\n  );\n};\n`,
};

process.on('exit', () => { if (!keep) cleanup(); });

// 1. fresh project at the recorded baseline version
project = mkdtempSync(join(tmpdir(), 'compat-smoke-'));
await step('fresh project at remotion@' + REMOTION_V, async ({ timeout }) => {
  writeFileSync(join(project, 'package.json'), JSON.stringify({
    name: 'compat-smoke', version: '1.0.0', private: true,
  }));
  const { stdout } = await run(`npm i --save-exact --no-audit --no-fund remotion@${REMOTION_V} @remotion/cli@${REMOTION_V} react react-dom`, { cwd: project, timeout, windowsHide: true });
  mkdirSync(join(project, 'src'), { recursive: true });
  for (const [name, content] of Object.entries(SRC)) {
    writeFileSync(join(project, name), content);
  }
  return stdout.split('\n').slice(-2).join(' | ');
}, { timeout: 600_000 });

// 2. bootstrap official skills from a clean state (project scope)
await step(`bootstrap official skills (expect ${SKILL_NAMES.length}, v${SKILLS_V})`, async ({ timeout }) => {
  const { stdout } = await run('npx -y skills add remotion-dev/skills -s "*" -y --copy', { cwd: project, timeout, windowsHide: true });
  const roots = ['.zcode/skills', '.agents/skills', 'skills'].map((r) => join(project, r));
  const base = roots.find((r) => existsSync(join(r, SKILL_NAMES[0], 'SKILL.md')));
  if (!base) throw new Error(`no installed skill dir found; looked in ${roots.join(', ')}`);
  const missing = SKILL_NAMES.filter((n) => !existsSync(join(base, n, 'SKILL.md')));
  if (missing.length) throw new Error(`missing skills on disk: ${missing.join(', ')}`);
  const installed = readdirCount(base);
  if (installed !== SKILL_NAMES.length) throw new Error(`skill count ${installed} != expected ${SKILL_NAMES.length}`);
  const fm = readFileSync(join(base, SKILL_NAMES[0], 'SKILL.md'), 'utf8');
  const m = fm.match(/^version:\s*([^\s]+)$/m);
  if (!m || m[1] !== SKILLS_V) throw new Error(`skills frontmatter version ${m ? m[1] : 'missing'} != ${SKILLS_V}`);
  return `${installed} skills in ${base}, frontmatter v${m[1]}`;
});

// 3. official CLI consistency check
await step('npx remotion versions', async ({ timeout }) => {
  const { stdout } = await run('npx remotion versions', { cwd: project, timeout, windowsHide: true });
  if (!stdout.includes('correct version')) throw new Error(`unexpected versions output: ${stdout.slice(0, 400)}`);
  return stdout.includes(REMOTION_V) ? `consistent @ ${REMOTION_V}` : stdout.slice(0, 200);
});

// 4. real still render
const still = await step('render still frame', async ({ timeout }) => {
  const out = 'out/frame.png';
  await run(`npx remotion browser ensure`, { cwd: project, timeout, windowsHide: true });
  await run(`npx remotion still src/index.ts Smoke ${out} --frame=5`, { cwd: project, timeout, windowsHide: true });
  const p = join(project, out);
  if (!existsSync(p)) throw new Error('still PNG missing');
  const bytes = statSync(p).size;
  if (bytes < 1000) throw new Error(`still PNG suspiciously small: ${bytes} bytes`);
  return `out/frame.png ${bytes} bytes`;
});

// 5. optional minimal MP4
if (withMp4) {
  await step('render minimal MP4', async ({ timeout }) => {
    const out = 'out/smoke.mp4';
    await run(`npx remotion render src/index.ts Smoke ${out}`, { cwd: project, timeout, windowsHide: true });
    const p = join(project, out);
    if (!existsSync(p)) throw new Error('MP4 missing');
    const bytes = statSync(p).size;
    if (bytes < 10_000) throw new Error(`MP4 suspiciously small: ${bytes} bytes`);
    return `out/smoke.mp4 ${bytes} bytes`;
  });
}

console.log(`smoke: PASS — remotion@${REMOTION_V}, ${SKILL_NAMES.length} official skills @ ${SKILLS_V}, still ${still}`);
if (!keep) cleanup();

function readdirCount(dir) {
  return readdirSync(dir).length;
}
