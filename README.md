# 娄宿三's Blog

个人博客，类二次元游戏官网风格。采用高质量图片+视频的二次元美术风格，以初音未来为主题配色。

## 技术栈

- **框架**：React 19 + TypeScript
- **构建工具**：Vite 8
- **路由**：React Router 7 + vite-plugin-pages（文件即路由）
- **UI 组件库**：Radix UI Themes
- **包管理**：pnpm

## 开发命令

```bash
pnpm run dev      # 启动开发服务器
pnpm run build    # 构建生产版本（先执行 tsc 类型检查）
pnpm run lint     # 运行 ESLint 检查
pnpm run preview  # 本地预览生产构建
```

## 项目结构

```
src/
├── components/       # 可复用组件
│   ├── Navbar/       # 顶部毛玻璃导航栏
│   └── EasterEggHint/# 彩蛋提示组件
├── pages/            # 页面路由（vite-plugin-pages）
│   ├── index.tsx     # 根路由重定向
│   ├── [...all].tsx  # 404 页面
│   └── Home/         # 首页
├── utils/            # 工具函数
├── App.tsx           # 布局容器
├── AppBootstrap.tsx  # 启动引导
└── main.tsx          # 应用入口

public/               # 静态资源
├── home/             # 首页背景资源
│   ├── home.webp
│   ├── home_av1.webm
│   └── hls/          # HLS 视频清单与分片
└── loading-chicong.webp # Loading 动画图片
```

## 视觉主题

- **主色**：初音绿 (#39C5BB)
- **风格**：玻璃拟态（glass-morphism）+ 半透明毛玻璃效果
- **字体**：SmileySans（得意黑斜体）via jsDelivr CDN
- **背景**：高质量图片 + AV1 视频渐进加载

## 特性

- 渐进式背景加载（图片优先，视频就绪后平滑切换）
- 全局 Loading 动画
- 响应式设计，移动端适配
- 无障碍支持（`prefers-reduced-motion` 降级、键盘导航）
- GitHub Pages 部署友好（Hash 路由）

## CDN 与 HLS 复用说明

### 1) 静态资源 CDN 逻辑

- 统一入口：`src/utils/baseUrl.ts` 的 `resolvePublicAsset(assetPath)`。
- 开发环境：返回本地 `BASE_URL` 路径，便于本地调试。
- 生产环境：返回 `https://cdn.jsdmirror.com/gh/yukariyukaro/personal-blog@main/public/` 前缀路径。
- 首页 `index.html` 中首屏前需要的资源（favicon、OG 图、Loading 图）使用了硬编码 CDN 链接，以保证 React 挂载前即可命中 CDN。

### 2) 首页视频 HLS 播放逻辑

- 首页视频入口在 `src/pages/Home/index.tsx`：
  - HLS 清单：`home/hls/index.m3u8`
  - 回退文件：`home/home_av1.webm`
- 播放优先级：
  1. Safari / iOS 等支持原生 HLS：`video.canPlayType('application/vnd.apple.mpegurl')`
  2. 其他现代浏览器：使用 `hls.js`（MSE）加载 `.m3u8`
  3. HLS 不可用或发生 fatal error：回退到 `home_av1.webm`

### 3) 分片资源约定

- `public/home/hls/` 必须随仓库部署（含 `index.m3u8`、`init.mp4`、`segment_*.m4s`）。
- 分片文件建议控制在 CDN 限制以内（当前目标为单片 < 20MB）。
- 如果更新源视频，需重新生成 HLS 清单与分片并提交到仓库。

### 4) 当前性能现象说明

- DevTools 中“先完整下载首片再起播”与“同一时间只下载一个切片”在当前配置下是可预期现象。
- 由于首片体积较大，可能占用带宽并影响其它懒加载资源（如后续 panel 图片）。
- 若要进一步优化首屏起播时间，优先方向：
  - 缩短切片时长（如 2s）
  - 降低首片体积（控制首片码率）
  - 使用多码率 HLS（ABR）以适配弱网
