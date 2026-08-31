# Remotion for ZCode

[![CI](https://github.com/AIwork4me/zcode-remotion/actions/workflows/ci.yml/badge.svg)](https://github.com/AIwork4me/zcode-remotion/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-8b5cf6.svg)](CHANGELOG.md)
[![ZCode Plugin](https://img.shields.io/badge/ZCode-Plugin-22d3ee.svg)](https://zcode.z.ai/cn/docs/plugin)

**One prompt from idea to MP4.** [ZCode](https://zcode.z.ai) is an AI coding agent; [Remotion](https://www.remotion.dev) makes videos with React. This plugin connects them: you describe the video, the agent builds it.

**English** · [简体中文](README.zh-CN.md)

![Demo preview — code becomes picture, one sentence becomes a film](docs/assets/preview.gif)

Watch the full 23s demo: [docs/assets/demo.mp4](docs/assets/demo.mp4) · project source: [demo/](demo/)

> **Yes — this demo was made by the plugin itself.** One prompt, no manual edits.
> The video shows its own birth: a single prompt travels through code → timeline →
> render → finished film (「一句话，一部片」).

## See it happen

```text
You:    帮我做一个10秒的产品宣传视频，主题是 ZCode Remotion Plugin
Agent:  ✅ loads the remotion skill → bootstraps 12 official Remotion skills
        ✅ scaffolds the project (package manager auto-detected)
        ✅ writes the scenes → shows you a still frame for approval
        ✅ renders → verifies the MP4 → hands you the path
You:    （23 minutes later, zero intervention）🎉
```

## Install

1. In ZCode: **Settings → Plugin Management → Add marketplace**, paste this repo:
   `https://github.com/AIwork4me/zcode-remotion`
2. Install and enable the **remotion** plugin.
3. Just ask — `帮我做一个 10 秒的产品宣传视频` — or run `/remotion-setup` first.

Requires Node ≥ 18 ([get it here](https://nodejs.org)). Works on Windows / macOS / Linux.

## What you get

| Piece | What it does |
|---|---|
| `remotion` skill | Auto-triggers on video requests (Chinese or English); bootstraps official skills, pre-flights the environment, routes to the right official skill |
| `/remotion-setup` | Installs the 12 official skills (user scope by default; `--project` to pin to one repo) + verifies discovery |
| `/remotion-doctor` | Environment health check: Node, package manager, Chrome Headless Shell, versions |
| `/remotion-update` | Refreshes official skills + upgrades Remotion deps |

## How it works

```text
 you ask for a video ──▶ remotion skill (this plugin's integration layer)
                          │  1. bootstrap gate ──▶ npx skills add remotion-dev/skills
                          │  2. environment pre-flight (node / package manager / platform)
                          │  3. route to the right official skill ──┐
                          ▼                                       ▼
                still-frame gate (approve the look)    Remotion's 12 official skills
                          │                            create · markup · studio · render
                          ▼                                       │
                full render ──▶ output verified ──────────────────┘
```

The plugin **never vendors Remotion's content** — official skills are fetched by your
machine through Remotion's official installer, so you always get the latest and the
license stays between you and Remotion (free for individuals and companies ≤3 employees,
see [NOTICE.md](NOTICE.md)).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `npx skills add` fails | Check `node -v` ≥ 18, retry; offline fallback in the skill |
| Chrome/Chromium download failure | Network/proxy blocking — see [chrome-headless-shell docs](https://www.remotion.dev/docs/chrome-headless-shell) |
| `Could not find composition with ID …` | The `<Composition id>` must match the CLI argument |
| `delayRender() … timed out` | Every `delayRender` needs a `continueRender` |
| `Module not found` | Run your package manager's install; check the lockfile |
| Anything else | `/remotion-doctor`, then the official `remotion-docs` skill |

Full 3-layer verification evidence (static + real-client + one-pass end-to-end journey):
[docs/verification-report.md](docs/verification-report.md)

## Licensing

- Plugin code/content: [MIT](LICENSE)
- Official Remotion skills: Copyright Remotion, Remotion License — free for individuals
  and companies ≤3 employees; larger companies need a license ([remotion.pro](https://www.remotion.pro))

Tested against: Remotion Skills `4.0.518` (see [docs/verification-report.md](docs/verification-report.md)).

## Contributing

PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). The gate is one command:
`node scripts/verify-plugin.mjs --offline && node --test scripts/verify-plugin.test.mjs`.

If this plugin saved you an afternoon of video editing, a ⭐ helps others find it.
