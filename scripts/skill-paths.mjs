// Canonical official-skill discovery for zcode-remotion.
// Pure path logic — unit-tested with fake temp homes; no network, no mutation.
//
// ZCode scans BOTH of these user-scope locations (canonical first):
//   ~/.zcode/skills   (ZCode-native path)
//   ~/.agents/skills  (where the official `skills` installer puts global installs)
// Project scope is always <repo>/.zcode/skills.

import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const ROUTER_SKILL = 'remotion-best-practices';

export const userSkillDirs = (home = homedir()) =>
  [join(home, '.zcode', 'skills'), join(home, '.agents', 'skills')];

export const projectSkillDir = (projectRoot) => join(projectRoot, '.zcode', 'skills');

const hasRouter = (dir) => existsSync(join(dir, ROUTER_SKILL, 'SKILL.md'));

// Where are the official skills installed? Detection order:
// project scope, then user scope (canonical ~/.zcode/skills first, then the
// installer's ~/.agents/skills). Skills present ONLY under ~/.zcode/skills are
// a valid, complete install — never reinstall because of the ~/.agents path.
export function detectSkillInstall({ projectRoot = null, home = homedir() } = {}) {
  if (projectRoot) {
    const dir = projectSkillDir(projectRoot);
    if (hasRouter(dir)) return { scope: 'project', dir };
  }
  for (const dir of userSkillDirs(home)) {
    if (hasRouter(dir)) return { scope: 'user', dir };
  }
  return { scope: 'none', dir: null };
}

// Count installed official skills (remotion-* folders containing SKILL.md).
export function countOfficialSkills(dir) {
  if (!dir || !existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('remotion-') && existsSync(join(dir, e.name, 'SKILL.md')))
    .length;
}
