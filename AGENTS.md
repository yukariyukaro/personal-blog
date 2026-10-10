<!-- OPENSPEC:START -->
# OpenSpec Instructions

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
项目本地环境为Windows。
Always respond in Chinese

## Web 端改动必须做移动端适配（强制）

改动 `apps/web` 下的任何 UI（组件、样式、页面结构、媒体资源）时：

1. **先读** [apps/web/.trae/rules/responsive-design.md](apps/web/.trae/rules/responsive-design.md)，按其断点口径、组件三档行为映射与反模式清单执行。
2. **不新增断点**：宽度媒体查询与 JS 判断只允许 `768 / 1024 / 1440px`；`1180 / 1200px` 为已登记的历史遗留，禁止扩散。
3. **一改三档**：改动必须覆盖 `390 / 834 / 1440`，不允许只调桌面端后交付；不得引入横向滚动。
4. **改完必跑**：

   ```bash
   cd apps/web
   pnpm run check:responsive                            # 静态守卫：断点 / px 字号 / 固定宽度 / 内联尺寸
   pnpm exec playwright test blog-responsive.spec.ts    # 三档视口契约（1440 / 834 / 390）
   ```

   Web 验证以 Playwright E2E 为主，不默认做人工视觉验收或批量读截图；AI 默认只读运行产出的 `output/e2e-report/summary.md`。覆盖义务与产物契约见 [docs/agents/e2e-testing.md](docs/agents/e2e-testing.md)，测试筛选、并发与收尾规则见 [docs/agents/verification-workflow.md](docs/agents/verification-workflow.md)。

5. 新增组件或页面时，在响应式规范文档的「组件响应式行为映射」表中补一行；若引入了新的布局结构，在 `tests/e2e/blog-responsive.spec.ts` 的 `响应式契约` 中补对应断言。

## 上下文知识库（按需读取）

无法从代码直接读出的项目知识沉淀在 `docs/agents/`：

- [docs/agents/frontend-structure.md](docs/agents/frontend-structure.md) —— 组件归属、页面目录槽位分级、CSS 三级停放、ViewModel 的 hook / 纯函数二分。**改目录、加组件、抽 hook 前必读。**
- [docs/agents/design-system.md](docs/agents/design-system.md) —— 视觉基准、正文/辅助字号底线、卡片缩放补偿、对比与可读性验收。**改 Web UI 或样式前必读；不能为构图缩小文字。**
- [docs/agents/e2e-testing.md](docs/agents/e2e-testing.md) —— E2E 覆盖义务、有效测试标准、设备矩阵、产物与 AI 阅读契约（`output/e2e-report/summary.md`）。**写用例、补交互、做验收前必读。**
- [docs/agents/verification-workflow.md](docs/agents/verification-workflow.md) —— 测试筛选、变更复验、子代理结束条件与上下文成本；Playwright 为主，不默认人工视觉验收。**要跑测试或派发子代理前必读。**
