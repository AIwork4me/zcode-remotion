# Changelog

## 0.1.0 — 2026-08-31

- Initial release.
- `remotion` router skill: bootstrap gate, environment pre-flight, routing table,
  still-frame render loop, failure triage.
- Commands: `/remotion-setup`, `/remotion-doctor`, `/remotion-update`.
- Verifier (`scripts/verify-plugin.mjs`) + CI (verify, link check, weekly drift check).
- Skills bootstrap defaults to user scope (`-g`, spec §4.2); project scope is
  the opt-in (`/remotion-setup --project`).
- Demo video (23s, 1080p) + animated README preview — made end-to-end by the
  plugin itself via the still-frame-gated workflow. Source in `demo/`,
  assets in `docs/assets/`.
- Bilingual README (EN + 简体中文), SECURITY.md, badges, troubleshooting table.
- Verifier: frontmatter parser handles CRLF checkouts (Windows autocrlf) with
  regression test; `.gitattributes` normalizes line endings.
