# Triple Uni 性能优化专项（面试稿）

> 目标岗位：前端开发工程师
> 范围：小程序端（首页信息流）为主，Web 端（年度总结）为辅
> 配套：[0.提纲.MD](./0.提纲.MD) 附录 A（页面加载各阶段划分）

**目录**

- [一、数据采集](#一数据采集)
- [二、怎么找瓶颈](#二怎么找瓶颈)
- 三、优化策略（待写）
- 四、数据回收与 AB 实验（待写）
- 五、非常规手段：预拉取与 codeCache（待写）

---

## 一、数据采集

### 1.1 采集了哪些指标

原则：**全部走官方 Performance API，只有官方不覆盖的一块自己补。**

| 指标 | 采集方式 |
|---|---|
| 启动总耗时 | 官方 `appLaunch`（navigation） |
| 代码包下载耗时 | 官方 `downloadPackage`（2.24.0+） |
| 代码注入耗时 | 官方 `evaluateScript`（script） |
| 页面首次渲染耗时 | 官方 `firstRender`（render） |
| FP / FCP / LCP | 官方 `firstPaint` / `firstContentfulPaint` / `largestContentfulPaint` |
| 视图层资源加载耗时 | 官方 `resourceTiming`（2.24.0+） |
| 业务接口网络耗时 | `wx.request` 回调的 `profile` ← **唯一自补项** |

### 1.2 怎么采：微信官方 Performance API
```javascript
// app.js 的 onLaunch 里注册，越早越好（原因见限制 3）
const perf = wx.getPerformance()
perf.setBufferSize(50)   // 默认只缓冲 30 条，启动阶段条目多，容易溢出

// 阶段类：有 duration；时间点类：FP / FCP / LCP 无 duration，只有 startTime
const PHASE = ['appLaunch', 'evaluateScript', 'downloadPackage', 'firstRender']

const observer = perf.createObserver((entryList) => {
  entryList.getEntries().forEach((entry) => {
    if (PHASE.includes(entry.name)) {
      report({
        name: entry.name,
        duration: entry.duration,             // appLaunch / evaluateScript / downloadPackage / firstRender 都取这里
        path: entry.path,                     // render / navigation 才有
        packageName: entry.packageName,       // 仅 downloadPackage：包名，主包为 APP
        packageSize: entry.packageSize,       // 仅 downloadPackage：包体积（字节）
        comm: entry.initDataRecvTime - entry.initDataSendTime,                 // 仅 firstRender：逻辑层 → 渲染层
        render: entry.viewLayerRenderEndTime - entry.viewLayerRenderStartTime, // 仅 firstRender：渲染层真正渲染
      })
    } else {
      report({ name: entry.name, startTime: entry.startTime })   // FCP 等时间点指标
    }
  })
})

observer.observe({ entryTypes: ['navigation', 'render', 'script', 'loadPackage'] })
```

**取值速查**——最容易踩的坑是「阶段取 `duration`、时间点取 `startTime`」：

| 指标 | 关键字段 |
|---|---|
| `appLaunch` / `evaluateScript` / `downloadPackage` / `firstRender` | `duration`（ms） |
| `firstPaint` / `firstContentfulPaint` / `largestContentfulPaint` | `startTime`（**无 `duration`**） |
| `downloadPackage` | 额外有 `packageName`、`packageSize` |
| `firstRender` | 额外有 5 个细分时间点（见下） |

**具体怎么拿到 FCP / LCP 的值**——用 `perf.getEntriesByName(name, entryType)`，注意**两个参数都得传**，第二个是 `entryType`（容易漏，漏了就拿不到）：

```javascript
// FCP：只会产生一条
const [fcp] = perf.getEntriesByName('firstContentfulPaint', 'render')

// LCP：会随「更大的内容」出现而不断追加新条目，取最后一条才是最终值
const lcpList = perf.getEntriesByName('largestContentfulPaint', 'render')
const lcp = lcpList[lcpList.length - 1]

report({
  fcp: fcp && fcp.startTime,   // 时间点，不是耗时区间
  lcp: lcp && lcp.startTime,
})
```

两个容易踩的点：

- **LCP 必须取最后一条**。它不是一个固定值——首屏图片陆续加载完成时，只要出现更大的内容就会再推一条新条目，所以最早那条不是 LCP，最后一条才是。
- **取的时机不能太早**。`onReady` 时首屏图片可能还没回来，LCP 还会被刷新；Web 端的口径是「用户首次交互或页面隐藏时停止记录」，小程序里对应做法是用观察者持续更新、只上报最后一个值，或在 `onHide` / `onUnload` 兜底上报。

> **口径说明（别讲过头）**：官方只写了「FP / FCP / LCP 是时间点、无 duration」，**没写 `startTime` 的基准是什么、LCP 何时停止、该取哪一条**。「LCP 取最后一条」来自 LCP 本身的定义与 Web 端一致口径（web.dev：LCP 是观察器报告的最后一个条目）。面试时讲成「按 Web 端 LCP 的通用口径取最后一条」最稳，别说成「微信文档规定」。

> **`resourceTiming` 要单独取**：官方 `observe` 文档里 `type` 的合法值只有 `navigation` / `render` / `script` / `loadPackage` 四类，**没有 `resource`**，所以视图层资源用 `getEntriesByType('resource')` 主动取：
> ```javascript
> perf.getEntriesByType('resource')
>   .filter(e => e.initiatorType === 'image')
>   .forEach(e => report({ uri: e.uri, duration: e.duration, size: e.transferSize }))
> ```

`wx.getPerformance()` 提供 `getEntries()` / `getEntriesByType()` / `getEntriesByName()` / `createObserver()` / `setBufferSize()`。

**三个必须知道的限制**：

1. **FP / FCP / LCP 没有 `duration`**，只能拿到时间点；想知道「渲染花了多久」要用 `firstRender` 的 `duration`。
2. **平台支持差异极大**：FP、LCP 在 **iOS 上不支持**，FCP 在 iOS 14.5 以下不支持。所以使用前必须先自检：
   ```javascript
   const supported = perf.createObserver(() => {}).supportedEntryTypes
   ```
3. **`observe` 没有 Web 的 `buffered` 参数**（只有 `type` / `entryTypes`），所以必须尽早注册，否则会漏掉启动阶段的条目；默认缓冲区仅 30 条。

**额外收获**：`firstRender` 还带五个细分时间点（2.21.2+），能定位「通信慢还是渲染慢」：

| 字段 | 含义 |
|---|---|
| `viewLayerReadyTime` | 渲染层代码注入完成 |
| `initDataSendTime` | 首次渲染参数从逻辑层发出 |
| `initDataRecvTime` | 首次渲染参数在渲染层收到 |
| `viewLayerRenderStartTime` | 渲染层开始渲染 |
| `viewLayerRenderEndTime` | 渲染层渲染结束 |

```
逻辑层 → 渲染层通信耗时 = initDataRecvTime - initDataSendTime
渲染层实际渲染耗时     = viewLayerRenderEndTime - viewLayerRenderStartTime
```

> **和本项目直接相关的一条**：项目开了 `lazyCodeLoading: requiredComponents`（按需注入）。官方明确说明：开启按需注入后 `evaluateScript` 只包含公共部分代码，**页面和组件的代码注入时间被算进 `firstRender`**。所以会看到「脚本耗时下降、渲染耗时上升」——这是正常现象，判断优化效果要看整体 `appLaunch`。

### 1.3 唯一需要自补的：业务接口耗时

官方 `resourceTiming` 只覆盖**视图层资源**——它的 `initiatorType` 合法值只有 `audio` / `cover-image` / `image` / `open-data`，**不含 `wx.request` 发出的业务接口**。所以业务接口的网络耗时要用请求回调里的 `profile`：

```javascript
wx.request({
  url, data,
  enableProfile: true,          // 默认就是 true
  success(res) {
    const p = res.profile
    report({
      name: url,
      dns:  p.domainLookUpEnd - p.domainLookUpStart,
      tcp:  p.connectEnd - p.connectStart,
      tls:  p.SSLconnectionEnd - p.SSLconnectionStart,
      ttfb: p.responseStart - p.fetchStart,
      total: p.responseEnd - p.fetchStart,
    })
  },
})
```

`ttfb - (dns + tcp + tls)` 就是**服务端处理时间**——这一步的价值是把「网络慢」和「服务端慢」分开。

> ⚠️ 客户端版本门槛：iOS 需 8.0.3+、Android 需 7.0.12+。

#### 附带修正：`setData` 回调就是官方的「渲染完成」回调

微信官方文档对 `setData(data, callback)` 里 callback 的定义是「**setData 引起的界面更新渲染完毕后的回调函数**」。

所以它本身就是官方给出的渲染完成时机，**不需要再套一层 `wx.nextTick`**——多套一层只是引入一个不确定的 tick 延迟，反而让时间点更模糊。

### 1.4 上报

两条路都用过：

- **官方通道**：`wx.reportPerformance(id, value, dimensions)`（2.9.2+）。`id` 要先去管理后台「开发 - 运维中心 - 小程序测速」新建；**`value` 得我们自己算好传进去**，也就是上面从 entry 里取的 `duration` / `startTime`。后台直接出趋势图（按机型、系统、网络维度聚合，数据保留 7 天），但每类指标最多 20 个 ID，**且没有版本号维度**，做不了发版对比。
- **自建上报**：维度自己定，用来做发版对比和 AA 实验。

自建通道的原则：攒批、异步、失败不重试、不阻塞渲染，切后台兜底刷一次。

```javascript
const queue = []
function record(type, data) {
  queue.push({ type, data, ts: Date.now() })
  if (queue.length >= 10) flush()
}
function flush() {
  if (!queue.length) return
  wx.request({ url: '/monitor/report', method: 'POST', data: queue.splice(0), fail: () => {} })
}
wx.onAppHide(() => flush())
```

**维度**：版本号、机型档位、客户端版本、冷/热启动、缓存命中与否、网络类型。缺维度数据就不可比——没有版本号做不了发版对比，没有机型档位会被低端机平均掉。

### 1.5 Web 端（年度总结）补充

SSR 页面用 `PerformanceObserver` 采 LCP / CLS / FCP；业务接口从 `resource` 条目里按 `initiatorType` 过滤出 `fetch` / `xmlhttprequest`，这样能把接口和静态资源分开。

### 1.6 一分钟口述版

> 「采集上我的原则是：官方有的指标一律用官方。小程序从基础库 2.11.0 起有完整的 Performance API，我用 `wx.getPerformance()` 建一个全局观察者，一次性拿到 `appLaunch` 启动耗时、`downloadPackage` 代码包下载、`evaluateScript` 代码注入、`firstRender` 首次渲染，FP、FCP、LCP 也都在这一套里——所以首屏这条链路不需要自己打点。
>
> 用之前必须先自检支持度——FP 和 LCP 在 iOS 上不支持，FCP 在 iOS 14.5 以下不支持；另外 `observe` 没有 Web 的 `buffered`，观察者得尽早注册，否则漏掉启动阶段的条目。
>
> 官方唯一覆盖不到的是业务接口的网络耗时——`resourceTiming` 只采视图层资源，不含 `wx.request`，所以用回调里的 `profile` 拆 DNS、TCP、TLS 和 TTFB，能把「网络慢」和「服务端慢」分开。
>
> 我特意没有自己用 `Date.now()` 算首屏：起点不是用户点击，代码包下载和代码注入都在 `onLoad` 之前、拿不到，算出来的值既不是首屏也不是渲染耗时。」

### 1.7 追问防线

| 会被问 | 怎么答 |
|---|---|
| 这些指标在 iOS 上都有吗？ | 不全有。FP、LCP 在 iOS 上不支持，FCP 在 iOS 14.5 以下不支持，所以必须先用 `supportedEntryTypes` 自检 |
| FP / FCP / LCP 的值从哪个字段取？ | `startTime`。它们只有时间点、没有 `duration`；只有 `appLaunch` / `evaluateScript` / `downloadPackage` / `firstRender` 这类阶段指标才取 `duration` |
| FCP / LCP 具体怎么取？ | `perf.getEntriesByName('firstContentfulPaint', 'render')[0].startTime`。两个参数都得传，第二个 `entryType` 漏了就拿不到；LCP 要取**最后一条**，它会被更大的内容持续刷新 |
| 为什么观察者要尽早注册？ | `observe` 没有 `buffered`，注册前发生的条目拿不到；默认缓冲区仅 30 条 |
| 业务接口耗时官方不采吗？ | `resourceTiming` 只覆盖视图层资源（`initiatorType` 仅 audio / cover-image / image / open-data），不含 `wx.request` |
| `setData` 回调能当渲染完成吗？ | 能。官方文档对 callback 的定义就是「setData 引起的界面更新渲染完毕后的回调」，不需要再套 `wx.nextTick` |
| 首屏渲染慢，是慢在通信还是渲染？ | 用 `firstRender` 的细分时间点算：通信耗时和渲染层实际渲染耗时可以分开 |
| 怎么知道慢在网络还是服务端？ | 小程序：`ttfb - (dns + tcp + tls)`；Web：`Server-Timing` 响应头 |
| 埋点会不会自己造成性能问题？ | 攒批 + 异步 + 失败不重试 + 不在渲染路径做同步等待；切后台兜底刷队列 |

---

## 二、怎么找瓶颈

> 这一章只回答一个问题：**怎么把「首页有点慢」变成「这 400ms 花在等登录校验上」。**
> 方法论一句话：**瓶颈通常不在「哪一段最慢」，而在时间轴上的空白和串行。**

### 2.1 工具分层：一个工具只回答一个问题

| 层 | 工具 | 能拿到什么 | 回答什么问题 | 局限 |
|---|---|---|---|---|
| ① 线上分位 | `wx.getPerformance()` + `wx.reportPerformance` / 自建上报（见第一章） | `appLaunch` / `downloadPackage` / `evaluateScript` / `firstRender` / FCP / LCP 的 P50 / P90 | 哪一段最慢、慢在什么机型、发版有没有回退 | 只有数值、没有时间轴，**定位不到「谁在等谁」** |
| ② 单机瀑布 | 开发者工具的性能 / Trace 面板（可导出 trace，用 Perfetto 或 `chrome://tracing` 打开） | 启动全流程时间轴：代码包下载、注入、路由、`firstRender`、**每一次 `setData`**、**每一个 `wx.request`** 的起止时刻 | **串行和空白在哪**、说好的并发是不是真并发 | 跑在开发机 / 模拟器上，不代表线上低端机 |
| ③ 真机复核 | 真机调试 + 真机上的性能监控面板 | 真机上的启动耗时、`setData` 耗时、**FPS 曲线**、内存 | 低端机上能否复现、掉帧出现在第几屏 | 单机采样；工具能力随版本变化 ⚠️ |
| ④ 定点埋点 | `wx.request` 的 `profile`（DNS / TCP / TLS / TTFB / 服务端） | 接口这一段的网络构成 | 慢在网络还是慢在服务端 | 只覆盖业务接口，不含视图层资源 |
| ⑤ 运行时自测 | 自己给 `setData` 打一层代理，统计每次的**数据体积 + 耗时**（见 2.2） | `setData` 的调用频率、单次体积、耗时趋势 | 卡顿是「渲染重」「数据大」还是「调用次数多」 | 代理本身有开销，只能开在开发 / 灰度包 |
| ⑥ Web 端（年度总结） | Lighthouse + Performance 面板 + `PerformanceObserver` | LCP / CLS / FCP、主线程长任务 | SSR 页面里到底谁在阻塞 | 本地跑分 ≠ 真实用户 |

三层的关系是**从粗到细、逐层收窄**：

```text
线上 P90 分位    →  找到「哪一段慢」
Trace 瀑布       →  找到「谁在等谁」
定点埋点 / 代理  →  验证「改完是不是真的变快了」
```

只有第 ① 层会得到「数字」，但它天然无法回答归因问题——这也是为什么「采集」必须和「找瓶颈」分开讲：**采集负责让你知道有异常，瀑布负责让你知道异常是谁造成的。**

> ①「线上分位」的 P90 具体是什么口径、为什么性能要看 P90 而不是均值、为什么要按机型拆开看，见 [0.提纲.MD](./0.提纲.MD) 附录 B。

> ⚠️ ②③ 两类面板的具体名称、可导出格式会随开发者工具版本变化，面试前按自己实际用的版本核对一遍再讲，别背面板名字。

### 2.2 官方覆盖不到的一小块：`setData` 代理

官方 Performance API 拿得到 `firstRender`，但拿不到「第 N 次 `setData` 花了多久、传了多少字节」——而滚动卡顿恰恰出在这里。这一块自己补，做法很轻：

```javascript
// 只在开发 / 灰度包启用；代理本身有开销，不能带上线
const rawSetData = Page.prototype.setData
Page.prototype.setData = function (data, cb) {
  const size = JSON.stringify(data).length          // 本次传了多少字节
  const t0 = Date.now()
  rawSetData.call(this, data, function () {
    record(this.route, { size, cost: Date.now() - t0 })   // 分页面、按次数上报
    cb && cb()
  })
}
```

这条数据的价值在于**把「节点多」和「数据大」分开**：如果 `size` 一直很小、`cost` 却一直涨，那问题就不是数据量，而是页面里挂着的节点数。这是 2.4 那一步的关键依据。

### 2.3 第一条线：定位「首屏为什么慢」

**第一步：先在线上分位里确认这件事值不值得做**

把 `appLaunch` 和 `firstRender` 的 P50 / P90 按机型档位拆开看。只看均值会被高端机拉平；按机型拆完才会发现**低端机的 P90 与高端机 P50 差着一个量级**，而流失主要发生在这一档用户身上。到这一步只得到一个结论：**首屏值得做，而且必须按低端机做**——但还不知道时间花在哪。

**第二步：到 Trace 瀑布上看「形状」**

在性能面板上，首页冷启动这条时间轴大致长这样（宽度是示意，**形状才是信息**）：

```text
|—— 代码包下载 ——|—— 代码注入 ——|— onLoad / 首屏骨架 —|      空白       |== 4 个请求并发 ==|— setData / 渲染 —|— 首图下载 —|
                    |===== /user/check/wechat 在飞 =====|          ↑
                                                        校验返回，4 个请求才发出
```

> ⚠️ 先把这个「空白」说准：它是**逻辑层没有任务可执行**的区间，不等于「什么都没在飞」——更早发出的 `/user/check/wechat` 的网络条还在飞，只是它和首屏数据无关。**空白的长度 = 校验请求返回时刻 − `Page.onLoad` 时刻**，取决于两者谁先谁后：请求越慢、页面加载越快，这段就越长。所以它最容易出现在**低端机 + 弱网**这个恰好最需要快首屏的组合上。

对着这条轴能读出三件事：

- **观察 1：下载 + 注入是启动里最长的一段。** 主包里有 21 个页面、组件在页面里全量声明（见 [app.json](../../../tripleuni-frontend-wechat/app.json)）。这一段已经开过按需注入 `lazyCodeLoading: requiredComponents`，能继续压的只剩分包——但它是**固定成本**，不是靠改代码就能立刻砍掉的，先记下来，不在这轮做。

- **观察 2（核心）：`Page.onLoad` 之后有一段逻辑层无任务的空白，首屏数据请求迟迟不出现。** 对回源码就能解释：[home.js](../../../tripleuni-frontend-wechat/pages/home/home.js#L665-L671) 的 `onLoad` 里只做了一件事——注册 `token_checked` 的监听；首屏四个请求（`getAd` / `getAll` / `getBanner` / `getTopic`）全在 `initializeWhenReady` 里，而它**只在 `token_checked` 变 true 时才被调用**；[app.js](../../../tripleuni-frontend-wechat/app.js#L61-L65) 里 `token_checked` 又是在 `this.launch()` 的 `.then()` 里才置位的。而 `launch()` 内部要么是一次 `/user/check/wechat`（有 token），要么是 `wx.login()` + 登录接口**两步串行**（无 token，见 [app.js](../../../tripleuni-frontend-wechat/app.js#L339-L399)）。
  → **首屏四个接口一个都没发出去，全在等登录校验返回。** 这才是「接口串行」的准确含义：问题不在空白本身，而在**空白之后才发请求**——首屏数据请求的发起时刻被一次登录校验整体推后，白等一个完整 RTT（无 token 冷启动是两个 RTT）。
  → 这四个接口里 `/post/list/all`、`/info/banner` 根本不依赖登录态，这个等待纯属浪费。（解法见 3.3 优化手段 1。）

- **观察 3：4 个请求本身是并排的。** 说明这段并发没问题，**不需要动**。瀑布的价值一半在「看出来什么慢」，另一半在「确认什么不慢」。

**第三步：用 `firstRender` 的细分时间点做排除法**

看到空白之后，第一反应容易是「是不是渲染太重了」。用第一章那五个细分时间点算一遍就能否掉这个方向：

```text
逻辑层 → 渲染层通信耗时 = initDataRecvTime - initDataSendTime
渲染层实际渲染耗时     = viewLayerRenderEndTime - viewLayerRenderStartTime
```

两段都不大 → **不是渲染慢，是前面等太久**。这一步排除了错误方向，把可优化空间锁定在「加载延迟」：

- 数据没回来之前，首屏大图（LCP 元素）的 URL 都还不知道，**它根本没开始下载**；
- 图本身直连源站、单张几百 KB，**下载时间也长**。

**首屏的结论**：瓶颈不是「渲染」，是三段叠加——**等登录校验（加载延迟）＋ 首图请求发起太晚（加载延迟）＋ 图大且不走 CDN（加载时间）**。三条分别对应第三章的优化手段 1、2 和 3.2 里已落地的 CDN + 本地缓存。

> 每一步都记一下「时间轴形状 + 对应源码位置」这个组合。面试时讲「我在瀑布上看到一段空白，回去一看是 `token_checked` 把四个请求串住了」，比讲任何一个数字都有说服力。

### 2.4 第二条线：定位「滑动久了卡顿」

首屏是**冷启动**这条线的问题，滚动卡顿是**运行时**这条线的问题，两者不能用同一套指标混着看（见附录 A.4 第 1 条）。

**量法**：真机跑起来，一边滑一边看 FPS 曲线，同时把 2.2 的 `setData` 代理数据按「第几页」打点。

**看到的形状**：帧率开始下跌的位置，和**已加载页数**正相关，而不是和单次 `setData` 的 `size` 正相关——`size` 每页都差不多，`cost` 却一页比一页高。

**回源码验证**：[home.js](../../../tripleuni-frontend-wechat/pages/home/home.js) 里列表是 `wx:for` 全量渲染，分页是不断往 `post_list` 里追加，`onLoadMore` 只做 `page + 1`。也就是说**页面里真实挂着的节点数随已加载页数线性增长**，每一页的插入都让 `setData` 的 diff 范围和样式重算变大。

**结论**：瓶颈是「**挂载的节点数**」，不是「数据本身」。所以解法必须是把「数据长度」和「渲染节点数」解耦（虚拟化），而不是去压缩单条数据。

**两个被排除的方向**：如果是数据量问题，`size` 应该也在涨；如果是网络问题，CPU 不该忙、FPS 也不该掉。两边对不上，才敢下这个结论。

### 2.5 一个必须提前准备的误判：开启按需注入后的「反向数据」

这一条不算瓶颈，但面试里很容易被拿来做陷阱题。

项目开了 `lazyCodeLoading: requiredComponents`，所以会看到 **`evaluateScript` 变短、`firstRender` 变长**。官方明确说明：开启按需注入后，`evaluateScript` 只包含公共部分代码，**页面和组件的注入时间被算进了 `firstRender`**。

所以：

- 看到 `evaluateScript` 下降**不能**单独当成绩，看到 `firstRender` 上升**也不能**单独当回退；
- 判断这类改动有没有效果，要看**整体 `appLaunch`**，并且前后对比要卡在同一个基础库版本上。

### 2.6 现象 → 量法 → 结论 速查表

| 现象 | 用什么量 | 量出来的形状 | 定位到的瓶颈 |
|---|---|---|---|
| 首屏慢、开屏停留久 | 线上 `appLaunch` / `firstRender` 分机型 P90 | 低端机 P90 远高于高端机 P50 | 首屏整体值得做，方向未定 |
| 同上，继续看 | Trace 瀑布 + `firstRender` 细分时间点 | 请求前有一段等长空白；通信与渲染两段都不大 | **登录校验串住了 4 个请求**；排除「渲染慢」 |
| 首屏图出得慢 | Trace 瀑布 + `profile` | 首图请求排在数据返回之后，且下载耗时长 | **加载延迟 + 加载时间**（图请求发起晚、图大） |
| 快滑看到骨架屏 | Trace 瀑布（看请求发起时刻 vs 滚动位置） | 请求发起晚于用户滚到该位置 | **预加载时机**，不是渲染问题 |
| 滑久了掉帧 | 真机 FPS + `setData` 代理 | `size` 稳定、`cost` 随页数上升 | **挂载节点数**线性增长，需要虚拟化 |
| 冷启动整体长 | `downloadPackage` + `evaluateScript` | 两段合计占启动的大头 | 主包体积，对应分包 / 独立分包 |

### 2.7 找到一堆瓶颈之后，先做哪个

先看线上分位确认影响面（低端机 P90 才算数），再按三个维度排序：

1. **影响面**：这一段在低端机 P90 上占多少，直接关系到「到达率」——用户有没有等到页面出来（口径见 4.2）；
2. **可干预性**：是不是我们自己的代码能改。代码包下载只能靠分包间接影响，业务接口请求则完全可控；
3. **改动成本**：加缓存、调并发是几行代码；拆分包、上虚拟列表是要动页面结构的。

按这个顺序，首屏这条线上**先做的是「拆串行 + 图片缓存」**——改动小、直接压掉一整段等待；**分包和虚拟列表排在后面**，因为要动结构，得配合回归测试再上。

> 还有一个不该被忽略的边界：**优化做完不等于有效，只是「看起来变快了」**。要证明它真的有效，得回到第一章的埋点做前后对比，再用第四节的 AA / AB 确认对用户指标的影响。

## 三、优化策略

> 这一章只聚焦首屏的 **FCP / LCP**。「预加载 + 后端分页」「长列表虚拟化」压的是**运行时 / 滚动性能**，不在这里展开。

### 3.1 先看 LCP 的官方四段拆解

要优化，先得知道时间花在哪。Lighthouse 把 LCP 拆成四段：

| 子段 | 官方定义 | 在小程序里对应什么 |
|---|---|---|
| **TTFB** | 从发起加载到收到第一个字节 | 代码包下载 + 注入 + 首屏接口的 TTFB |
| **加载延迟** | TTFB → 开始加载 LCP 资源 | 数据没回来之前，LCP 元素（首图、大标题）**根本没开始加载** |
| **加载时间** | LCP 资源本身的下载耗时 | 图片体积、是否走 CDN、是否命中缓存 |
| **呈现延迟** | 资源就绪 → 真正渲染出来 | `setData` → 渲染层渲染完成；主线程是否被占 |

> web.dev 有个反直觉的结论：**LCP 表现差的站点，「等 LCP 资源开始下载」花的时间几乎是实际下载时间的 4 倍**。也就是说瓶颈常常不在「图片太大」，而在「图片请求发起得太晚」。这条在小程序里尤其成立——首屏数据没回来之前，首图的 URL 都还不知道。

FCP 更简单，它只关心「第一个内容像素出现」，所以基本由 TTFB + 首屏数据到达时间决定。

**所以 FCP / LCP 的优化手段，本质就是分别压缩这四段。**

### 3.2 已经用上的：图片 CDN + 本地文件缓存

**问题**：首屏帖子配图直连源站、单张几百 KB，每次进首页都要重新下载。

**官方依据**：微信《首屏渲染优化》第 6 条「缓存请求数据」明确建议——**优先从缓存中获取数据来渲染视图，等网络请求返回后再更新**。

**做法**：

1. 图片全部改走 CDN 域名，并带缩放参数按展示尺寸下发（不要下发原图）
2. 首屏图先查本地文件缓存：命中就直接用 `localPath` 渲染，**跳过下载请求**
3. 缓存结构存 `{ localPath, src }`，用 `src` 做版本比对——源 URL 变了说明图换了，旧缓存删掉重下
4. 本地文件可能被系统回收，所以取用前必须 `access` 校验一次，失败就清缓存重下

```javascript
// 命中即用本地路径，不发下载请求
const cache = wx.getStorageSync(key)
if (cache && cache.src === url) {
  wx.getFileSystemManager().access({
    path: cache.localPath,
    success: () => render(cache.localPath),          // ← 跳过 wx.downloadFile
    fail: () => { wx.removeStorageSync(key); download(key, url) },
  })
} else {
  download(key, url)
}
```

**为什么值得**：不只是省一次网络请求——首屏图不占并发，就不会和首屏接口抢（小程序 `wx.request` 并发上限是 10，超了要排队）。

**效果**：二次进入首页时首屏图直接从本地读，LCP 明显前移。

**为什么把它排第一**：它同时压了「加载时间」和「加载延迟」两段——命中缓存时整段网络直接消失，正好对应 web.dev 说的「缩短资源加载时长最好的办法，是从流程里完全消除网络时间」。

**其余已经用上的手段**：

| 手段 | 压的是哪一段 | 官方依据 | 状态 |
|---|---|---|---|
| 按需注入 `lazyCodeLoading: requiredComponents` | TTFB（注入耗时） | 《首屏渲染优化》第 1 条 | ✅ 已开 |
| 首屏 4 个接口并发发出 | 加载延迟 | 第 5 条：在 `onLoad` 或更早发起 | ✅ 已做 |
| 图片走 CDN + 按展示尺寸下发 | 加载时间 | web.dev：CDN 缩短传输距离，同时减小体积 | ✅ 已做 |
| 图片本地文件缓存，命中即跳过下载 | 加载时间（归零） | 第 6 条：优先从缓存渲染 | ✅ 已做 |
| 骨架屏 | 呈现延迟（改的是感知） | 第 7 条 | ✅ 已做 |

### 3.3 还没用上的（按预期收益排序）

| # | 手段 | 怎么实现（被问到就答这句） | 压哪一段 | 依据 | 为什么值得做 |
|---|---|---|---|---|---|
| 1 | **拆掉首屏请求的串行等待** | 把 `/post/list/all`、`/info/banner` 这些不依赖登录态的请求，从 `token_checked` 的回调里挪到页面 `onLoad` 直接发；登录态回来后再按需补 token 重试或增量刷新，而不是串行等它 | 加载延迟 | 第 5 条 | 首屏 4 个请求现在全排在登录态校验之后，白白多等一个 RTT |
| 2 | **首屏数据先读本地缓存渲染** | 请求成功后把 `post_list` 连同一个时间戳写进 `wx.setStorageSync`；下次 `onLoad` 先读缓存直接 `setData` 渲染，同时照常发请求，回来再覆盖，并加一个过期时间（如 5 分钟）防止内容太旧 | 加载延迟 | 第 6 条 | 图片做了缓存，列表数据还没做；有缓存时首屏数据几乎零等待 |
| 3 | **主包瘦身 / 独立分包** | 在 `app.json` 里配 `subpackages`，把设置、关于、历史记录这类低频页面挪出主包；自定义组件只在真正用到的页面里 `usingComponents` 声明，让主包只留首页 + tabBar 四个页面 | TTFB（下载） | 《代码包体积优化》 | 21 个页面全在主包，主包体积直接决定下载 + 注入耗时 |
| 4 | **初始渲染缓存 `initialRenderingCache`** | 在首页 `json` 里加 `"initialRenderingCache": "static"`（全局则配在 `app.json` 的 `window` 里），并把骨架结构做成 `data` 的默认值——它缓存的正是「初始 data 的渲染结果」，非首次启动时视图层不等逻辑层就能把它显示出来 | TTFB + 呈现延迟 | 第 2 条（2.11.1+） | 非首次启动时视图层不等逻辑层，直接出渲染结果 |
| 5 | **分包预下载 `preloadRule`** | 在 `app.json` 里配 `preloadRule`：key 写触发页面（如 `pages/home/home`），value 里指定 `packages`（要预下载的分包 root）和 `network`（写 `all` 就不限网络） | 加载延迟 | 《分包预下载》（2.3.0+） | 进首页时就预下载后续可能进入的分包 |
| 6 | **精简首屏 data** | 把 `theme`、`statusbar_height`、`theme_mode` 这类只在 JS 里用、WXML 并不绑定的字段从 `data` 里移出去（挂到 `this` 或全局），`data` 只留模板真正渲染的字段 | 呈现延迟 | 第 4 条 | 与渲染无关的字段不该放 data，白白增加跨线程传输量 |
| 7 | **数据预拉取** | 管理后台「开发设置 - 数据预加载」里配好下载地址，`App.onLaunch` 调 `wx.getBackgroundFetchData({ fetchType: 'pre' })` 取微信提前拉好的数据（接口返回需 ≤256KB），拿到就直接渲染首屏 | 加载延迟（整段消除） | 《数据预拉取》 | 微信后台在冷启动时就发起请求，数据随代码包一起到 —— 见第五节 |

> 上表第 1、2、6 条都是本项目里**对着源码就能指出来的**：首屏请求被 `token_checked` 串行阻塞、图片有缓存而列表数据没有、`data` 里混着与渲染无关的字段。这三条最容易被面试官追问「那你为什么不改」，所以要么补上，要么准备好解释。

---

## 四、数据回收与 AA 实验

### 4.1 先看性能指标有没有真的变好

| 指标 | 采集口径 | 看什么 |
|---|---|---|
| 首屏渲染 | `firstRender.duration` | P50 / P90 |
| FCP / LCP | `startTime` | P50 / P90 |
| 启动总耗时 | `appLaunch.duration` | 确认没有回退 |
| 接口耗时 | `profile` 的 `ttfb` / `total` | 缓存命中率、TTFB 分布 |

**按机型档位分开看，且主要看 P90**——均值会被高端机拉平，而低端机和长尾用户才是流失的主要来源。

### 4.2 再看对用户的影响：到达率

微信官方《启动性能》给的定义：

> **到达率 = 「首页渲染完成」次数 ÷ 「小程序启动」次数**（也叫 PV 打开率）
> `流失率 = 1 - 到达率`

这个指标的好处是它直接对应「用户有没有等到页面出来」：启动越快 → 白屏越短 → 中途退出的人越少 → 到达率越高。

再配合看几个业务指标：首屏帖子曝光数、首屏停留时长、次日留存。

### 4.3 AA 实验：先证明「没有变化就是没有变化」

上 AB 之前先跑 AA——两组用同一套策略。如果 AA 都跑出显著差异，说明分流有问题（SRM），那后面 AB 的结论都不可信。

- **周期**：7 天，覆盖完整一周，消除周内效应（周末和工作日的用户不一样）
- **分流**：按**用户维度**而不是请求维度——性能改动影响的是用户体验，同一个用户要稳定落在同一组
- **AA 阶段看**：分流比例是否符合预期、核心指标有没有显著差异

### 4.4 一个必须避开的坑：幸存者偏差

性能优化有个特殊之处：**表现差的用户已经流失了，不会出现在第二天的数据里**。

所以不能只看「留下来的人」的指标——性能变好后，原本会流失的用户留下来了，他们本来停留就短，反而可能把均值拉低。应对办法：

- 实验周期内按用户去重，再看留存
- 重点看「到达率」这类与流失直接相关的指标，而不是只盯停留时长均值

### 4.5 确认有效后再灰度放量

不一次推全。先看小众机型 / 小流量，观察稳定性，再逐步放大到全量——小程序管理后台本身就支持配灰度比例。

---

## 附：需要你确认的事实

| # | 待确认 | 影响 |
|---|---|---|
| 1 | 项目的基础库最低版本能否支持 `firstContentfulPaint`（2.21.2）/ `largestContentfulPaint`（2.23.1）/ `downloadPackage`（2.24.0） | 不支持的话对应指标只能讲成「已接入但覆盖不全」 |
| 2 | `wx.request` 的 `profile` 是否真的采集并上报过；若没有，讲成「设计并验证过方案」 | 否则被问「你们线上数据长什么样」会露 |
| 3 | 自建上报接口的路径 `/monitor/report` 为占位 | 换成真实约定 |
| 4 | 长列表虚拟化（`recycle-view` + 固定 `itemSize`）与图片走 CDN：源码当前是 `wx:for` 全量渲染、图片直连源站 | 若线上未落地，讲成「方案已定、灰度中」，别说成已全量上线 |
| 5 | 到达率 / AA 实验是否真跑过 | 没跑过就讲成「设计好的回收方案」，别报具体提升数字 |
| 6 | 第二章的 Trace 瀑布、真机 FPS 曲线、`setData` 代理统计是否真的用过 | 没用过就把 2.3 / 2.4 讲成「排查思路」，用「按这个思路会在瀑布上看到……」的句式，别讲成「我当时在面板上看到」 |
| 7 | 第二章的每一条结论是否都能对回源码（`token_checked` 串行、`wx:for` 全量、阈值 3000） | 三条都由源码可证，这三条可以放心讲；其余带具体耗时的表述要降级成「量级」 |
