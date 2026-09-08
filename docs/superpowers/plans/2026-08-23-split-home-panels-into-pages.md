# 首页 Panel 拆分实施计划

> **供智能体执行：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，按任务逐项实施并更新复选框。

**目标：** 将首页的介绍与作品 Panel 拆成独立页面，并让 Navbar 在 `/Home`、`/Information`、`/Portfolio` 三个路由之间跳转。

**架构：** 保留三个 Panel 现有组件和 CSS，通过共享 `PanelPageLayout` 复用全屏容器、当前 Panel 类名、滚动提示与侧边页码。Navbar 使用 React Router 的 `Link`，由 `App` 根据当前路由传入激活项，Home 只保留 HeroPanel 及其视频和打字动画状态。

**技术栈：** React 19、React Router 7、vite-plugin-pages、TypeScript、CSS

---

### 任务 1：抽取共享页面布局

**文件：**
- 创建：`apps/web/src/components/PanelPageLayout/index.tsx`
- 创建：`apps/web/src/components/PanelPageLayout/PanelPageLayout.css`
- 删除：`apps/web/src/pages/Home/home.css`

- [x] **步骤 1：创建共享页面布局**

实现接收 `currentIndex`、`children` 的 `PanelPageLayout`，输出原有的 `home-container`、`home-panels`、`ScrollIndicator` 和 `SideIndicator` 结构，并复用三项标题：

```tsx
const PANEL_TITLES = [
  { en: 'HOMEPAGE', zh: '首页' },
  { en: 'INFORMATION', zh: '介绍' },
  { en: 'PORTFOLIO', zh: '作品' },
]

function PanelPageLayout({ currentIndex, children }: PanelPageLayoutProps) {
  return (
    <main className="home-container">
      <ScrollIndicator visible={currentIndex < PANEL_TITLES.length - 1} />
      <div className="home-panels">{children}</div>
      <SideIndicator currentIndex={currentIndex} total={PANEL_TITLES.length} titles={PANEL_TITLES} />
    </main>
  )
}
```

- [x] **步骤 2：迁移布局样式**

将 `apps/web/src/pages/Home/home.css` 原样迁移到 `PanelPageLayout.css`，由共享布局组件导入，保持现有类名和视觉效果。

- [x] **步骤 3：检查布局引用**

运行：

```bash
rg -n "home-container|home-panel--current|PanelPageLayout" apps/web/src
```

预期：共享布局拥有容器类，三个页面均可使用当前 Panel 类。

### 任务 2：简化 Home 并新增独立页面

**文件：**
- 修改：`apps/web/src/pages/Home/index.tsx`
- 创建：`apps/web/src/pages/Information/index.tsx`
- 创建：`apps/web/src/pages/Portfolio/index.tsx`

- [x] **步骤 1：删除 Home 内的多 Panel 切换状态**

保留 HeroPanel 所需的视频可用性、资源地址和打字动画；删除 IntroPanel、DetailPanel 的懒加载、预加载、滚轮/键盘/触摸切换及过渡状态。

- [x] **步骤 2：让 Home 只渲染 HeroPanel**

```tsx
return (
  <PanelPageLayout currentIndex={0}>
    <HeroPanel
      panelClass="home-panel--current"
      quoteText={QUOTE_TEXT}
      typedLength={typedLength}
      canUseVideo={isVideoEnabled}
      imageSrc={homeImageSrc}
      hlsManifestSrc={homeHlsManifestSrc}
      fallbackVideoSrc={homeFallbackVideoSrc}
    />
  </PanelPageLayout>
)
```

- [x] **步骤 3：创建 Information 页面**

```tsx
function Information() {
  return (
    <PanelPageLayout currentIndex={1}>
      <section className="home-panel home-panel--current" aria-label="home intro panel">
        <IntroPanel />
      </section>
    </PanelPageLayout>
  )
}
```

- [x] **步骤 4：创建 Portfolio 页面**

```tsx
function Portfolio() {
  return (
    <PanelPageLayout currentIndex={2}>
      <section className="home-panel home-panel--current" aria-label="home detail panel">
        <DetailPanel />
      </section>
    </PanelPageLayout>
  )
}
```

- [x] **步骤 5：执行 TypeScript 构建**

运行：

```bash
pnpm run build
```

工作目录：`apps/web`

预期：TypeScript 与 Vite 构建均成功，三个页面均被 `vite-plugin-pages` 收集。

### 任务 3：将 Navbar 改为路由导航

**文件：**
- 修改：`apps/web/src/components/Navbar/index.tsx`
- 修改：`apps/web/src/App.tsx`

- [x] **步骤 1：为导航项声明真实路由**

```tsx
const NAV_ITEMS = [
  { en: 'INDEX', zh: '首页', to: '/Home' },
  { en: 'INFORMATION', zh: '介绍', to: '/Information' },
  { en: 'PORTFOLIO', zh: '作品', to: '/Portfolio' },
]
```

- [x] **步骤 2：使用 React Router Link**

Navbar 接收 `activeIndex`，Logo 与三个导航项使用 `Link`，不再阻止默认事件或调用 Home 状态回调：

```tsx
<NavigationMenu.Link asChild>
  <Link
    className={`site-nav__link ${isActive ? 'site-nav__link--active' : ''}`}
    to={item.to}
  >
    <span className="site-nav__text-en">{item.en}</span>
    <span className="site-nav__text-zh">{item.zh}</span>
  </Link>
</NavigationMenu.Link>
```

- [x] **步骤 3：由 App 根据路径决定 Navbar 状态**

`App` 删除跨页面状态和 Outlet context，使用 pathname 映射导航索引，只在三个站点页面展示 Navbar：

```tsx
const NAV_PATHS = ['/home', '/information', '/portfolio']
const activeIndex = NAV_PATHS.indexOf(pathname)
const showNavbar = pathname === '/' || activeIndex >= 0
```

- [x] **步骤 4：执行静态检查**

运行：

```bash
pnpm run lint
pnpm run build
git diff --check
```

工作目录：`apps/web`，`git diff --check` 在仓库根目录执行。

预期：命令全部成功，无空白错误。

### 任务 4：浏览器验收

**文件：**
- 验证：`apps/web/src/pages/Home/index.tsx`
- 验证：`apps/web/src/pages/Information/index.tsx`
- 验证：`apps/web/src/pages/Portfolio/index.tsx`

- [x] **步骤 1：启动开发服务器**

运行：

```bash
pnpm run dev -- --host 127.0.0.1
```

工作目录：`apps/web`

预期：Vite 输出本地访问地址。

- [x] **步骤 2：验证三条路由和导航高亮**

依次访问 `#/Home`、`#/Information`、`#/Portfolio`，确认页面分别显示首页、介绍、作品内容，Navbar 对应项高亮，点击导航后 URL 和内容同步更新。

- [x] **步骤 3：验证 404 与控制台**

访问一个不存在的 Hash 路由，确认仍显示 404；检查三条正常路由无 React 运行时错误。

- [x] **步骤 4：检查最终差异**

运行：

```bash
git status --short
git diff -- apps/web/src docs/superpowers/plans/2026-08-23-split-home-panels-into-pages.md
```

预期：仅包含本次页面拆分及用户原有未提交内容，不修改无关文件。
