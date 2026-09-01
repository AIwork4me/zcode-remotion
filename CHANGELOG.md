# Changelog

## 0.2.0 — 2026-09-01

- **Upstream compatibility governance**: new machine-readable baseline
  (`compatibility/remotion.json`) — verified Remotion/skills versions, skill
  names/count, Mediabunny pairing. Validated by the verifier and unit tests.
- **Daily compatibility workflow** replaces the weekly drift alarm: classifies
  upstream drift (low / high / unknown), validates for real (tests + clean-state
  official-skills bootstrap + still render) and opens ONE deterministic PR per
  version for low-risk drift; high-risk drift (major bump, skill added/removed/
  renamed) opens a maintainer-review issue. Never auto-merges.
- **`/remotion-update` is official-first** (P0 fix): uses `npx remotion upgrade`
  + `npx remotion versions` when `@remotion/cli` is present, otherwise follows
  the official manual upgrade path (same exact version for every
  `remotion`/`@remotion/*` package, Mediabunny pairing from the official
  compat page, lockfile via the detected package manager); skills refresh via
  the official `npx skills update <names>` mechanism. Verified end-to-end on a
  real project.
- **`/remotion-doctor` uses machine-readable sources** (P0 fix): latest stable
  from `npm view remotion version`, in-project truth from `npx remotion
  versions`; reports installed vs latest, skills version/count, consistency;
  ends with X/8 checks + one fix command. Validated in a healthy project, a
  non-project directory and a deliberately outdated project.
- **CI matches the platform claim**: static matrix ubuntu/macos/windows ×
  Node 18/24 (+20/22 on Linux); online link check as its own job; a real
  compat-smoke job (clean bootstrap + render) on main.
- **Verifier**: accurate policy wording ("forbidden by zcode-remotion project
  policy" — the ZCode spec does allow these fields), compatibility-manifest
  validation, routing-coverage check, and version sync across plugin.json,
  marketplace.json, SKILL.md, CHANGELOG and both READMEs.
- **Positioning**: README rewritten around the reliability layer ("One prompt
  from idea to MP4" + why-not-official-skills comparison), current ZCode
  install navigation (Settings → Plugins), accurate auto-refresh wording,
  Showcase section for community videos. Bilingual throughout.
- **marketplace.json** aligned with current ZCode discovery conventions
  (`category` + `tags`; keywords stay in plugin.json).
- Baseline updated and re-verified for real against Remotion **4.0.519** /
  official skills **4.0.519** (12 skills): clean-state bootstrap, still frame
  and minimal MP4 all rendered and verified.

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
