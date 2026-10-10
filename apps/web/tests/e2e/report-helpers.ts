import type { Page, TestInfo } from '@playwright/test'
import { checkpointFile } from '../reporters/artifacts'

type CheckpointOptions = {
  /** 需要看到完整内容时开启；默认只截当前视口，避免产物体积失控。 */
  fullPage?: boolean
}

/**
 * 在关键节点采集一张定名截图，并作为附件挂到用例上。
 *
 * 报告只记录路径，不内联图片：截图是定点证据，AI 按需读取，
 * 不应为了「看整体」把整页大图读进上下文。
 */
export async function captureCheckpoint(
  page: Page,
  testInfo: TestInfo,
  name: string,
  options: CheckpointOptions = {},
) {
  await page.evaluate(() => document.fonts.ready)
  const path = checkpointFile(testInfo.project.name, name)
  await page.screenshot({
    path,
    animations: 'disabled',
    fullPage: options.fullPage ?? false,
  })
  await testInfo.attach(`checkpoint:${name}`, { path, contentType: 'image/png' })
}
