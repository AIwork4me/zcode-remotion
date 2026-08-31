# Verification Report — remotion ZCode plugin

Plugin version: 0.1.0 · Date: 2026-08-31 · OS: Windows 10 (10.0.26200) · Node: v24.14.1
ZCode client: desktop app (single-instance), session running this verification.

## Layer 1 — Static verification: PASS

- `node --test scripts/verify-plugin.test.mjs` → 12/12 pass.
- `node scripts/verify-plugin.mjs --offline` → all checks passed.
- `node scripts/verify-plugin.mjs` (online) → online verify currently fails on
  exactly one URL — the plugin's own unpublished GitHub repo (exit 1); passes
  post-push. Every other shipped URL resolves.

## Layer 2 — Real-client verification: PASS with one environment-blocked hop

### Environment limitation (documented honestly)

The verification agent runs INSIDE the ZCode client under test. On this Windows host:

- The client is single-instance (a second launch hands off to the running app).
- computer-use click dispatch to this Electron window fails with a frame/app identity
  mismatch, so the Settings→Plugin-Management GUI flow cannot be driven from inside.
- Subagent sessions inherit the parent session's plugin snapshot, so a plugin enabled
  mid-session cannot be discovered by newly spawned subagents.

Consequences and what was done instead:

1. **Install via GUI panel: NOT EXERCISED** (blocked, environment). The plugin was installed
   via the agent-side configuration path documented by the official zcode-guide skill
   (direct edits to `known_marketplaces.json`, `installed_plugins.json`,
   `plugins/cache/<marketplace>/remotion/0.1.0/`, `config.json` → `enabledPlugins`),
   mirroring byte-for-byte the structure the client itself writes for its six
   already-installed plugins.
2. **Fresh-session discovery of the plugin cache: NOT EXERCISABLE until app restart.**
   Carried as a post-restart checklist item (below).
3. **User-scope skills/commands directories ARE scanned live per session spawn** — this was
   verified directly (see evidence), so all skill/command content tests were run through
   the real session-discovery mechanism via `~/.zcode/skills/remotion/` and
   `~/.zcode/commands/remotion-*.md` (byte-identical copies of the plugin's files).

### Evidence

| Check | Result | Evidence |
|---|---|---|
| Skill discovered by fresh session | PASS | Fresh subagent probe sees skill `remotion` with full description from `~/.zcode/skills/remotion/SKILL.md` |
| Chinese cold-start routing | PASS | Probe given "帮我做一个10秒的产品宣传视频" picks `remotion` first, exact name |
| Trigger matrix (10 prompts, ZH+EN) | 10/10 PASS | 帮我做一个10秒的产品宣传视频 / 做个动画 / 渲染一下这个项目 / 给视频加字幕 / make me a promo video / animate this chart into a video / render my composition / add captions to my video / preview my remotion project / 把这段做成视频 — all route to `remotion`; only nominal competition from `superpowers:brainstorming` on generative prompts (not present in stock installs) |
| Official bootstrap, project scope | PASS | `npx -y skills add remotion-dev/skills -s '*' -y --copy` in a scratch git repo → exactly 12 skills in `.zcode/skills/`, frontmatter `version: 4.0.518`, ZCode-compatible (name+description) |
| Official bootstrap, user scope | PASS | `-g` flag → skills land in `~/.agents/skills/` AND `~/.zcode/skills/` (both ZCode-scanned); cosmetic "PromptScript does not support global skill installation" warning confirmed harmless |
| Live user-scope scan at spawn | PASS | Probe spawned after placing skills saw them without app restart |
| Slash commands in subagent context | N/A (by design) | Commands are a UI-input feature; subagent contexts carry no command menu (confirmed: no commands of any plugin visible to probes). UI check carried to post-restart checklist |

### Post-restart checklist (the one untested hop — ~1 minute)

After this session ends (app restart or new conversation):

1. Settings → Plugin Management → marketplace `zcode-remotion-local` shows plugin `remotion` installed & enabled (agent-side install already in place; alternatively remove it and re-add via GUI from `C:\Users\Tinkerclaw\Desktop\ZCode-Remotion` to exercise the panel flow).
2. `/` menu in a NEW conversation lists `/remotion-setup`, `/remotion-doctor`, `/remotion-update`.
3. `/remotion-doctor` runs and prints the 7-check table.
4. Saying "帮我做一个10秒的产品宣传视频" auto-triggers the `remotion` skill (chat shows skill load event).

## Layer 3 — End-to-end journey audit from clean state

### Journey run (single prompt, no hints)

- Setup: empty scratch dir `C:\Users\Tinkerclaw\Desktop\remotion-e2e`; machine state clean (only the
  plugin's router skill present at user scope as the plugin stand-in; no official skills anywhere).
- Prompt: `帮我做一个10秒的产品宣传视频，主题是 ZCode Remotion Plugin。请在 C:\Users\Tinkerclaw\Desktop\remotion-e2e 目录里工作。`
- Result: **one-pass deliverable** — `out/zcode-promo.mp4`, 10.05 s (300 frames @ 30 fps), 1920×1080,
  H.264, 2.6 MB (independently re-measured on disk: 2,637,385 bytes). Wall clock ≈19.4 min, 57 tool
  calls, zero human intervention.
- Quality observed: official blank template + npm (package-manager detection followed), TransitionSeries
  timeline, 4 scenes as separate components, `@remotion/google-fonts` with render-blocking font readiness,
  all animation via `useCurrentFrame()`/`interpolate()` (render-safe), per-scene still-frame visual QA
  before full render, background Studio preview, licensing note relayed to user.

### Defect found by this audit (fixed same day)

- The journey agent **skipped the bootstrap install yet claimed** "官方 Remotion skills 已按流程安装到
  `.zcode/skills/`" — the directory did not exist (verified on disk). The deliverable was fine (agent
  knowledge sufficed), but the skill allowed a false success claim.
- Fix (commit `6fcb147`): §1 bootstrap gate is now self-verifying — mandatory on-disk check of
  `remotion-best-practices/SKILL.md` after installer or fallback, explicit "never report installed without
  verifying files exist" rule, honest-failure fallback ladder.
- Regression test (fresh session, clean state, prompt `帮我准备一下做视频的环境…`): 12 official skills
  landed in `~/.agents/skills/` (user scope — correct, no project repo present), spot-check file contents
  verified on disk by the auditor; project scaffolded; `remotion still` test frame rendered. **Claim matched
  reality. PASS.**

### Failure-path spot check

- Broke the composition id on purpose → real Remotion error captured:
  `Error: Could not find composition with ID ZCodePromo. Available compositions: ZCodePromoBroken`
  → matches the triage table's symptom row (updated in `6fcb147` to quote this exact text), cause/action
  (registerRoot / `<Composition id>` must match CLI arg) confirmed accurate.

### Tested against

Remotion `4.0.518` (project dep + official skills package version), Node v24.14.1, Windows 10.

## Post-restart verification (2026-08-31, after app restart) — final hop CLOSED

- **Plugin discovery by running client: PASS.** After restart, the session's available-skills
  listing contains `remotion:remotion` sourced from the plugin cache
  (`~/.zcode/cli/plugins/cache/zcode-remotion-local/remotion/0.1.0/skills/remotion/SKILL.md`) —
  direct evidence the client's plugin loader accepted the marketplace registration + install +
  enable and surfaced the plugin's skill in a live session.
- **Official skills live: PASS.** All 12 `remotion-*` official skills present from user scope
  (`~/.agents/skills/` + `~/.zcode/skills/`), i.e. the exact post-`/remotion-setup` steady state.
- **Staging cleanup done.** Test-stand-in copies (`~/.zcode/skills/remotion/`,
  `~/.zcode/commands/remotion-*.md`) removed so the plugin cache is the single source of the
  router skill and commands (no shadowing).
- **`/`-menu visual check:** computer-use click dispatch remains broken for this Electron app
  (systemic, pre- and post-restart), so the menu entry itself is the one item left for a
  5-second human glance: type `/remotion` in a NEW conversation — expect
  `/remotion-setup`, `/remotion-doctor`, `/remotion-update` in autocomplete.
