import { expect, test } from '@playwright/test'
import { siteProfile } from '../../src/config/siteProfile'
import { openReadyBlog } from './blog-test-helpers'

test.describe('编辑器主题契约', () => {
  test('编辑器内切换主题仅作用于编辑器并持久化', async ({ page }) => {
    await page.goto('/#/Editor')
    await expect(page.locator('.md-workspace')).toBeVisible()

    const root = page.locator('html')
    const workspace = page.locator('.md-workspace')
    const themeButton = page.getByRole('button', { name: /切换到/ }).first()

    await expect(workspace).toHaveAttribute('data-editor-theme', 'dark')
    expect(
      await page.evaluate(() => window.localStorage.getItem('md-editor-theme')),
    ).toBeNull()

    await themeButton.click()
    await expect(workspace).toHaveAttribute('data-editor-theme', 'light')
    expect(
      await page.evaluate(() => window.localStorage.getItem('md-editor-theme')),
    ).toBe('light')
    // 站点唯一样式来源是黑夜主题：编辑器切换不得写入 html 的 data-theme。
    expect(await root.getAttribute('data-theme')).toBeNull()

    await page.reload()
    await expect(workspace).toHaveAttribute('data-editor-theme', 'light')
  })
})

test.describe('站点资料契约', () => {
  test('首页侧栏和介绍页统一读取可选站点资料', async ({ page }) => {
    await openReadyBlog(page)

    await expect(
      page
        .getByRole('complementary', { name: '作者信息' })
        .getByRole('heading', { name: siteProfile.name }),
    ).toBeVisible()
    if (siteProfile.email) {
      await expect(
        page.getByRole('button', { name: '复制邮箱' }),
      ).toBeVisible()
    }

    await page.goto('/#/Information')

    await expect(
      page.getByRole('heading', { name: siteProfile.name }),
    ).toBeVisible()
    if (siteProfile.originDescription) {
      await expect(page.getByText(siteProfile.originDescription)).toBeVisible()
    }
    if (siteProfile.bio) {
      await expect(page.getByText(siteProfile.bio)).toBeVisible()
    }
    if (siteProfile.githubUrl) {
      await expect(
        page.getByRole('link', { name: 'GitHub' }),
      ).toHaveAttribute('href', siteProfile.githubUrl)
    }
    if (siteProfile.bilibiliUrl) {
      await expect(
        page.getByRole('link', { name: 'Bilibili' }),
      ).toHaveAttribute('href', siteProfile.bilibiliUrl)
    }
    if (siteProfile.email) {
      await expect(
        page.getByRole('button', { name: '复制邮箱' }),
      ).toBeVisible()
    }
    await expect(
      page.getByRole('button', { name: /QQ|Copy QQ/ }),
    ).toHaveCount(0)
  })
})
