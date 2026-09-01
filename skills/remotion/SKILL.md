---
name: remotion
description: "Remotion video workflow for ZCode: scaffold projects, write React video components, preview in Remotion Studio, render MP4s. Use when the user wants to create/edit/preview/render a video or animation, mentions Remotion, or says 视频/动画/宣传片/字幕/渲染/出片. 自动引导安装 Remotion 官方 Agent Skills 并驱动建项目、预览、渲染全流程。"
license: MIT
metadata:
  author: ZCode Remotion Plugin Contributors
  version: "0.2.0"
---

# Remotion Workflow — ZCode Integration Layer

You are helping the user make videos with Remotion (React-based programmatic video).
Official Remotion skills carry the domain depth; this skill owns bootstrap,
environment, routing, and the no-rework render loop.

## 0. Scope

Use this skill for ANY Remotion/video/animation request. Do not use it for
non-video frontend work. If the user only asks about video editing of existing
files (cut/concat/extract audio), that is @remotion/media-utils / Mediabunny
territory — route to the official `remotion-multimedia` skill after bootstrap.

## 1. Bootstrap gate (always run first)

Check whether official skills are installed:

- Project scope: `<repo>/.zcode/skills/remotion-best-practices/SKILL.md`
- User scope: `~/.agents/skills/remotion-best-practices/SKILL.md`

If NEITHER exists, bootstrap now (never silently skip, never proceed without):

```bash
npx -y skills add remotion-dev/skills -s '*' -y --copy -g
```

- Default is user scope (`-g`: installs into `~/.agents/skills/` and mirrors to
  `~/.zcode/skills/`, so the skills work across all projects). Drop `-g` for
  project scope (same command without `-g`, installs into `.zcode/skills/`
  etc.) only when the user explicitly wants the skills pinned to one repo.
- `--copy` is required on Windows (default symlink needs elevated privileges).
- A cosmetic warning "PromptScript does not support global skill installation"
  is expected with `-g` and harmless.
- Inside an existing Remotion project, the official CLI can do the same:
  `npx remotion skills add` / `npx remotion skills update` (first-party
  wrappers around the official installer).
- Tell the user the skills were installed by the official Remotion installer and
  are licensed by Remotion (see NOTICE in the plugin repo).
- If the user is offline or `npx` fails, fall back: download the official skill
  folders from https://github.com/remotion-dev/skills into `.zcode/skills/` —
  user-side fetch from the official repo, never vendored by this plugin.

**Verify (mandatory, after the installer OR the manual fallback):** confirm on
disk that the file actually exists — `.zcode/skills/remotion-best-practices/SKILL.md`
(project scope) or `~/.agents/skills/remotion-best-practices/SKILL.md` (user
scope) — before proceeding. Do not rely on the installer's exit code or console
output alone; check the filesystem.

> **Never report that skills/components were installed without verifying the files
> exist on disk.** If the installer produced nothing, say so and use the manual
> download fallback (fetch the official skill folders from
> https://github.com/remotion-dev/skills into the scope directory); if that also
> fails, report failure honestly and continue using your own knowledge while
> telling the user the official skills are missing.

After bootstrap, the official skills appear as `remotion-*` skills/commands in a
NEW session. Within the current session, read the installed SKILL.md files
directly when you need their guidance.

## 2. Environment pre-flight (before create/render)

1. Node: run `node -v`. Require ≥18 (LTS 20/22 recommended). If missing or old,
   point the user to https://nodejs.org before continuing.
2. Package manager: detect lockfile in this order — `bun.lock/bun.lockb` → bun,
   `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, else npm. Use matching commands
   (`bunx`/`pnpm exec`/`yarn`/`npx`).
3. New project? Use `npm create video@latest` (or `bun create video`) in the
   target directory; it scaffolds a Remotion template and offers to install the
   official skills.
4. Windows notes: use forward slashes in Bash; prefer `--copy` installs; if a
   render complains about Chrome, see triage below.

## 3. Routing table (after bootstrap)

| User intent | Official skill | Notes |
|---|---|---|
| New video project / composition | `remotion-create` | templates, folder layout |
| Writing/modifying video components | `remotion-markup` | animation, layout, typography, audio, fonts |
| Live preview | `remotion-studio` | `npx remotion studio` |
| Export MP4/still | `remotion-render` | see §4 loop first |
| Map animations | `remotion-maps` | paths, markers, Mapbox/Cesium |
| Captions/subtitles | `remotion-captions` | transcribe, display, animate |
| App/product integration | `remotion-saas` | rendering infra, licensing tiers |
| Studio interactivity | `remotion-interactivity` | editable/selectable in Studio |
| Look up an API/prop | `remotion-docs` | search + fetch remotion.dev docs |
| Upgrade Remotion deps | `remotion-upgrade` | official-first flow, also see /remotion-update |
| Audio/video metadata, conversion | `remotion-multimedia` | Mediabunny-based |
| Unsure | `remotion-best-practices` | the official router |

Routing is prefix-tolerant: if an official skill name changed upstream, match on
the `remotion-` prefix and consult `.zcode/skills/` listing or
https://www.remotion.dev/docs/ai/skills.

## 4. No-rework render loop (mandatory for render requests)

1. **Still-frame gate**: render one frame first — `npx remotion still <comp> out/frame.png --frame=<representative-frame>` — then display it to the user (image Read) and get visual confirmation. Iterate markup here, NOT after full render.
2. **Full render**: only after the user approves the still. For renders expected
   >1 min, run in background and report progress.
3. **Output verification**: confirm the MP4 exists, and check duration/dimensions match the composition (`ffprobe` if available, else trust render logs). Report absolute path to the user.

## 5. Failure triage

| Symptom | Likely cause | Action |
|---|---|---|
| `npx skills add` fails | Node missing/old, network | Check `node -v`; retry; offline fallback in §1 |
| Chrome/Chromium download failure | Network or proxy blocks storage.googleapis.com | Retry; see https://www.remotion.dev/docs/chrome-headless-shell; /remotion-doctor |
| `Error: Could not find composition with ID <id>. Available compositions: ...` | Root not registering composition | Check `registerRoot` and `<Composition id=...>` match the CLI arg |
| `delayRender() ... timed out` | Unresolved handle | Ensure every `delayRender` has `continueRender`; avoid unawaited promises in `calculateMetadata` |
| `Module not found` | Deps not installed | Run detected package manager install; verify lockfile |
| License banner in render output | Company-size entity | Free tier covers individuals/≤3-employee companies; else https://www.remotion.pro — inform user, don't work around |
| Anything else | — | /remotion-doctor, then official `remotion-docs` skill |

## 6. Platform quick notes

- Windows: all commands here run in Git Bash/PowerShell; quote paths containing
  spaces; `--copy` installs (§1).
- macOS/Linux: defaults work; no `--copy` needed but harmless.
- Long renders: always background + progress; never block the session silently.
