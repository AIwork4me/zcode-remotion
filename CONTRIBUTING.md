# Contributing

- Run `node --test scripts/verify-plugin.test.mjs` and
  `node scripts/verify-plugin.mjs --offline` locally before every commit; CI
  enforces both across Linux/macOS/Windows and Node 18/24 (plus 20/22 on
  Linux). The online `node scripts/verify-plugin.mjs` run is the
  post-push/CI gate — it fails pre-push on the repo's own unpublished GitHub
  URL, which is expected.
- `compatibility/remotion.json` is the canonical machine-readable upstream
  baseline. Update it only from a real verification run (see
  `scripts/compat-smoke.mjs` and docs/verification-report.md) — never by
  editing the version numbers by hand. The daily `upstream-compatibility`
  workflow proposes validated updates automatically; high-risk drift (major
  bump / skill topology change) always needs a human.
- Never vendor content from `remotion-dev/skills` or the Remotion repo into this
  plugin — Remotion License forbids redistribution. Reference upstream by URL or
  via the official installer instead.
- Prefer official Remotion mechanisms over reimplementing Remotion behavior
  (e.g. `npx remotion upgrade` over hand-rolled upgrades).
- Content is English; descriptions are bilingual (EN + 中文 trigger words).
- After changing user-facing behavior, update README + README.zh-CN.md +
  CHANGELOG in the same PR (the verifier checks version/baseline consistency).
- Verification reports live in docs/verification-report.md — rerun the journey
  audit (spec §6 layer 3) before releasing.
