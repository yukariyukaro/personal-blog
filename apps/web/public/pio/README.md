# Live2D 资源说明

本目录仅保留 NOIR 模型资源，渲染脚本使用固定版本的 jsDelivr 资源，仅在用户主动开启 Live2D 后按需加载。

- l2d-widget 0.1.2: https://cdn.jsdelivr.net/npm/l2d-widget@0.1.2/dist/index.min.js
- Pio: https://github.com/Dreamer-Paul/Pio
- Live2D Cubism SDK: https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html
- 参考实现：`blog-content/Mizuki/src/components/features/pio/Pio.astro`

默认页面不会请求这些资源，移动端也默认隐藏模型。
