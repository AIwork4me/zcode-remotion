import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseFrontmatter, verifyPlugin, extractUrls } from './verify-plugin.mjs';
import { validateManifest, classifyDrift, checkRouterCoverage } from './compatibility.mjs';
import { writeUpstream } from './drift-check.mjs';

const V = '0.1.0';
// Router text mentions every fixture manifest skill → routing coverage holds.
const ROUTER_SKILL_MD = `---\nname: remotion\ndescription: "Make videos. Use when the user wants a video / 视频."\nlicense: MIT\nmetadata:\n  author: t\n  version: "${V}"\n---\n# Router\n\n| intent | official skill |\n|---|---|\n| create | remotion-create |\n| render | remotion-render |\n`;

const makePlugin = (root, {
  pluginJson = { name: 'remotion', version: V, description: 'd', skills: ['skills/remotion'], commands: ['commands'] },
  marketplaceJson = { name: 'm', plugins: [{ name: 'remotion', source: './', version: V, category: 'productivity', tags: ['remotion', 'video'] }] },
  skillMd = ROUTER_SKILL_MD,
  commandMd = '---\ndescription: "Set up Remotion skills"\n---\nBody\n',
  compatJson = { remotion: { tested: '4.0.519' }, skills: { tested: '4.0.519', count: 2, names: ['remotion-create', 'remotion-render'] } },
  readmeMd = 'Tested against: Remotion `4.0.519` · official skills `4.0.519`\n',
  readmeZhMd = '测试基线：Remotion `4.0.519` · 官方技能 `4.0.519`\n',
  changelogMd = `# Changelog\n\n## ${V}\n\n- initial\n`,
} = {}) => {
  mkdirSync(join(root, '.zcode-plugin'), { recursive: true });
  writeFileSync(join(root, '.zcode-plugin', 'plugin.json'), JSON.stringify(pluginJson));
  writeFileSync(join(root, 'marketplace.json'), JSON.stringify(marketplaceJson));
  mkdirSync(join(root, 'compatibility'), { recursive: true });
  writeFileSync(join(root, 'compatibility', 'remotion.json'), JSON.stringify(compatJson));
  mkdirSync(join(root, 'skills', 'remotion'), { recursive: true });
  writeFileSync(join(root, 'skills', 'remotion', 'SKILL.md'), skillMd);
  mkdirSync(join(root, 'commands'), { recursive: true });
  writeFileSync(join(root, 'commands', 'remotion-setup.md'), commandMd);
  writeFileSync(join(root, 'README.md'), readmeMd);
  writeFileSync(join(root, 'README.zh-CN.md'), readmeZhMd);
  writeFileSync(join(root, 'CHANGELOG.md'), changelogMd);
};

const withTempPlugin = async (overrides) => {
  const root = mkdtempSync(join(tmpdir(), 'verify-plugin-'));
  makePlugin(root, overrides);
  const result = await verifyPlugin(root, { offline: true });
  rmSync(root, { recursive: true, force: true });
  return result;
};

test('parseFrontmatter extracts yaml-ish fields', () => {
  const { data, body } = parseFrontmatter('---\nname: x\ndescription: "y"\n---\nbody');
  assert.equal(data.name, 'x');
  assert.equal(data.description, 'y');
  assert.ok(body.includes('body'));
});

test('parseFrontmatter parses CRLF files (Windows autocrlf checkout)', () => {
  const { data } = parseFrontmatter('---\r\nname: remotion\r\nlicense: MIT\r\nmetadata:\r\n---\r\nbody');
  assert.equal(data.name, 'remotion');
  assert.equal(data.license, 'MIT');
  assert.equal(data.metadata, '');
});

test('parseFrontmatter throws without closing delimiter', () => {
  assert.throws(() => parseFrontmatter('---\nname: x\n'));
});

test('extractUrls strips trailing punctuation', () => {
  const urls = extractUrls('see https://example.com/docs. and (https://x.dev/a))');
  assert.deepEqual(urls, ['https://example.com/docs', 'https://x.dev/a']);
  for (const u of urls) {
    assert.ok(!u.endsWith('.') && !u.endsWith(')'));
  }
});

test('extractUrls strips trailing backtick (markdown code span)', () => {
  assert.deepEqual(extractUrls('paste `https://github.com/x/y` here'), ['https://github.com/x/y']);
});

test('valid plugin passes', async () => {
  const { errors, warnings } = await withTempPlugin({});
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('CRLF checkout keeps the full plugin valid (end-to-end)', async () => {
  await withTempPlugin({}); // fixture sanity
  const root = mkdtempSync(join(tmpdir(), 'verify-plugin-'));
  makePlugin(root, { skillMd: ROUTER_SKILL_MD.replaceAll('\n', '\r\n') });
  const { errors } = await verifyPlugin(root, { offline: true });
  rmSync(root, { recursive: true, force: true });
  assert.deepEqual(errors, []);
});

test('invalid plugin name is flagged', async () => {
  const { errors } = await withTempPlugin({
    pluginJson: { name: 'Bad Name!', version: V },
  });
  assert.ok(errors.some((e) => e.includes('plugin name')));
});

test('version mismatch between manifests is flagged', async () => {
  const { errors } = await withTempPlugin({
    marketplaceJson: { name: 'm', plugins: [{ name: 'remotion', source: './', version: '0.2.0' }] },
  });
  assert.ok(errors.some((e) => e.includes('version')));
});

test('forbidden fields are reported as project policy, not spec', async () => {
  const { errors } = await withTempPlugin({
    pluginJson: { name: 'remotion', version: V, hooks: {}, mcpServers: {}, userConfig: {}, dependencies: [] },
  });
  for (const key of ['hooks', 'mcpServers', 'userConfig', 'dependencies']) {
    const e = errors.find((x) => x.includes(key));
    assert.ok(e, `${key} should be flagged`);
    assert.ok(e.includes('forbidden by zcode-remotion project policy'), e);
    assert.ok(!e.includes('by spec'), `wording must not blame the spec: ${e}`);
  }
});

test('missing skill description is flagged', async () => {
  const { errors } = await withTempPlugin({
    skillMd: '---\nname: remotion\ndescription: ""\n---\nbody',
  });
  assert.ok(errors.some((e) => e.includes('description')));
});

test('overlong description is flagged', async () => {
  const { errors } = await withTempPlugin({
    skillMd: `---\nname: remotion\ndescription: "${'x'.repeat(1025)}"\n---\nbody`,
  });
  assert.ok(errors.some((e) => e.includes('1024')));
});

test('command without description is flagged', async () => {
  const { errors } = await withTempPlugin({
    commandMd: '---\nfoo: bar\n---\nBody\n',
  });
  assert.ok(errors.some((e) => e.includes('remotion-setup')));
});

test('placeholder tokens in shipped files are flagged', async () => {
  const root = mkdtempSync(join(tmpdir(), 'verify-plugin-'));
  makePlugin(root);
  writeFileSync(join(root, 'skills', 'remotion', 'SKILL.md'),
    '---\nname: remotion\ndescription: "Make videos. Use when 视频."\n---\nTODO fix\n');
  const { errors } = await verifyPlugin(root, { offline: true });
  rmSync(root, { recursive: true, force: true });
  assert.ok(errors.some((e) => e.includes('TODO')));
});

test('declared-but-missing component dir is flagged', async () => {
  const root = mkdtempSync(join(tmpdir(), 'verify-plugin-'));
  makePlugin(root);
  rmSync(join(root, 'commands'), { recursive: true, force: true });
  const { errors } = await verifyPlugin(root, { offline: true });
  rmSync(root, { recursive: true, force: true });
  assert.ok(errors.some((e) => e.includes('commands')));
});

test('string-form skills/commands declarations are accepted', async () => {
  const { errors } = await withTempPlugin({
    pluginJson: {
      name: 'remotion', version: V, description: 'd',
      skills: 'skills', commands: 'commands',
    },
  });
  assert.deepEqual(errors, []);
});

// --- compatibility manifest (validateManifest) ---

test('valid compatibility manifest produces no errors', () => {
  assert.deepEqual(validateManifest({
    remotion: { tested: '4.0.519' },
    skills: { tested: '4.0.519', count: 2, names: ['remotion-create', 'remotion-render'] },
    mediabunny: { tested: '1.55.4' },
    verifiedAt: '2026-09-01',
  }), []);
});

test('malformed compatibility manifests are flagged', () => {
  assert.ok(validateManifest(null).length > 0);
  assert.ok(validateManifest([]).length > 0);
  assert.ok(validateManifest({ skills: { tested: '1.0.0', count: 1, names: ['a'] } }).some((e) => e.includes('remotion')));
  assert.ok(validateManifest({ remotion: { tested: 'latest' }, skills: { tested: '1.0.0', count: 1, names: ['a'] } }).some((e) => e.includes('remotion.tested')));
  assert.ok(validateManifest({ remotion: { tested: '4.0.519' }, skills: { tested: 'x', count: 1, names: ['a'] } }).some((e) => e.includes('skills.tested')));
  assert.ok(validateManifest({ remotion: { tested: '4.0.519' }, skills: { tested: '1.0.0', count: 1, names: ['a'] } }).length === 0);
});

test('skill count must match names length', () => {
  const errors = validateManifest({
    remotion: { tested: '4.0.519' },
    skills: { tested: '4.0.519', count: 3, names: ['a', 'b'] },
  });
  assert.ok(errors.some((e) => e.includes('skills.count')));
});

test('duplicate skill names fail', () => {
  const errors = validateManifest({
    remotion: { tested: '4.0.519' },
    skills: { tested: '4.0.519', count: 2, names: ['a', 'a'] },
  });
  assert.ok(errors.some((e) => e.includes('duplicate')));
});

test('router coverage gaps are flagged against the routing table', async () => {
  const { errors } = await withTempPlugin({
    compatJson: { remotion: { tested: '4.0.519' }, skills: { tested: '4.0.519', count: 1, names: ['remotion-notrouted'] } },
  });
  assert.ok(errors.some((e) => e.includes('remotion-notrouted') && e.includes('routing coverage')));
});

test('missing compatibility manifest is flagged', async () => {
  const root = mkdtempSync(join(tmpdir(), 'verify-plugin-'));
  makePlugin(root);
  rmSync(join(root, 'compatibility'), { recursive: true, force: true });
  const { errors } = await verifyPlugin(root, { offline: true });
  rmSync(root, { recursive: true, force: true });
  assert.ok(errors.some((e) => e.includes('compatibility/remotion.json')));
});

test('README tested-against lines must match the compatibility manifest', async () => {
  const { errors } = await withTempPlugin({
    readmeMd: 'Tested against: Remotion `4.0.1` · official skills `4.0.1`\n',
  });
  assert.ok(errors.some((e) => e.includes('README.md') && e.includes('4.0.1')));
  const { errors: zhErrors } = await withTempPlugin({
    readmeZhMd: '测试基线：Remotion `4.0.1` · 官方技能 `4.0.1`\n',
  });
  assert.ok(zhErrors.some((e) => e.includes('README.zh-CN.md')));
});

test('router skill metadata version must match plugin.json', async () => {
  const { errors } = await withTempPlugin({
    skillMd: ROUTER_SKILL_MD.replace(`version: "${V}"`, 'version: "9.9.9"'),
  });
  assert.ok(errors.some((e) => e.includes('metadata version')));
});

test('CHANGELOG latest heading must match plugin.json version', async () => {
  const { errors } = await withTempPlugin({
    changelogMd: '# Changelog\n\n## 9.9.9\n\n- other\n',
  });
  assert.ok(errors.some((e) => e.includes('CHANGELOG.md')));
});

test('marketplace entry with invalid tags shape is flagged', async () => {
  const { errors } = await withTempPlugin({
    marketplaceJson: { name: 'm', plugins: [{ name: 'remotion', source: './', version: V, tags: 'remotion' }] },
  });
  assert.ok(errors.some((e) => e.includes('tags')));
});

// --- drift classification (classifyDrift) ---

const recorded = {
  remotion: { tested: '4.0.519' },
  skills: { tested: '4.0.519', count: 2, names: ['remotion-create', 'remotion-render'] },
};
const upstreamOf = (over = {}) => ({
  remotion: '4.0.519', skillsVersion: '4.0.519',
  skillNames: ['remotion-create', 'remotion-render'], ...over,
});

test('drift: none when upstream matches the baseline', () => {
  const d = classifyDrift(recorded, upstreamOf());
  assert.equal(d.level, 'none');
});

test('drift: version-only movement is low-risk', () => {
  const d = classifyDrift(recorded, upstreamOf({ remotion: '4.0.520', skillsVersion: '4.0.520' }));
  assert.equal(d.level, 'low');
  assert.ok(d.reasons.some((r) => r.includes('4.0.520')));
});

test('drift: new upstream skill is high-risk with routing warning', () => {
  const d = classifyDrift(recorded, upstreamOf({ skillNames: ['remotion-create', 'remotion-render', 'remotion-xxx'] }));
  assert.equal(d.level, 'high');
  assert.ok(d.reasons.some((r) => r.includes('NEW UPSTREAM SKILL DETECTED: remotion-xxx')));
  assert.ok(d.reasons.some((r) => r.includes('Routing coverage missing'.toLowerCase()) || r.toLowerCase().includes('routing coverage missing')));
});

test('drift: removed upstream skill is high-risk', () => {
  const d = classifyDrift(recorded, upstreamOf({ skillNames: ['remotion-create'] }));
  assert.equal(d.level, 'high');
  assert.ok(d.reasons.some((r) => r.includes('remotion-render')));
});

test('drift: renamed upstream skill is high-risk (removed + added)', () => {
  const d = classifyDrift(recorded, upstreamOf({ skillNames: ['remotion-create', 'remotion-rendering'] }));
  assert.equal(d.level, 'high');
  assert.ok(d.added.includes('remotion-rendering'));
  assert.ok(d.removed.includes('remotion-render'));
});

test('drift: major Remotion bump is high-risk even with same topology', () => {
  const d = classifyDrift(recorded, upstreamOf({ remotion: '5.0.0', skillsVersion: '5.0.0' }));
  assert.equal(d.level, 'high');
});

test('drift: malformed upstream response is unknown, never a false claim', () => {
  for (const bad of [null, {}, { remotion: 'x', skillsVersion: '4.0.519', skillNames: [] }, { remotion: '4.0.519', skillsVersion: null, skillNames: ['a'] }]) {
    assert.equal(classifyDrift(recorded, bad).level, 'unknown');
  }
});

test('checkRouterCoverage lists unmentioned skills', () => {
  const text = 'route to remotion-create only';
  assert.deepEqual(checkRouterCoverage(['remotion-create', 'remotion-render'], text), ['remotion-render']);
});

// --- writeUpstream (nightly PR file updates) ---

test('writeUpstream rewrites manifest + both READMEs deterministically', () => {
  const root = mkdtempSync(join(tmpdir(), 'drift-write-'));
  const manifestPath = join(root, 'remotion.json');
  const readmeEn = join(root, 'README.md');
  const readmeZh = join(root, 'README.zh-CN.md');
  writeFileSync(manifestPath, JSON.stringify(recorded));
  writeFileSync(readmeEn, 'Tested against: Remotion `4.0.519` · official skills `4.0.519`\n');
  writeFileSync(readmeZh, '测试基线：Remotion `4.0.519` · 官方技能 `4.0.519`\n');
  const next = writeUpstream(recorded, upstreamOf({ remotion: '4.0.520', skillsVersion: '4.0.520' }), '2026-09-01', {
    manifestPath, readmePaths: [readmeEn, readmeZh],
  });
  assert.equal(next.remotion.tested, '4.0.520');
  const written = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(written.skills.count, 2);
  assert.deepEqual(written.skills.names, ['remotion-create', 'remotion-render']);
  assert.equal(written.verifiedAt, '2026-09-01');
  assert.ok(readFileSync(readmeEn, 'utf8').includes('Remotion `4.0.520` · official skills `4.0.520`'));
  assert.ok(readFileSync(readmeZh, 'utf8').includes('Remotion `4.0.520` · 官方技能 `4.0.520`'));
  rmSync(root, { recursive: true, force: true });
});
