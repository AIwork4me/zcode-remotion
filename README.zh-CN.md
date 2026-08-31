# Remotion for ZCode

[![CI](https://github.com/AIwork4me/zcode-remotion/actions/workflows/ci.yml/badge.svg)](https://github.com/AIwork4me/zcode-remotion/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-8b5cf6.svg)](CHANGELOG.md)
[![ZCode Plugin](https://img.shields.io/badge/ZCode-Plugin-22d3ee.svg)](https://zcode.z.ai/cn/docs/plugin)

**一句话，从想法到 MP4。** [ZCode](https://zcode.z.ai) 是 AI 编程智能体；[Remotion](https://www.remotion.dev) 用 React 写视频。这个插件把两者接通：你描述视频，智能体造视频。

[English](README.md) · **简体中文**

![Demo 预览 —— 代码即画面，一句话，一部片](docs/assets/preview.gif)

完整 23 秒 demo：[docs/assets/demo.mp4](docs/assets/demo.mp4) · 工程源码：[demo/](demo/)

> **没错——这条 demo 就是插件自己做的。** 一句提示词，零手工修改。
> 视频讲述它自己的诞生：一条提示词穿过 代码 → 时间线 → 渲染 → 成片。

## 看它发生

```text
你：    帮我做一个10秒的产品宣传视频，主题是 ZCode Remotion Plugin
智能体：✅ 加载 remotion skill → 引导安装 Remotion 官方 12 个技能
        ✅ 脚手架建项目（自动识别包管理器）
        ✅ 写分镜场景 → 先渲染静帧给你确认
        ✅ 全量渲染 → 校验 MP4 → 交付路径
你：    （23 分钟后，全程零干预）🎉
```

## 安装

1. ZCode → **设置 → 插件管理 → 添加插件市场**，粘贴本仓库地址：
   `https://github.com/AIwork4me/zcode-remotion`
2. 安装并启用 **remotion** 插件。
3. 直接开口——`帮我做一个 10 秒的产品宣传视频`，或先跑 `/remotion-setup`。

需要 Node ≥ 18（[点此安装](https://nodejs.org)），支持 Windows / macOS / Linux。

## 你会得到什么

| 组成 | 作用 |
|---|---|
| `remotion` 技能 | 视频请求自动触发（中英文皆可）；引导安装官方技能、环境预检、路由到正确的官方技能 |
| `/remotion-setup` | 安装 12 个官方技能（默认用户级；`--project` 可固定到单个仓库）+ 验证发现 |
| `/remotion-doctor` | 环境体检：Node、包管理器、Chrome Headless Shell、版本 |
| `/remotion-update` | 刷新官方技能 + 升级项目 Remotion 依赖 |

## 工作原理

```text
 你要一条视频 ──▶ remotion 技能（本插件的集成层）
                    │  1. 引导门槛 ──▶ npx skills add remotion-dev/skills
                    │  2. 环境预检（node / 包管理器 / 平台）
                    │  3. 路由到正确的官方技能 ──┐
                    ▼                          ▼
          静帧门禁（先确认画面）      Remotion 官方 12 技能
                    │                 create · markup · studio · render
                    ▼                          │
          全量渲染 ──▶ 产物校验 ────────────────┘
```

插件**从不内置 Remotion 的内容**——官方技能由你的机器通过 Remotion 官方安装器获取，
永远最新，许可关系保留在你与 Remotion 之间（个人及 ≤3 人公司免费，
详见 [NOTICE.md](NOTICE.md)）。

## 故障排查

| 症状 | 解法 |
|---|---|
| `npx skills add` 失败 | `node -v` ≥ 18，重试；离线回退方案见技能内说明 |
| Chrome/Chromium 下载失败 | 网络或代理拦截——见 [chrome-headless-shell 文档](https://www.remotion.dev/docs/chrome-headless-shell) |
| `Could not find composition with ID …` | `<Composition id>` 必须与命令行参数一致 |
| `delayRender() … timed out` | 每个 `delayRender` 都要有 `continueRender` |
| `Module not found` | 用对应包管理器装依赖；检查锁文件 |
| 其他 | `/remotion-doctor`，再问官方 `remotion-docs` 技能 |

完整三层核验证据（静态 + 真机 + 一次通过端到端旅程）：
[docs/verification-report.md](docs/verification-report.md)

## 许可

- 插件代码/内容：[MIT](LICENSE)
- Remotion 官方技能：Copyright Remotion，Remotion License——个人及 ≤3 人公司免费；
  更大规模公司需购买许可（[remotion.pro](https://www.remotion.pro)）

测试基线：Remotion Skills `4.0.518`（见 [docs/verification-report.md](docs/verification-report.md)）。

## 参与贡献

欢迎 PR——见 [CONTRIBUTING.md](CONTRIBUTING.md)。门禁一条命令：
`node scripts/verify-plugin.mjs --offline && node --test scripts/verify-plugin.test.mjs`。

如果这个插件帮你省下一下午的剪片时间，一颗 ⭐ 能让更多人看到它。
