---
description: Install the official Remotion Agent Skills into ZCode and verify discovery
argument-hint: "[--project]"
---

Install the official Remotion Agent Skills via the official installer, then verify
ZCode can discover them. Idempotent — safe to re-run.

1. Pre-flight: run `node -v`. If Node is missing or <18, stop and tell the user
   to install Node ≥18 from https://nodejs.org first.
2. Scope decision (default is user scope):
   - Default → user scope (`--global`): skills available in every project.
   - `$ARGUMENTS` contains `--project` → project scope (pin skills to the
     current repo only).
3. Already-installed check — any ONE of these means done, do not reinstall:
   - project: `.zcode/skills/remotion-best-practices/SKILL.md`
   - user, ZCode-native: `~/.zcode/skills/remotion-best-practices/SKILL.md`
   - user, installer: `~/.agents/skills/remotion-best-practices/SKILL.md`
4. Install (spike-verified):

   ```bash
   npx -y skills add remotion-dev/skills -s '*' -y --copy -g # user scope (default)
   npx -y skills add remotion-dev/skills -s '*' -y --copy    # project scope (opt-in)
   ```

   `--copy` is mandatory on Windows. The warning
   "PromptScript does not support global skill installation" is expected and harmless.

   If the installer fails, keep the requested scope and follow the fallback
   ladder (never silently switch scope):
   - network/GitHub still reachable → fetch the official skill folders from
     https://github.com/remotion-dev/skills into the requested scope directory
     (user → `~/.zcode/skills/`, project → `.zcode/skills/`);
   - truly offline → use an already-installed/cached copy if one exists;
     otherwise report honestly that official skills cannot be installed now.
5. Verify: confirm every installed `remotion-*` folder contains a SKILL.md under
   the requested scope (`~/.zcode/skills/` or `~/.agents/skills/` for user,
   `.zcode/skills/` for project). Count them and list the names — the upstream
   baseline (count + skill names + versions) is recorded in the plugin repo's
   `compatibility/remotion.json` (`node scripts/skill-names.mjs` prints it);
   report anything that differs from it.
6. Report to the user: installed skills table, scope used, licensing note
   (skills are Copyright Remotion under the Remotion License, fetched from the
   official source — this plugin does not redistribute them), and that ZCode
   refreshes plugin capabilities automatically — if the `/remotion-*` commands
   are not in the `/` menu yet, toggle the plugin off/on or start a new
   conversation; the skills themselves are usable immediately by reading their
   SKILL.md files. If any check fails, run the /remotion-doctor flow and report
   findings instead of guessing.
