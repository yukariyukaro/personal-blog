import { expect, test } from '@playwright/test'
import { captureCheckpoint } from './report-helpers'

/**
 * 验收截图：只负责在关键节点留下定名证据，供 Markdown 验收报告引用。
 * 行为正确性由各行为 spec 负责，这里不做布局断言，避免与响应式契约重复。
 */

test.describe('验收截图', () => {
  test('首页首屏与文章区', async ({ page }) => {
    await page.goto('/#/Home')
    await expect(page.locator('#global-loading')).toHaveCount(0)
    await expect(page.locator('.home-panel')).toHaveAttribute('data-entrance-ready', 'true')
    await expect(page.locator('.home-page__hero')).toBeInViewport()
    await captureCheckpoint(page, test.info(), '首页-首屏')

    await page.locator('.home-archive-heading__title').scrollIntoViewIfNeeded()
    await expect(page.locator('.home-archive-heading__title')).toBeInViewport()
    await captureCheckpoint(page, test.info(), '首页-文章区')
  })

  test('作品目录、详情与原创封面回退', async ({ page }) => {
    await page.goto('/#/Portfolio')
    await expect(page.locator('#global-loading')).toHaveCount(0)
    await expect(page.locator('.portfolio-stage')).toHaveAttribute('data-phase', 'idle')
    await captureCheckpoint(page, test.info(), '作品-目录态')

    await page.locator('.portfolio-directory__item').nth(0).click()
    await expect(page.locator('#portfolio-detail-title')).toHaveText('Triple Uni')
    await captureCheckpoint(page, test.info(), '作品-详情-真实图片')

    await page.getByRole('button', { name: '下一个项目', exact: true }).click()
    await expect(page.locator('.portfolio-details')).toHaveAttribute('data-image-type', 'portrait')
    await captureCheckpoint(page, test.info(), '作品-详情-竖图')

    await page.getByRole('button', { name: '返回档案', exact: true }).click()
    await expect(page.locator('.portfolio-stage')).toHaveAttribute('data-phase', 'idle')
    await page.locator('.portfolio-directory__item').nth(2).click()
    await expect(page.locator('.portfolio-details')).toHaveAttribute('data-image-type', 'graphic')
    await captureCheckpoint(page, test.info(), '作品-详情-原创封面')
  })

  test('介绍页、文章页与未找到页', async ({ page }) => {
    await page.goto('/#/Information')
    await expect(page.locator('#global-loading')).toHaveCount(0)
    await expect(page.locator('.intro-panel__text').first()).toBeVisible()
    await captureCheckpoint(page, test.info(), '介绍页')

    await page.goto('/#/Post/abstraction')
    await expect(page.locator('.markdown-body')).toBeVisible()
    await captureCheckpoint(page, test.info(), '文章页-正文')

    await page.goto('/#/missing-page')
    await expect(page.locator('.not-found-file')).toBeVisible()
    await captureCheckpoint(page, test.info(), '未找到页')
  })
})
