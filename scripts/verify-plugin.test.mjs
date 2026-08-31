import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseFrontmatter, verifyPlugin, extractUrls } from './verify-plugin.mjs';

const makePlugin = (root, overrides = {}) => {
  const {
    pluginJson = {
      name: 'remotion', version: '0.1.0',
      description: 'd', skills: ['skills/remotion'], commands: ['commands'],
    },
    marketplaceJson = { name: 'm', plugins: [{ name: 'remotion', source: './', version: '0.1.0' }] },
    skillMd = '---\nname: remotion\ndescription: "Make videos. Use when the user wants a video / 视频."\n---\n# Router\n',
    commandMd = '---\ndescription: "Set up Remotion skills"\n---\nBody\n',
  } = overrides;
  mkdirSync(join(root, '.zcode-plugin'), { recursive: true });
  writeFileSync(join(root, '.zcode-plugin', 'plugin.json'), JSON.stringify(pluginJson));
  writeFileSync(join(root, 'marketplace.json'), JSON.stringify(marketplaceJson));
  mkdirSync(join(root, 'skills', 'remotion'), { recursive: true });
  writeFileSync(join(root, 'skills', 'remotion', 'SKILL.md'), skillMd);
  mkdirSync(join(root, 'commands'), { recursive: true });
  writeFileSync(join(root, 'commands', 'remotion-setup.md'), commandMd);
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

test('valid plugin passes', async () => {
  const { errors, warnings } = await withTempPlugin({});
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('invalid plugin name is flagged', async () => {
  const { errors } = await withTempPlugin({
    pluginJson: { name: 'Bad Name!', version: '0.1.0' },
  });
  assert.ok(errors.some((e) => e.includes('plugin name')));
});

test('version mismatch between manifests is flagged', async () => {
  const { errors } = await withTempPlugin({
    marketplaceJson: { name: 'm', plugins: [{ name: 'remotion', source: './', version: '0.2.0' }] },
  });
  assert.ok(errors.some((e) => e.includes('version')));
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
      name: 'remotion', version: '0.1.0', description: 'd',
      skills: 'skills', commands: 'commands',
    },
  });
  assert.deepEqual(errors, []);
});
