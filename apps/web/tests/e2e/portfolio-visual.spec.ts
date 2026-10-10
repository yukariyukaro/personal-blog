import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await expect.poll(() => page.locator('.portfolio-stage').evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0)
  await expect.poll(() => page.locator('.portfolio-stage img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true)
}

test('作品页三档视觉证据', async ({ page }, testInfo) => {
  test.skip(process.env.PORTFOLIO_SCREENSHOTS !== '1', '仅在显式生成视觉证据时运行')
  const output = resolve(process.cwd(), '../../output/portfolio-redesign')
  await mkdir(output, { recursive: true })
  const size = String(page.viewportSize()!.width)
  const capture = async (name: string) => {
    await settle(page)
    const path = resolve(output, `${size}-${name}.png`)
    await page.screenshot({ path, fullPage: true, animations: 'disabled' })
    await testInfo.attach(`${size}-${name}`, { path, contentType: 'image/png' })
  }

  await page.goto('/#/Portfolio')
  await expect(page.locator('#global-loading')).toHaveCount(0)
  await page.mouse.move(0, 0)
  await capture('closed')
  const activeCard = page.locator('.portfolio-card.is-active')
  await activeCard.focus()
  await expect(activeCard).toHaveAttribute('data-expanded', 'true')
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture('expanded')
  await activeCard.click()
  await expect(page.locator('#portfolio-detail-title')).toHaveText('Triple Uni')
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture('detail-community')
  await page.getByRole('button', { name: '下一个项目', exact: true }).click()
  await expect(page.locator('#portfolio-detail-title')).toHaveText('2025年度总结')
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture('detail-report')
  await page.getByRole('button', { name: '下一个项目', exact: true }).click()
  await expect(page.locator('#portfolio-detail-title')).toHaveText('愚公迁移工具')
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture('detail-geometric')
})
