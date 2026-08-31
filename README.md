# Remotion for ZCode

Create React-based videos inside ZCode: scaffold a project, write components,
preview in Remotion Studio, render MP4s — one prompt at a time.

This plugin bootstraps Remotion's **12 official Agent Skills** through the
official installer, then adds a ZCode-native integration layer: environment
pre-flight, bilingual (EN/中文) auto-triggering, a still-frame-before-render
verification loop, and failure triage.

## Install

1. ZCode → Settings → Plugin Management → add this repo as a plugin marketplace.
2. Install and enable the **remotion** plugin.
3. Just ask: `帮我做一个 10 秒的产品宣传视频` — or run `/remotion-setup` first.

## What you get

| Piece | What it does |
|---|---|
| `remotion` skill | Auto-triggers on video requests; bootstraps official skills, pre-flights the environment, routes to the right official skill |
| `/remotion-setup` | Installs the 12 official skills (project or user scope) + verifies discovery |
| `/remotion-doctor` | Environment health check: Node, package manager, Chrome Headless Shell, versions |
| `/remotion-update` | Refreshes official skills + upgrades Remotion deps |

The 12 official skills (installed by `npx skills add remotion-dev/skills`, they
appear as `remotion-*` in a new session): best-practices, create, markup, studio,
render, maps, captions, saas, interactivity, docs, upgrade, multimedia.

## How it stays fresh

Official skills are fetched from Remotion's official channel by your machine —
re-run `/remotion-update` anytime to pull the latest. This plugin never vendors
upstream content, so nothing here can go stale.

## Licensing

- Plugin code/content: MIT.
- Official Remotion skills: Copyright Remotion, Remotion License — free for
  individuals and companies ≤3 employees; larger companies need a license
  (https://www.remotion.pro). See NOTICE.md.

Tested against: Remotion Skills `4.0.518` (see docs/verification-report.md).
