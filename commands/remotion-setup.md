---
description: Install the 12 official Remotion Agent Skills into ZCode and verify discovery
argument-hint: "[--global]"
---

Install the official Remotion Agent Skills via the official installer, then verify
ZCode can discover them. Idempotent — safe to re-run.

1. Pre-flight: run `node -v`. If Node is missing or <18, stop and tell the user
   to install Node ≥18 from https://nodejs.org first.
2. Scope decision:
   - `$ARGUMENTS` contains `--global` → user scope.
   - Else if the current directory is inside a git repo / project → project scope.
   - Else default to `--global` (nothing to pin skills to).
3. Install (spike-verified):

   ```bash
   npx -y skills add remotion-dev/skills -s '*' -y --copy    # project scope
   npx -y skills add remotion-dev/skills -s '*' -y --copy -g # user scope
   ```

   `--copy` is mandatory on Windows. The warning
   "PromptScript does not support global skill installation" is expected and harmless.
4. Verify: confirm 12 `remotion-*` folders each containing SKILL.md under
   `.zcode/skills/` (project) or `~/.agents/skills/` (user). List them.
5. Report to the user: installed skills table, scope used, licensing note
   (skills are Copyright Remotion under the Remotion License, fetched from the
   official source — this plugin does not redistribute them), and that a NEW
   ZCode session will list them in the `/` menu. If any check fails, run the
   /remotion-doctor flow and report findings instead of guessing.
