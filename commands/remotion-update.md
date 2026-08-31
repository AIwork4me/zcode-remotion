---
description: Refresh the official Remotion skills and upgrade Remotion deps in the current project
---

Two independent steps — run both, report both, continue past failures.

A. Refresh official skills (spike-verified):

   ```bash
   npx -y skills update -y   # updates installed skills to latest
   ```

   If inside a project → add `-p`; for user-scope only → `-g`. Verify afterwards
   that `remotion-*` folders still contain SKILL.md and report the count (expect 12).

B. Upgrade project deps, ONLY if package.json contains `remotion`:

   ```bash
   npm i remotion @remotion/cli@latest --save-exact   # or matching package manager
   ```

   Then follow the official `remotion-upgrade` skill guidance for related
   packages (`@remotion/*`, `@remotion/media-utils`, Mediabunny compat) and check
   the changelog at https://www.remotion.dev/docs/upgrade for breaking changes.

Report: skills refreshed (Y/N + count), deps upgraded (from → to versions), any
breaking-change callouts the user must review.
