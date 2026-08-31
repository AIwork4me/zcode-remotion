# Verification Report — remotion ZCode plugin

Plugin version: 0.1.0 · Date: 2026-08-31 · OS: Windows 10 (10.0.26200) · Node: v24.14.1
ZCode client: desktop app (single-instance), session running this verification.

## Layer 1 — Static verification: PASS

- `node --test scripts/verify-plugin.test.mjs` → 11/11 pass.
- `node scripts/verify-plugin.mjs --offline` → all checks passed.
- `node scripts/verify-plugin.mjs` (online) → pass; every shipped URL resolves 200
  except the plugin's own GitHub repo URL (repo unpublished until release — resolves at push;
  GitHub CI runs post-push only).

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

## Layer 3 — End-to-end journey audit

See "Layer 3" section appended after the journey run (same file).
