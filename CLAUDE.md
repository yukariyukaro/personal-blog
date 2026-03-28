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
- Global loading screen defined in `index.html` (removed by `AppBootstrap.tsx` after React mounts)

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
- **全局 Loading 动画**："少女吃葱中"风格，使用自定义字体 SmileySans（via jsDelivr CDN）
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