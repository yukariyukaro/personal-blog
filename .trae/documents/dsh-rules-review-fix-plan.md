# DSH Rules 审查问题修复计划

## Summary

修复 `dsh-rules` 0.2.0 重写后经官方 Harness/Desktop 对照审查确认的 7 个问题。

目标：

- 规则更新在模型侧具有明确的完整替换语义。
- File Glob 只允许工作区内路径触发。
- 保留成功子工具的文件触达，即使外层复合工具失败。
- scope 切换期间不展示或提交旧 target 数据。
- Git 源码安装能生成 `exports.types` 所需的声明文件。
- 不存在的嵌套规则以 404/not-found 返回。
- 保持当前四种规则模式、渐进式披露、loopback API、UI 布局和 0.2.0 兼容边界。

本次只修复已确认问题，不引入 Typert Remote、URL 导入、远程 `ctx.fs` CRUD 或 UI 视觉重设计。

## Current State

当前工作区是 `dsh-rules` 的 0.2.0 重写版本，业务代码已经拆分为：

```text
src/context.ts                 模型上下文与 rule 工具
src/host/context-controller.ts 工具触达聚合
src/host/repository.ts         本地规则仓储
src/client/store.ts             Client 异步状态
package.json / tsdown.*         构建与 Git prepare
```

已确认的基线验证：

- `pnpm check` 当前可以通过。
- 真实 `dsh web` Playwright 创建规则可以通过。
- 无 `lib` 源码执行 `prepare` 后可以生成 JS，但没有 `lib/types/*.d.ts`。
- 当前测试没有覆盖规则更新后的模型最终可见内容、绝对路径越界、scope 切换并发、Git prepare 声明产物和嵌套不存在路径。

## Issues And Evidence

### 1. 更新消息没有真正表达完整替换

**问题位置**

- [`src/context.ts:109-150`](file:///Users/bytedance/dsh/dsh-rules/src/context.ts#L109-L150)
- [`src/context.ts:368-399`](file:///Users/bytedance/dsh/dsh-rules/src/context.ts#L368-L399)
- 官方 Agent Loop 在 `packages/core/agent-loop/src/agent.ts` 中始终以 `surfaceOp: 'append'` 追加 pre-step 消息。

**如何确认**

使用一个 Always 规则：

1. 第一次 pre-step 写入 `OLD_RULE`。
2. 修改文件为 `NEW_RULE`。
3. 再次 pre-step。
4. 将两次 decision 按真实 Agent Loop 方式追加到 Session。
5. 检查 `agent.session.deriveMessages()`。

当前结果同时包含 `OLD_RULE` 和 `NEW_RULE`，且更新 source 上的 `update: true` 不会被 Agent Loop 自动解释为 surface replacement。

官方 `dsh-tool-skill` 的参考行为是生成完整替换文案，例如：

```text
The available skill catalog changed. This complete catalog replaces every earlier available-skills list in this session:
```

**根因**

`source.update` 只是持久化 source 字段，当前模型消息投影没有读取该字段；更新正文仍是普通追加消息，也没有要求模型忽略旧规则。

**修改方案**

修改 `src/context.ts`：

1. 保留 `update: true` 作为结构化 source 元数据。
2. 为 `rules-always` 增加 `renderAlwaysUpdate()`：
   - 明确说明这是完整规则集替换。
   - 明确说明早先规则不再适用。
   - 包含当前完整 Always 规则正文。
3. 为 `rules-catalog` 复用官方 skill catalog 的替换语义：
   - 当前 catalog 是完整列表。
   - 模型只使用当前列表，不使用早先 catalog 中的 ID。
4. 空列表更新必须是 tombstone 文案，明确声明此前规则全部失效。
5. 将 replacement 文案纳入 `maxContextBytes` 计算。
6. 不尝试伪造 Agent Loop 的 `surfaceOp`，因为普通插件无法改变 Loop 的统一 append 语义。

**测试**

在 `test/plugin.test.ts` 增加真实 Session 测试：

- 旧 Always 与新 Always 同时存在于 durable log 时，最终模型消息包含 replacement 指令。
- 删除 Always 后，最终消息明确声明旧规则失效。
- Catalog 增加、删除和变更都包含完整 replacement 文案。
- 测试断言最终消息行为，不只断言 `source.update`。

### 2. workspace 外绝对路径会错误命中项目 File Glob

**问题位置**

- [`src/context.ts:279-287`](file:///Users/bytedance/dsh/dsh-rules/src/context.ts#L279-L287)
- [`src/domain/matcher.ts:61-72`](file:///Users/bytedance/dsh/dsh-rules/src/domain/matcher.ts#L61-L72)

**如何确认**

执行：

```ts
const cwd = '/workspace/project'
const path = mentionedWorkspacePaths('`/tmp/foreign.ts`', cwd)[0] ?? '/tmp/foreign.ts'
matchRuleGlobs(
  { mode: 'file', description: '', globs: ['**/*.ts'], body: '' },
  path,
)
```

当前结果为 `true`。

原因是 `mentionedWorkspacePaths()` 对越界路径返回空数组，但调用方使用：

```ts
const candidate = mentionedWorkspacePaths(...)[0] ?? path
```

从而把原始绝对路径重新送入 glob 匹配。

**修改方案**

修改 `src/context.ts`：

1. 将触达路径转换为 workspace-relative 的独立函数。
2. 对绝对路径：
   - 先 `resolve(cwd, path)`。
   - 用 `relative(cwd, resolved)` 检查 `..` 和绝对结果。
   - 越界直接跳过，不返回原始路径。
3. 对相对路径也执行同一 containment 检查。
4. File Glob 匹配只接收规范化后的 workspace-relative POSIX 路径。
5. 去掉 `?? path` 回退。

**测试**

在 `test/rules.test.ts` 或新增 `test/context-matcher.test.ts`：

- `/tmp/foreign.ts` 不命中项目 `**/*.ts`。
- `../foreign.ts` 不命中。
- `/workspace/project/src/a.ts` 命中 `src/**/*.ts`。
- `src/a.ts` 命中。
- Windows 风格分隔符不会绕过 containment。

### 3. 外层工具失败会丢失成功子工具触达

**问题位置**

- [`src/host/context-controller.ts:28-42`](file:///Users/bytedance/dsh/dsh-rules/src/host/context-controller.ts#L28-L42)

**如何确认**

构造工具执行树：

```text
root run_code
└── child read file.ts       成功
root run_code                 失败
```

当前 `recordResult()` 在看到根调用 `result.isError` 时立即 `return`，此前聚合到 `executionTouches[root]` 的 child touch 被丢弃。

官方 `agent-instructions` 的 `tools/result` 处理只排除失败调用自身路径，仍将已聚合的成功子调用 touch 向父级传播。

**修改方案**

修改 `src/host/context-controller.ts`：

1. 先读取并删除当前 token 的已聚合 touches。
2. 当前执行自身路径只有在当前执行成功且未 abort 时加入。
3. 无论当前执行是否失败，只要存在 `parent`，都把已有 touches 继续传给 parent。
4. 只有到达根 token 时，才将成功子调用 touches 提交到 `pending`。
5. 当前根执行失败只阻止根自身路径提交，不阻止成功子调用路径提交。

**测试**

修改现有 `test/rules.test.ts` 中失败根工具测试：

- 成功 child read + 失败 root → 保留 child path。
- 失败 child read + 成功 root → 不加入 child path。
- abort 的 child/root → 不加入 pending。
- 深度大于 2 的 nested Code Mode touch 仍能聚合到根。

### 4. scope 切换期间继续展示旧规则

**问题位置**

- [`src/client/store.ts:50-76`](file:///Users/bytedance/dsh/dsh-rules/src/client/store.ts#L50-L76)
- [`src/client/RulesSection.tsx:101-118`](file:///Users/bytedance/dsh/dsh-rules/src/client/RulesSection.tsx#L101-L118)

**如何确认**

使用两个延迟响应：

1. 加载 global，返回规则 `global:a.md`。
2. 切换 project，project 请求尚未完成。
3. 检查 UI。

当前 `load(project)` 只更新 `status`、`error`、`target`，不清空 `directory` 和 `rules`。`RulesSection` 在 `snapshot.rules.length > 0` 时会继续渲染旧列表，因此 project tab 短暂显示 global 规则；如果 project 请求失败，旧规则会继续保留。

**修改方案**

修改 `src/client/store.ts`：

1. 将 `target`、`directory`、`rules` 视为同一个 snapshot。
2. `load(target)` 开始时：
   - 若 target 与当前 target 不同，清空 `directory` 和 `rules`。
   - 设置 `status: 'loading'`。
3. 旧 target 的成功/失败响应不得提交。
4. 失败时只保留同一 target 的上一份数据；不同 target 失败必须保持空列表。
5. `RulesSection` 在 loading 且没有当前 target 数据时只显示 loading，不允许编辑旧行。

**测试**

在 `test/rules.client.test.ts` 增加：

- global 已加载后切换 project，立即断言 `rules=[]`、`directory=null`。
- project 请求延迟期间 global 响应晚到，不污染 project。
- project 请求失败时不显示 global 规则。
- scope 切换后创建/编辑按钮使用新 target。

### 5. 旧 mutation 失败污染新 target

**问题位置**

- [`src/client/store.ts:107-139`](file:///Users/bytedance/dsh/dsh-rules/src/client/store.ts#L107-L139)
- [`src/client/store.ts:152-184`](file:///Users/bytedance/dsh/dsh-rules/src/client/store.ts#L152-L184)

**如何确认**

1. 在 global 触发一个延迟失败的 save/delete。
2. 在请求完成前切换 project。
3. 观察当前 store。

当前 scope 切换只 abort `loadController`，没有取消 `mutationController`。旧 mutation 的 catch 没有校验 target/controller identity，完成后会把旧错误写入新 project 页面，并可能改变新页面的 `mutation` 状态。

**修改方案**

修改 `src/client/store.ts`：

1. 每次 target 变化时取消当前 mutation controller。
2. 为 mutation 记录 `mutationGeneration` 或完整 target key。
3. mutation 的 `catch`、`finally`、状态提交都必须验证：
   - 当前 controller 仍是该 mutation controller。
   - 当前 store target 与 mutation target 相同。
4. 旧 mutation 若已到达后端但页面已切换，只丢弃其 UI 结果，不回滚后端写入。
5. 新 target 的 `mutation` 初始值必须为 `idle`。

**测试**

在 `test/rules.client.test.ts` 增加：

- 旧 target mutation 延迟失败，切换 target 后 error 不变化。
- 旧 target mutation 完成成功，切换 target 后不触发旧 target reload。
- 新 target mutation 可独立开始。
- controller dispose 后 mutation 不再提交任何状态。

### 6. Git `prepare` 不生成声明文件

**问题位置**

- [`package.json:19-20`](file:///Users/bytedance/dsh/dsh-rules/package.json#L19-L20)
- [`package.json:103-123`](file:///Users/bytedance/dsh/dsh-rules/package.json#L103-L123)
- [`tsdown.prepare.config.ts:1`](file:///Users/bytedance/dsh/dsh-rules/tsdown.prepare.config.ts#L1)
- [`tsdown.config.ts:21-23`](file:///Users/bytedance/dsh/dsh-rules/tsdown.config.ts#L21-L23)

**如何确认**

在不含 `lib/` 的临时源码副本执行：

```sh
pnpm install --frozen-lockfile --offline
```

当前结果：

```text
lib/index.js       存在
lib/context.js     存在
lib/web.js         存在
lib/client.js      存在
lib/types/index.d.ts 不存在
```

但 `package.json` 的所有 `exports.types` 都指向 `lib/types/**/*.d.ts`。

**修改方案**

修改 `package.json`：

```json
{
  "prepare": "tsc -b tsconfig.json tsconfig.client.json && tsdown --config tsdown.prepare.config.ts"
}
```

修改 `tsdown.prepare.config.ts`：

- 保持 bundle 配置不清理 `lib`。
- 让 `tsc -b` 先生成 `lib/types/**/*.d.ts`。

必要时增加独立 `scripts/prepare.mjs`：

1. 执行 Host tsc emit。
2. 执行 Client tsc emit。
3. 执行 tsdown。
4. 检查所有 `exports.types` 文件存在，不存在则非零退出。

正常 `build` 继续保留 `scripts/clean.mjs`，防止旧 hash chunk 被打包；prepare 不删除刚生成的声明。

**测试**

新增 `test/package.test.ts` 或 shell smoke：

- 删除 `lib` 后运行 `pnpm prepare`。
- 检查 `lib/index.js`、`lib/context.js`、`lib/web.js`、`lib/client.js`。
- 检查 `lib/types/index.d.ts`、`context.d.ts`、`web.d.ts`、`contract.d.ts` 和 `client/index.d.ts`。
- 用 Node 读取 `package.json.exports` 并逐项检查 types 文件存在。
- 继续执行 `pnpm pack` 和临时 profile 安装。

### 7. 嵌套不存在规则返回 500 而非 404

**问题位置**

- [`src/host/repository.ts:122-148`](file:///Users/bytedance/dsh/dsh-rules/src/host/repository.ts#L122-L148)
- [`src/host/http-handler.ts:71-76`](file:///Users/bytedance/dsh/dsh-rules/src/host/http-handler.ts#L71-L76)

**如何确认**

执行：

```ts
repository.update(
  { scope: 'global' },
  'global:missing/nested.md',
  'deadbeef' as RuleRevision,
  document,
)
```

当前错误：

```text
ENOENT: no such file or directory, open ".../missing/nested.md.lock"
```

因为 `withFileLock()` 在父目录不存在时先创建 `.lock`，还没进入 `assertTarget()` 的 not-found 分支。

**修改方案**

修改 `src/host/repository.ts`：

1. update/remove 在进入 `withFileLock()` 前先检查目标父目录和目标文件。
2. 目标文件或父目录不存在时直接抛 `RulesError('not-found')`。
3. 保留锁内的二次检查，处理检查后文件被删除的 TOCTOU。
4. `assertTarget()` 的 parent `realpath()` 也必须将 ENOENT 映射为 `not-found`。
5. 不创建 update/remove 的缺失父目录。

修改 `src/host/http-handler.ts`：

- 保持 `not-found → 404`。
- 确保底层 `ENOENT` 不再落入未知异常 500。

**测试**

在 `test/repository.test.ts` 和 `test/http.test.ts` 增加：

- update 不存在顶层规则 → `not-found`/404。
- update 不存在嵌套父目录 → `not-found`/404。
- delete 不存在嵌套规则 → `not-found`/404。
- 已存在父目录但文件被并发删除 → 锁内二次检查返回 404。
- symlink parent 仍返回路径拒绝，不降级为 404。

## Files To Change

```text
src/context.ts
src/domain/matcher.ts
src/host/context-controller.ts
src/client/store.ts
src/client/RulesSection.tsx
src/host/repository.ts
src/host/http-handler.ts
package.json
tsdown.prepare.config.ts
test/plugin.test.ts
test/rules.test.ts
test/rules.client.test.ts
test/repository.test.ts
test/http.test.ts
```

不修改：

- `deepseek-harness`
- `deepseek-harness-desktop`
- 当前规则文件格式
- URL 导入范围之外的产品能力

## Implementation Order

1. 修复 replacement message，并先补真实 Session Log 回归。
2. 修复 workspace path normalization，并补越界路径测试。
3. 修复 nested tool touch 聚合，并更新失败根工具测试语义。
4. 修复 Client target snapshot 和 mutation generation。
5. 修复 repository not-found/lock 顺序。
6. 修复 Git prepare 声明生成和 package smoke。
7. 运行全部单元、集成、构建和真实 Web E2E。
8. 重新运行独立审查候选路径，确认 7 项不再复现。

## Verification

### Focused Reproduction Checks

```sh
pnpm exec tsx --test test/plugin.test.ts
pnpm exec tsx --test test/rules.test.ts
pnpm exec tsx --test test/rules.client.test.ts
pnpm exec tsx --test test/repository.test.ts test/http.test.ts
```

### Full Checks

```sh
pnpm check
pnpm test:e2e
pnpm pack
git diff --check
```

### Prepare/Publish Checks

```sh
rm -rf /tmp/dsh-rules-source-check
rsync -a --exclude node_modules --exclude lib --exclude output --exclude .git ./ /tmp/dsh-rules-source-check/
(cd /tmp/dsh-rules-source-check && pnpm install --frozen-lockfile)
test -f /tmp/dsh-rules-source-check/lib/types/index.d.ts
test -f /tmp/dsh-rules-source-check/lib/types/client/index.d.ts
```

### Acceptance Conditions

- 更新/删除规则后，模型最终消息只遵循最新 replacement 语义。
- workspace 外路径不会触发项目 File Glob。
- 成功 child touch 在根工具失败时仍可用于下一步披露。
- 切 scope 后 UI 不显示旧规则、旧目录、旧错误或旧 mutation 状态。
- Git prepare 生成所有声明文件，`exports.types` 全部可解析。
- 嵌套不存在规则通过 API 返回 404。
- 全部测试通过，且没有新增默认文本掩盖后端契约错误。

## Assumptions And Decisions

- 默认修复全部 7 项，不做部分修复。
- 规则更新继续采用追加式 Session Log，但模型正文必须明确完整替换；不修改 Agent Loop。
- 项目规则继续限定 Host-local workspace。
- 仍不接入 Typert Remote。
- 仍不支持 URL 导入和 Team Rules。
- 维持当前 0.2.0 版本，修复作为同版本未发布前的工作树变更。
