# Changelog

## 0.1.0 — 2026-08-31

- Initial release.
- `remotion` router skill: bootstrap gate, environment pre-flight, routing table,
  still-frame render loop, failure triage.
- Commands: `/remotion-setup`, `/remotion-doctor`, `/remotion-update`.
- Verifier (`scripts/verify-plugin.mjs`) + CI (verify, link check, weekly drift check).
- Skills bootstrap defaults to user scope (`-g`, spec §4.2); project scope is
  the opt-in (`/remotion-setup --project`).
