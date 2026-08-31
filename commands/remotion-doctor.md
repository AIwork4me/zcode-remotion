---
description: Diagnose the Remotion + ZCode environment (Node, package manager, Chrome, versions)
---

Run each check, collect results, then print ONE pass/fail table with fixes. Do not
attempt fixes before reporting.

1. Node: `node -v` — pass if ≥18. Fix: install from https://nodejs.org.
2. npx: `npx -v` — pass if prints a version.
3. Package manager: detect lockfile (bun.lock/bun.lockb, pnpm-lock.yaml,
   yarn.lock, package-lock.json). Report which one ZCode should use here.
4. Official skills installed? Check `.zcode/skills/remotion-best-practices/` and
   `~/.agents/skills/remotion-best-practices/`. Fail fix: /remotion-setup.
5. If inside a Remotion project (package.json with `remotion` dependency):
   `npm ls remotion --depth=0` (or matching pm) and report the version; compare
   with latest at https://www.remotion.dev/docs/upgrade. Fail fix: /remotion-update.
6. Chrome Headless Shell: run `npx remotion browser ensure` in the project (if
   no project, skip with a note). Fail fix: check network/proxy, see
   https://www.remotion.dev/docs/chrome-headers.
7. License awareness: print a one-line note that Remotion is free for
   individuals and companies ≤3 employees, otherwise a company license is
   required (https://www.remotion.pro). No technical check — informational.

End with: summary count (X/7 pass), the single most important next action, and
suggest the official `remotion-docs` skill for anything Remotion-API-specific.
