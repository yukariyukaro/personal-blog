import { expect, test } from '@playwright/test'
import { siteProfile } from '../src/config/siteProfile'
import { openReadyBlog } from './blog-test-helpers'

test.describe('主题契约', () => {
  test('首次跟随系统且只持久化用户选择', async ({ page }) => {
    await page.emulateMedia({
      colorScheme: 'light',
      reducedMotion: 'reduce',
    })
    await openReadyBlog(page)

    const root = page.locator('html')
    const themeButton = page.getByRole('button', { name: /切换到/ }).first()
    await expect(root).toHaveAttribute('data-theme', 'light')
    expect(
      await page.evaluate(() => window.localStorage.getItem('blog-theme')),
    ).toBeNull()
    expect(
      await page.locator('body').evaluate(
        (element) => getComputedStyle(element).transitionDuration,
      ),
    ).toBe('0s')
    expect(
      await themeButton.evaluate(
        (element) => getComputedStyle(element).transitionDuration,
      ),
    ).toBe('0s')

    await themeButton.click()
    await expect(root).toHaveAttribute('data-theme', 'dark')
    expect(
      await page.evaluate(() => window.localStorage.getItem('blog-theme')),
    ).toBe('dark')

    await page.reload()
    await expect(root).toHaveAttribute('data-theme', 'dark')
  })

  test('localStorage 不可写时在当前会话保持用户选择', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Storage.prototype, 'setItem', {
        configurable: true,
        value: () => {
          throw new Error('storage unavailable')
        },
      })
    })
    await page.emulateMedia({ colorScheme: 'light' })
    await openReadyBlog(page)

    const root = page.locator('html')
    await page.getByRole('button', { name: /切换到/ }).first().click()
    await expect(root).toHaveAttribute('data-theme', 'dark')

    await page.evaluate(() => {
      window.location.hash = '#/Information'
    })
    await expect(page).toHaveURL(/\/#\/Information$/)
    await expect(root).toHaveAttribute('data-theme', 'dark')
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
