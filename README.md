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
└── 吃葱.webp         # Loading 动画图片
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