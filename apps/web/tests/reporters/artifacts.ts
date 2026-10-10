/**
 * 验收产物的路径约定，由截图 helper 与报告 reporter 共用，避免两处各写一份而漂移。
 * 全部相对 `apps/web`（即 Playwright 的运行目录）。
 */

export const REPORT_DIR = 'output/e2e-report'

export const CHECKPOINT_DIR = `${REPORT_DIR}/screenshots`

/** 关键节点截图的稳定路径（报告按此路径引用，不使用 Playwright 附件副本的哈希名）。 */
export const checkpointFile = (projectName: string, name: string) =>
  `${CHECKPOINT_DIR}/${projectName}/${name}.png`
