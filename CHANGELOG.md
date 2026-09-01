# Changelog

## 0.2.3 — 2026-09-01

Consistency patch — implementation, commands, docs, CI policy and the product
promise now agree. No new product surface.

- **Skill integrity no longer depends on a sentinel**: discovery treats a
  directory as containing an installation when ANY expected skill
  (`compatibility/remotion.json` → `skills.names`) is present — a router-only
  install is INCOMPLETE, and an install missing the router is INCOMPLETE (not
  "absent"). Missing skills are named and repaired in place.
- **Explicit scope modes**: `inspectSkillInstall` gains
  `mode: auto | project | global`; `--global` inspects only user scope,
  `--project` only project scope, auto preserves priority (a partial project
  install is reported for project repair, never silently replaced by a
  complete user install). The two user paths are one logical global scope:
  complete-in-either wins, otherwise the most-complete is reported — contents
  are never unioned. CLI exit codes: 0 complete · 1 incomplete · 2 absent ·
  64 usage error.
- **`/remotion-setup` contradiction removed**: "router exists → done" vs
  "router alone is NOT complete" is gone — the command now verifies the
  requested scope explicitly (`--global` by default, `--project .` for project
  installs) and only a COMPLETE report counts as success.
- **Autonomous Agent visual QA**: the still-frame gate is now
  agent-inspected (objective checks: blanks, clipping, overlap, contrast,
  layout, artifacts) and proceeds automatically on PASS — keeping
  "one prompt from idea to MP4" truthful. Humans are asked only for
  explicit-approval requests or subjective/ambiguous/low-confidence choices.
  Output verification prefers `ffprobe` and states exactly what was and was
  not independently verified. README + 简体中文 updated to match; a verifier
  rule now rejects stale human-approval-gate wording.
- **ZCode refresh guidance re-verified against current docs** (2026-09-01):
  current ZCode documents no manual skill-refresh button — skills are visible
  under Settings → Skills, plugin components register automatically, and a new
  conversation is the fallback for externally installed skills.
- **Main-branch merge freshness**: the `main-protection` ruleset now requires
  branches to be up to date before merging (strict status checks), keeping
  `required-ci` as the single required check.
- Merged `actions/github-script` v7 → v9 (Dependabot #1) after reviewing the
  scripts for the documented breaking changes; the real `required-ci` gate ran
  on the PR.

## 0.2.2 — 2026-09-01

Reliability patch — no new features.

- **Cross-platform upgrade recovery**: the Windows current-CLI recovery in
  /remotion-update no longer uses Bash `$(...)` (broken in PowerShell/cmd) —
  `npx --yes --package=@remotion/cli@latest -- remotion upgrade`, verified on
  Windows against an outdated 4.0.513 project; the verifier now rejects
  shell-specific substitution in user-facing update commands.
- **Installation integrity, not just presence**: skill discovery checks the
  FULL recorded list (`compatibility/remotion.json` → `skills.names`) in the
  detected scope and classifies complete / incomplete / missing — reporting
  e.g. `Official Remotion skills: 10/12 present` with the missing names,
  surfacing extra `remotion-*` folders, and pinning repair to the detected
  scope. `node scripts/skill-paths.mjs` prints the report. Fixed a real-world
  bug: symlinked skill mirrors were miscounted as 0/12.
- **True SemVer comparison**: `compareSemver` (numeric, prerelease-aware)
  replaces string equality/ordering — `versionStatus` now returns
  outdated / current / **ahead** / unknown, and `0.9.0 < 0.10.0` compares
  correctly. Applied to doctor logic, drift classification and release-check.
- **Drift regression protection**: upstream falling BELOW the recorded
  baseline is classified high-risk with an explicit
  "UPSTREAM VERSION REGRESSION DETECTED … No automatic downgrade will be
  proposed"; the baseline auto-PR writer refuses downgrades.
- **Doctor: latest upstream ≠ last verified baseline** — a version newer than
  upstream is informational ("ahead"); newer than the plugin's verified
  baseline raises a check-evidence warning, never a false "incompatible".
- **ZCode refresh guidance corrected against current docs**: installed skills
  are visible under **Settings → Skills**; plugin components register
  automatically; new-conversation fallback retained (current ZCode documents
  no manual skill-refresh button).
- **PR compatibility gate hardened**: new `required-ci` aggregator job gives
  branch protection one stable required check that passes when the heavy
  smoke is legitimately skipped on docs-only PRs.
- Smoke-script cleanup is best-effort: a lingering esbuild daemon on Windows
  can no longer turn a finished PASS into a crash.
- Validated for real: 58 unit tests, real pull_request-event gate run, SemVer
  and skill-integrity fixtures (details in docs/verification-report.md).

## 0.2.1 — 2026-09-01

Stabilization release — correctness, single sources of truth, real validation
as a merge gate. No new features.

- **Canonical ZCode skill discovery**: official skills are detected in all
  valid locations — project `.zcode/skills/`, ZCode-native user
  `~/.zcode/skills/`, installer user `~/.agents/skills/`. Skills present only
  under `~/.zcode/skills` are no longer treated as missing (no wrongful
  reinstall). Path logic extracted and unit-tested (`scripts/skill-paths.mjs`).
- **Honest offline behavior**: the impossible "offline → download from GitHub"
  fallback is replaced by a real fallback ladder: installer fails → fetch
  directly from the official repo if the network is reachable → use a cached
  copy if truly offline → report honest failure otherwise. The requested scope
  is never silently switched.
- **Doctor separates Remotion and skills versions**: each artifact is compared
  against its OWN upstream source (`npm view remotion version` for the
  package; official remotion-dev/skills package metadata for skills). Skills
  are never flagged outdated just because the Remotion package moved; an
  unreadable source reports "unknown", never a false claim.
- **Single source of truth for the skill list**: `/remotion-update` now reads
  `skills.names` from `compatibility/remotion.json` (helper:
  `scripts/skill-names.mjs`); the verifier fails if the update command
  hard-codes a name list or drops the manifest reference, so a newly recorded
  upstream skill can't be silently omitted from updates.
- **PR merge gate**: the real compatibility smoke now runs on pull requests
  that touch behavior-relevant files (skills/commands/scripts/compatibility/
  manifests/workflows) — compatibility failures surface before merge, not on
  main. Docs-only changes skip the heavy render.
- **Mediabunny in the smoke**: the recorded Remotion + Mediabunny pairing is
  installed and consistency-checked in every compatibility smoke run.
- **Trustworthy upstream monitoring**: `drift-check` authenticates GitHub API
  calls with `GITHUB_TOKEN` when available; unreadable upstream now emits a
  workflow warning + step summary that state compatibility was NOT checked —
  visible, but no noisy issues.
- **Actions runtime**: `actions/checkout` and `actions/setup-node` upgraded
  to v7 (Node-20 runtime deprecation warnings gone); Dependabot keeps GitHub
  Actions current (monthly).
- **ZCode refresh guidance made docs-accurate and consistent**: ZCode
  auto-refreshes plugin capabilities; toggling the plugin or starting a new
  conversation is the fallback (current ZCode has no manual skill-refresh
  button).
- **Marketplace**: `strict: true` enabled (valid per the current ZCode
  marketplace spec); verifier validates the field shape.
- **Repo metadata**: GitHub description de-hardcoded ("12 skills" removed),
  topics corrected (`claude-plugin` → `zcode-plugin`/`agent-skills`).
- **Release hygiene**: `scripts/release-check.mjs` detects drift between
  plugin.json, CHANGELOG and (optionally, when `gh` is authenticated) the
  latest GitHub release tag; stale "unpublished repo" / internal-spec
  references removed from contributor docs.
- Real validation: update flow re-verified end-to-end on an outdated 4.0.513
  project; documented Windows finding — stale CLIs can fail
  `npx remotion upgrade` with `spawn npm ENOENT`; run the upgrade through a
  current CLI (`npx --yes --package=@remotion/cli@<target> -- remotion
  upgrade`) or use the manual fallback. Compat smoke (with Mediabunny) and
  MP4 render pass; 47 unit tests green.

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
