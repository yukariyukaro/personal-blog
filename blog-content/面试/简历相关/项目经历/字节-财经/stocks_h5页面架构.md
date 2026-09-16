# stocks_h5 页面架构

本文用 `stocks_h5` 中的 `bindCardLanding` 页面说明一个财经 H5 页面的基本架构。

重点不是记住某个文件名，而是理解：

```text
接口数据如何进入页面 -> 页面状态如何组织 -> 组件如何渲染 -> 用户操作如何回到业务流程
```

## 1. 一句话概括

`stocks_h5` 的复杂页面通常不是把请求、状态、视图、跳转、埋点都写在一个组件里，而是拆成：

| 层 | 目录 | 职责 |
|----|------|------|
| 页面注册 | `pages.config.ts` | 告诉 PIA 页面入口、预取入口、SSR、资源预加载 |
| 页面入口 | `index.tsx` | 组装页面壳、消费预取数据、挂 Store、选择渲染哪个内容组件 |
| 数据预取 | `prefetch.ts` | 在 PIA Worker / SSR / Client 场景下提前请求首屏数据 |
| 状态模型 | `model/` | 定义页面状态、状态修改方法、派生状态 |
| 业务控制 | `controller/` | 处理接口响应、跳转、返回、开户决策、埋点初始化 |
| 生命周期 | `hooks/` | 接入页面可见性、预取消费、任务完成提示等副作用 |
| 视图组件 | `components/` | 只关心界面展示和用户点击入口 |
| 工具函数 | `utils/` | 放可复用的纯函数、存储、schema 拼接、样式决策 |
| 静态资源 | `assets/` | 页面局部图片和动效素材 |

这套架构本质上借鉴了 MVC/MVVM，但不是教科书式实现：

| 架构概念 | 在 `bindCardLanding` 中的对应 |
|----------|-------------------------------|
| Model | `model/state.ts`、`model/store.ts` |
| View | `components/`、`index.tsx` 中的页面壳 |
| Controller | `controller/fetchData.ts`、`controller/pageBtnHandler.ts` |
| ViewModel | `model/selectors.ts`、部分 `hooks/` |

## 2. 页面注册入口

页面先在 `apps/stocks/pages.config.ts` 中注册：

```ts
BIND_CARD_LANDING: {
  name: 'bindCardLanding',
  source: 'bind_card_landing',
  entry: 'src/pages/bindCardLanding/index',
  prefetchEntry: 'src/pages/bindCardLanding/prefetch.ts',
  title: '绑卡活动',
  path: './bindCardLanding.html?_pia_=1',
  ssr: { mode: 'string-stream' },
  preloadResource: true,
  enableRrp: true,
}
```

这个配置说明：

| 配置 | 作用 |
|------|------|
| `entry` | 页面 React 入口 |
| `prefetchEntry` | PIA 预取入口，用于首屏提前请求数据 |
| `path` | 构建后的访问路径 |
| `ssr` | 开启 SSR 字符串流模式 |
| `preloadResource` | 允许资源预加载 |
| `enableRrp` | 开启页面恢复 / 重建相关能力 |

## 3. 页面文件树

以 `apps/stocks/src/pages/bindCardLanding` 为例，文件结构可以简化理解为：

```text
bindCardLanding/
  index.tsx
  prefetch.ts
  constants.ts
  index.module.scss
  config/
    constants.ts
  model/
    state.ts
    store.ts
    selectors.ts
    index.ts
  controller/
    fetchData.ts
    decideOpenAccount.ts
    pageBtnHandler.ts
    pageInit.ts
    tracking.ts
  hooks/
    useBindCardLandingPrefetch.ts
    usePageVisibilityChange.ts
    useTaskCompletedToast.ts
  components/
    FullScreenContent/
    HalfScreenContent/
    FundStyleContent/
    DynamicPopup/
    RetentionPopup/
    ...
  utils/
    query.ts
    destiny-card-style.ts
    resolveLandingStyle.ts
    openAccountSchema.ts
    ...
  assets/
    fundStyle2/
    fundStyle3/
    hand.png
    wave.png
```

## 4. 接口调用链路

### 4.1 首屏主接口

首屏数据来自：

```text
POST /wealth-api/stock-portal/query-put-results
```

代码位置：

```text
prefetch.ts -> fetchBindCardLandingPutResults()
```

请求里最重要的是两个字段：

| 字段 | 作用 |
|------|------|
| `placeDisplayInfos` | 告诉后端要查询哪些资源位 |
| `extInfo` | 透传页面上下文，如 `display_mode`、`wp_args`、`enter_from` |

资源位包括：

| 资源位 | 作用 |
|--------|------|
| `open_account_submit_campaign_page` | 全屏主资源位 |
| `open_account_submit_campaign_half_page` | 半屏主资源位 |
| `bind_card_act_page_alert` | 首屏红包 / 活动弹窗 |

### 4.2 返回行为 TCC

页面返回按钮不是永远直接 `webviewBack`，还会读取 TCC：

```text
portalService.QueryConfig({ configKey: 'bind_card_back_navigation_config' })
```

作用是判断某些 `enter_from + aid` 场景下，返回时是否跳到股票小程序首页。

失败策略是 fail-open：

```text
TCC 失败 / 字段缺失 / JSON 解析失败 -> backNavigationConfig = null -> 普通返回
```

### 4.3 开户前决策接口

用户点击开户按钮后，不是直接跳开户页，而是先请求拦截资源位：

```text
portalService.QueryPutResults({
  placeDisplayInfos: bind_card_act_page_intercept,
  extInfo: { decision_source: 'button_click' | 'auth_callback' }
})
```

返回结果会被解释成：

| 决策结果 | 行为 |
|----------|------|
| `open_account` | 直接进入开户流程 |
| `auth_schema` | 先走实名授权 |
| `intercept_popup` | 展示拦截弹窗 |
| `fallback_open_account` | 异常时兜底进入开户流程 |

### 4.4 Native / JSB 能力

页面还会调用端能力：

| 能力 | 用途 |
|------|------|
| `webviewOpen` | 打开开户流程 |
| `webviewOpenSchema` | 打开规则页 |
| `webviewBack` | 普通返回 |
| `callAuthUnifySchemeBySdk` | 实名授权 |
| `monitorPageVisibility` | 监听页面可见性，回来后刷新状态 |

## 5. 首屏数据流

首屏链路可以概括为：

```text
pages.config.ts
  ↓ 注册 entry / prefetchEntry
prefetch.ts
  ↓ 请求 QueryPutResults
useBindCardLandingPrefetch.ts
  ↓ 消费 PIA 预取结果
fetchData.ts
  ↓ 解析主资源位 / 弹窗 / 埋点字段
model/store.ts
  ↓ 写入 config、popupData、buriedPointInfo、loading
model/selectors.ts
  ↓ 派生背景图、按钮状态、是否展示弹窗等
components/
  ↓ 渲染全屏、半屏、弹窗、骨架屏
```

关键点：

| 设计 | 作用 |
|------|------|
| `prefetch.ts` 提前请求 | 降低首屏等待时间 |
| `useBindCardLandingPrefetch` 统一消费 | 命中缓存或兜底请求都走同一套落库逻辑 |
| `applyBindCardLandingPutResults` | 把后端响应转换成页面状态 |
| `firstPageReady` | 控制 `Monitor.reportPageReady()` 单次上报 |
| `ZustandProvider preloadedState` | 让 SSR / 首屏数据进入页面 Store |

## 6. 用户点击链路

以“点击开户按钮”为例：

```text
FullScreenContent / HalfScreenContent
  ↓ onClick
pageBtnHandler.onBindCardClick()
  ↓ 防重复点击锁
decideOpenAccount()
  ↓ 请求拦截资源位
根据结果分支：
  - auth_schema -> callAuthUnifySchemeBySdk
  - intercept_popup -> showInterceptPopup
  - open_account / fallback -> performOpenAccount
  ↓
performOpenAccount()
  ↓ 拼接 buriedPointInfo、容器参数
webviewOpen()
```

这条链路体现了 Controller 的价值：

| 如果写在组件里 | 拆到 controller 后 |
|----------------|--------------------|
| 组件同时处理 UI、请求、锁、授权、跳转 | 组件只触发 `onBindCardClick` |
| 很难复用开户逻辑 | 弹窗按钮也能复用 `performOpenAccount` |
| 分支多，组件膨胀 | 业务流程集中在 `pageBtnHandler.ts` |
| 测试和排查困难 | 每个分支有明确入口 |

## 7. 各文件作用

### 7.1 根文件

| 文件 | 作用 |
|------|------|
| `index.tsx` | 页面 React 入口。消费 prefetch 数据，创建 `preloadedState`，挂载 `ZustandProvider`，组装 `PageLayout`，选择全屏 / 半屏内容，挂载弹窗。 |
| `prefetch.ts` | PIA 数据预取入口。请求 `query-put-results`，同时兼容 Server、Worker、Client 场景。 |
| `constants.ts` | 页面通用常量，如默认背景图、失败图、Lottie 地址、活动状态、低版本判断。 |
| `index.module.scss` | 页面入口级样式，主要服务顶部规则按钮、页面壳等局部样式。 |

### 7.2 `config/`

| 文件 | 作用 |
|------|------|
| `config/constants.ts` | 资源位 key、样式枚举、拦截弹窗 content_id、开户点击锁超时时间等配置。 |

### 7.3 `model/`

| 文件 | 作用 |
|------|------|
| `state.ts` | 定义页面状态结构，包括 `config`、`loading`、`popupData`、`backNavigationConfig`、`buriedPointInfo` 等。 |
| `store.ts` | 创建 Zustand store，提供状态修改方法，并通过 Context 保证 SSR 场景下不跨请求共享状态。 |
| `selectors.ts` | 把原始状态转换成视图需要的数据，例如开户链接、背景图、按钮样式、是否展示弹窗。 |
| `index.ts` | 统一导出 state、store、selectors，简化外部 import。 |

### 7.4 `controller/`

| 文件 | 作用 |
|------|------|
| `fetchData.ts` | 主数据 controller。负责请求首屏资源位、解析响应、写入 store、处理弹窗、拉取返回 TCC。 |
| `decideOpenAccount.ts` | 开户前决策 controller。请求拦截资源位，把后端 content_id 转成 `open_account`、`auth_schema`、`intercept_popup` 等结果。 |
| `pageBtnHandler.ts` | 页面按钮 controller。处理返回、规则页、开户点击、防重复点击锁、实名授权、开户跳转。 |
| `pageInit.ts` | 页面初始化逻辑。主数据入 store 后初始化 BTM 和页面曝光埋点。 |
| `tracking.ts` | 埋点封装。统一顶部按钮、页面模块、按钮曝光 / 点击等 BTM 和 event log 上报。 |

### 7.5 `hooks/`

| 文件 | 作用 |
|------|------|
| `useBindCardLandingPrefetch.ts` | 消费 PIA prefetch 数据，成功后调用 `applyBindCardLandingPutResults` 写 store，并初始化 BTM。 |
| `usePageVisibilityChange.ts` | 监听页面可见 / 不可见。页面返回可见后刷新数据，离开时给开户流程加锁。 |
| `useTaskCompletedToast.ts` | 处理任务完成后的提示逻辑，避免同一任务重复弹提示。 |

### 7.6 `components/`

| 文件 / 目录 | 作用 |
|-------------|------|
| `FullScreenContent/` | 全屏落地页主体。处理 loading、异常态、legacy 样式、新基金样式、底部按钮和动效。 |
| `HalfScreenContent/` | 半屏落地页主体。结构更轻，适配半屏容器展示。 |
| `HalfScreenContentHeader/` | 半屏页头 HOC，给半屏内容统一加头部区域。 |
| `FundStyleContent/` | 基金新样式内容区。承载 `fund_style_2`、`fund_style_3` 的视觉结构和进度展示。 |
| `DynamicPopup/` | 动态弹窗。根据 `popupData` 渲染服务端配置弹窗，并处理跳转、继续开户、关闭等按钮动作。 |
| `RetentionPopup/` | 返回挽留弹窗。用户返回时根据本地记录和配置决定是否展示。 |
| `ClickingHand/` | 点击小手动效组件。 |
| `AsyncLottieLayer/` | 异步加载 Lottie，避免首屏直接引入大体积动效库。 |
| `FullScreenSkeleton/` | 全屏骨架屏。 |
| `HalfScreenSkeleton/` | 半屏骨架屏。 |
| `*.module.scss` | 各组件局部样式，避免样式互相污染。 |

### 7.7 `utils/`

| 文件 | 作用 |
|------|------|
| `query.ts` | 解析页面 query，兼容 SSR、端内全局参数和浏览器 location。 |
| `destiny-card-style.ts` | 把后端 `destinyCard` 转成前端样式类型，并规整新基金样式的金额字段。 |
| `resolveLandingStyle.ts` | 根据 `acctType`、`styleType`、`display_mode` 判断最终展示样式。 |
| `decideBackNavigationExitAction.ts` | 返回行为纯函数。根据 TCC、`enter_from`、`aid` 决定普通返回还是跳股票首页。 |
| `exitBindCardLanding.ts` | 执行返回动作，把抽象 `ExitAction` 转成实际 JSB 调用。 |
| `openAccountSchema.ts` | 给开户链接追加业务参数，如 `top_level`、`buriedPointInfo`。 |
| `preloadFundOpenAccountResource.ts` | 根据开户链接或券商信息预加载开户资源。 |
| `retention.ts` | 返回挽留弹窗的展示频控和记录。 |
| `storage.ts` | 页面本地存储封装，兼容 JSB storage 和浏览器 localStorage。 |
| `taskToast.ts` | 任务完成 toast 的本地去重记录。 |
| `animation-capability.ts` | 判断当前设备是否适合渲染 Lottie 动效。 |

### 7.8 `assets/`

| 目录 / 文件 | 作用 |
|-------------|------|
| `assets/fundStyle2/*` | `fund_style_2` 样式所需背景、标题、券卡、流程、说明图。 |
| `assets/fundStyle3/*` | `fund_style_3` 样式所需顶部背景、装饰图、权益卡、流程卡。 |
| `assets/hand.png` | 点击小手素材。 |
| `assets/wave.png` | 页面装饰素材。 |

## 8. 这套架构解决了什么问题

### 8.1 控制组件复杂度

如果没有分层，`index.tsx` 会同时处理：

```text
请求接口
解析资源位
管理 loading/error
渲染全屏/半屏
处理开户点击
处理实名授权
处理返回挽留
处理埋点
处理页面可见性刷新
```

拆分后，组件只负责展示和触发动作，复杂业务流程沉到 controller、hooks、model。

### 8.2 支撑多运行环境

`stocks_h5` 页面不是普通浏览器页，它要兼容：

| 环境 | 要求 |
|------|------|
| PIA Worker | 预取阶段不能随意访问 `window/document` |
| SSR | 不能跨请求共享全局 store |
| WebView / AnnieX | 需要调用 JSB、schema、页面可见性 |
| 普通 H5 | 需要有浏览器降级逻辑 |

所以代码里会有：

| 设计 | 作用 |
|------|------|
| `prefetch.ts` | 放多端可运行的数据预取逻辑 |
| `ZustandProvider` | 每次渲染创建独立 store |
| `useStore.getState` 服务端保护 | 避免 SSR 阶段错误访问客户端 store |
| `utils/query.ts` | 统一 query 来源 |
| `utils/storage.ts` | 统一端内 / 端外存储差异 |

### 8.3 让数据流可追踪

这套结构让问题排查有明确路径：

| 问题 | 优先看哪里 |
|------|------------|
| 首屏数据没回来 | `prefetch.ts`、`useBindCardLandingPrefetch.ts` |
| 后端返回了但页面没展示 | `fetchData.ts`、`model/selectors.ts` |
| UI 样式异常 | 对应 `components/*/index.tsx` 和 `index.module.scss` |
| 开户点击异常 | `pageBtnHandler.ts`、`decideOpenAccount.ts` |
| 返回行为异常 | `fetchBackNavigationConfig`、`decideBackNavigationExitAction.ts` |
| 埋点缺失 | `pageInit.ts`、`tracking.ts` |

### 8.4 便于复用和测试

有些逻辑被刻意拆成纯函数，例如：

| 文件 | 可测试点 |
|------|----------|
| `decideBackNavigationExitAction.ts` | 输入 TCC、`enter_from`、`aid`，输出返回动作 |
| `resolveLandingStyle.ts` | 输入账号类型和样式字段，输出最终样式 |
| `destiny-card-style.ts` | 输入后端素材字段，输出前端标准字段 |
| `openAccountSchema.ts` | 输入 schema 和参数，输出拼接后的 schema |

这些函数不依赖 React，也不依赖真实 DOM，更容易单测。

## 9. 和 MVC/MVVM 的关系

`bindCardLanding` 更像是现代 React 单向数据流，但可以用 MVC/MVVM 辅助理解。

| 层 | 代码 | 类比 |
|----|------|------|
| 原始数据和状态 | `state.ts`、`store.ts` | Model |
| 状态到视图字段的转换 | `selectors.ts` | ViewModel |
| 页面生命周期副作用 | `hooks/` | ViewModel / Effect |
| 用户操作和业务流程 | `controller/` | Controller |
| 页面展示 | `components/`、`index.tsx` | View |

它和传统 MVVM 的区别是：

| MVVM | `stocks_h5` React 页面 |
|------|------------------------|
| View 绑定 ViewModel，自动双向同步 | 组件通过 selector 订阅 store，走单向数据流 |
| ViewModel 常和模板强绑定 | selector / hook / controller 更分散 |
| 更强调响应式绑定 | 更强调事件触发 action，action 写 store 后视图重渲染 |

更准确的表述：

> `stocks_h5` 页面借鉴 MVC/MVVM 的职责分离思想，但落地方式是 React + Zustand + PIA prefetch 的单向数据流。Model 管状态，selector/hook 提供视图模型，controller 管业务流程，components 管展示。

## 10. 面试表达

可以这样说：

> 在 `stocks_h5` 这类财经 H5 项目里，一个页面不是单纯的 React 组件，而是 PIA 页面运行单元。以绑卡落地页为例，页面在 `pages.config.ts` 注册入口和 prefetch，`prefetch.ts` 负责首屏资源位请求，`useBindCardLandingPrefetch` 把预取结果写入 Zustand store，`selectors` 把状态转换成组件需要的数据，`controller` 处理刷新、返回、开户决策、实名授权和埋点，`components` 只负责全屏、半屏、弹窗等展示。

如果面试官追问为什么要这样拆，可以补充：

> 这样拆的核心价值是控制复杂度。财经 H5 页面同时涉及 SSR、PIA Worker、WebView JSB、后端资源位、弹窗、开户流程、埋点和监控。如果都写在组件里，很快会变成不可维护的大组件。拆成 model、controller、hooks、components 后，数据流、业务流和视图层边界更清楚，也更容易排查问题和复用逻辑。

