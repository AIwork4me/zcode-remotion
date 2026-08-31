# Contributing

- `node --test scripts/` and `node scripts/verify-plugin.mjs` must pass locally
  before every commit; CI enforces both.
- Never vendor content from `remotion-dev/skills` or the Remotion repo into this
  plugin — Remotion License forbids redistribution. Reference upstream by URL or
  via the official installer instead.
- Content is English; descriptions are bilingual (EN + 中文 trigger words).
- After changing user-facing behavior, update README + CHANGELOG in the same PR.
- Verification reports live in docs/verification-report.md — rerun the journey
  audit (spec §6 layer 3) before releasing.
