---
description: Diagnose the Remotion + ZCode environment (Node, package manager, skills, versions, Chrome)
---

Run each check, collect results, then print ONE pass/fail table with fixes. Do
not attempt fixes before reporting. Machine-readable version sources: `npm view
remotion version` for the latest upstream stable; `npx remotion versions` inside
a Remotion project. Never use a docs page as a version source.

1. **Node**: `node -v` — pass if ≥18. Fix: install from https://nodejs.org.
2. **npx**: `npx -v` — pass if prints a version.
3. **Package manager**: detect lockfile (bun.lock/bun.lockb → bun,
   pnpm-lock.yaml → pnpm, yarn.lock → yarn, package-lock.json → npm). Report
   which one to use here.
4. **Official skills installed?** Check `.zcode/skills/` (project scope) and
   `~/.agents/skills/` plus `~/.zcode/skills/` (user scope): count `remotion-*`
   folders that contain SKILL.md and report the count + names. Fail fix:
   /remotion-setup.
5. **Skills version**: read the `version:` frontmatter from the installed
   `remotion-best-practices/SKILL.md` (first scope found in check 4). Compare
   with `npm view remotion version` — if older, flag as outdated (skills track
   the Remotion release line). Fix: /remotion-update.
6. **Remotion project check** (only if package.json has a `remotion`
   dependency): installed version via `npm ls remotion --depth=0` (or matching
   pm) or `npx remotion versions`; consistency = every `remotion`/`@remotion/*`
   entry resolves to ONE exact version (`npm ls remotion` warnings count as
   fail); latest = `npm view remotion version`. Report installed vs latest
   separately. Outdated/inconsistent fix: /remotion-update. If NOT in a Remotion
   project, mark N/A with a note.
7. **Chrome Headless Shell**: in a Remotion project run `npx remotion browser
   ensure` (if no project, skip with a note). Fail fix: check network/proxy, see
   https://www.remotion.dev/docs/chrome-headless-shell.
8. **License awareness**: print a one-line note that Remotion is free for
   individuals and companies ≤3 employees, otherwise a company license is
   required (https://www.remotion.pro). Informational — always pass.

End the report with:
- summary count: X/8 checks passed
- the single highest-priority action, with the exact fix command
  (/remotion-update, /remotion-setup, or an install command)
- pointer to the official `remotion-docs` skill for Remotion-API-specific questions
