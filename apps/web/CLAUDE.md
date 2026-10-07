<!-- OPENSPEC:START -->
# OpenSpec Instructions
Always respond in Chinese.
These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm run dev      # Start development server
pnpm run build    # Build for production (runs tsc then vite build)
pnpm run lint     # Run ESLint
pnpm run preview  # Preview production build locally
```

## 响应式设计（强制）

任何 Web 端 UI 改动都必须同时完成移动端适配，规范见 [.trae/rules/responsive-design.md](.trae/rules/responsive-design.md)（含断点口径、组件三档行为映射、反模式清单）。

- **断点**：只允许 `768 / 1024 / 1440px`（与 `playwright.config.ts` 的 1440 / 834 / 390 三档视口对齐）。`1180 / 1200px` 是已登记的历史遗留，禁止扩散到其它文件。
- **验证**：

  ```bash
  pnpm run check:responsive              # 静态守卫：断点 / px 字号 / 固定宽度 / 内联尺寸
  pnpm run test:e2e -- blog-responsive   # 三档视口契约（1440 / 834 / 390）
  ```

- `check:responsive` 已接入 `pnpm run check`，违反规则会直接失败。
- 新增组件或页面时，在规范文档的「组件响应式行为映射」表补一行；若引入新的布局结构（多栏 / 浮层 / 抽屉），在 `tests/e2e/blog-responsive.spec.ts` 的 `响应式契约` 中补对应断言。

## Architecture

This is a personal blog built with React 19 + Vite 8 + TypeScript. Key architectural decisions:

### Routing
- Uses `vite-plugin-pages` for file-based routing in `src/pages/`
- Hash router (`createHashRouter`) for GitHub Pages compatibility (no server-side URL rewriting)
- Route files: `index.tsx` (redirects to `/Home`), `Home/index.tsx`, `[...all].tsx` (404 catch-all)
- `App.tsx` is a layout wrapper with `<Outlet />`

### UI Framework
- Radix UI Themes for component library (dark theme, teal accent, slate gray)
- Custom CSS files alongside components (e.g., `Navbar.css`, `home.css`)
- Global loading screen defined in `index.html` (removed by `AppBootstrap.tsx` once the critical font is ready)

### Asset Handling
- Static assets in `public/` directory (favicon, images, video)
- `src/utils/baseUrl.ts` provides `resolvePublicAsset()` for proper path resolution
- Base URL auto-detected from `GITHUB_REPOSITORY` env var for GitHub Pages deployment

### Pages Structure
Each page is a folder with `index.tsx` and optional CSS:
```
src/pages/
├── index.tsx          # Redirect to /Home
├── [...all].tsx       # 404 fallback
└── Home/
    ├── index.tsx
    └── home.css
```

To add a new page: create `src/pages/NewPage/index.tsx` and export a default component.

## Project Overview

个人博客，类二次元游戏官网风格。采用高质量图片+视频的二次元美术风格，以初音未来为主题配色（主色 #39C5BB）。

### 主要特性

- **渐进式背景加载**：首页采用图片优先、视频就绪后平滑切换的策略，支持弱网降级
- **全局 Loading 动画**："少女吃葱中"风格，使用自定义字体 SmileySans（via JSDMirror，jsDelivr 国内镜像）
- **玻璃拟态导航栏**：基于 Radix UI Themes，半透明背景配合毛玻璃效果
- **打字机文字动画**：响应式自动换行，支持 `prefers-reduced-motion` 降级
- **无障碍支持**：键盘导航、屏幕阅读器友好

### 组件清单

| 组件 | 路径 | 说明 |
|------|------|------|
| Navbar | `src/components/Navbar/` | 顶部毛玻璃导航栏 |
| EasterEggHint | `src/components/EasterEggHint/` | 彩蛋提示组件（初音绿色号冷知识） |
| AppBootstrap | `src/AppBootstrap.tsx` | 应用启动引导，负责移除全局 Loading |

### 开发记录

详细的研究记录和开发决策位于 `.tasks/` 文件夹：

- `vite-pages-router-research.md` - 路由基础设施与首页背景实现
- `loading-animation-research.md` - 全局 Loading 动画方案
- `radix-glass-theme-research.md` - Radix UI Themes 接入与组件重构