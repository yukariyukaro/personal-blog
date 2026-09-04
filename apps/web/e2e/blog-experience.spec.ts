import { expect, test } from '@playwright/test'

test.describe('博客核心体验', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/Home')
    await expect(
      page.getByRole('region', { name: '博客内容', exact: true }),
    ).toBeVisible()
  })

  test('支持主题切换并保持页面可用', async ({ page }) => {
    const themeButton = page.getByRole('button', { name: /切换到/ }).first()
    const before = await page.locator('html').getAttribute('data-theme')

    await themeButton.click()

    const after = await page.locator('html').getAttribute('data-theme')
    expect(after).not.toBe(before)
    await expect(page.getByRole('searchbox', { name: '搜索文章' })).toBeVisible()
  })

  test('缺少封面时不渲染文章图片区域', async ({ page }) => {
    await expect(page.locator('.featured-article').first()).toBeVisible()
    await expect(page.locator('.featured-article__cover')).toHaveCount(0)
    await expect(page.locator('.blog-sidebar--right .image-card')).toHaveCount(0)
  })

  test('搜索只展示匹配文章', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: '搜索文章' })
    await search.fill('SSE')

    await expect(
      page.getByRole('button', { name: /Server-Sent Events/ }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /抽象是什么/ }),
    ).toHaveCount(0)
  })

  test('文章目录点击不会破坏 Hash Router', async ({ page }) => {
    await page.getByRole('button', { name: /抽象是什么/ }).first().click()
    const toc = page.getByRole('complementary', { name: '文章目录' })
    await expect(toc).toBeVisible()

    const currentUrl = page.url()
    await toc.getByRole('link', { name: '一、为什么抽象是编程的基石' }).click()

    expect(page.url()).toBe(currentUrl)
    await expect(
      page.getByRole('heading', { name: '一、为什么抽象是编程的基石' }),
    ).toBeInViewport()
  })

  test('文章可以通过 URL 直接恢复', async ({ page }) => {
    await page.goto('/#/Home?post=server-sent-events')

    await expect(
      page.getByRole('heading', { name: 'Server-Sent Events' }).last(),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: '复制文章链接' }),
    ).toBeVisible()
  })

  test('非法文章参数不会显示其他正文', async ({ page }) => {
    await page.goto('/#/Home?post=missing-article')

    await expect(page).toHaveURL(/\/#\/Home\?post=missing-article$/)
    await expect(
      page
        .locator('.blog-article-grid')
        .getByRole('heading', { name: '抽象是什么' }),
    ).toBeVisible()
    await expect(page.locator('#blog-document-title')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: '复制文章链接' }),
    ).toHaveCount(0)
  })

  test('浏览器后退会恢复默认文章', async ({ page }) => {
    const documentTitle = page.locator('#blog-document-title')
    await expect(documentTitle).toHaveText('抽象是什么')

    await page
      .locator('.blog-article-grid')
      .getByRole('heading', { name: 'Server-Sent Events' })
      .click()
    await expect(page).toHaveURL(/\/#\/Home\?post=server-sent-events$/)
    await expect(documentTitle).toHaveText('Server-Sent Events')

    await page.goBack()

    await expect(page).toHaveURL(/\/#\/Home$/)
    await expect(documentTitle).toHaveText('抽象是什么')
  })

  test('首屏过渡层可见，Live2D 默认按需开启', async ({ page }) => {
    test.skip(test.info().project.name === 'mobile-chromium', '移动端默认隐藏 Live2D')
    const wave = page.locator('.home-page__waves')
    await expect(wave).toBeVisible()
    const waveStyle = await wave.locator('use').first().evaluate((element) => ({
      animationName: getComputedStyle(element).animationName,
      height: element.closest('svg')?.getBoundingClientRect().height ?? 0,
      isInsideHero: Boolean(element.closest('.home-page__hero')),
    }))
    expect(waveStyle.animationName).toBe('home-wave')
    expect(waveStyle.height).toBeGreaterThanOrEqual(140)
    expect(waveStyle.isInsideHero).toBe(true)
    const scrollIndicator = page.locator('.scroll-indicator')
    await expect(scrollIndicator).toBeVisible()
    const [waveZIndex, scrollZIndex] = await Promise.all([
      wave.evaluate((element) => Number(getComputedStyle(element).zIndex)),
      scrollIndicator.evaluate((element) => Number(getComputedStyle(element).zIndex)),
    ])
    expect(scrollZIndex).toBeGreaterThan(waveZIndex)
    const readerBackground = await page.locator('.blog-reader').evaluate((element) =>
      getComputedStyle(element).backgroundImage,
    )
    expect(readerBackground).toContain('information/background.webp')
    await expect(
      page.locator('iframe[title="Live2D 看板娘"]'),
    ).toHaveCount(0)

    await page.getByRole('button', { name: '开启 Live2D 看板娘' }).click()
    await expect(
      page.getByRole('button', { name: '关闭 Live2D 看板娘' }),
    ).toBeVisible()
    await expect(
      page.locator('iframe[title="Live2D 看板娘"]'),
    ).toHaveCount(0)
    const canvas = page.locator('body > div > canvas')
    await expect(canvas).toHaveCount(1)
    await expect(canvas).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  })

  test('支持标签筛选和相关文章推荐', async ({ page }) => {
    const aiTag = page.getByRole('button', { name: /#\s*AI 2/ })
    await expect(aiTag).toBeVisible()
    await aiTag.click()
    await expect(
      page.getByRole('button', { name: /AI 时代的知识价值/ }).first(),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /抽象是什么/ }),
    ).toHaveCount(0)

    await page.getByRole('button', { name: '全部' }).click()
    await page.getByRole('button', { name: /抽象是什么/ }).first().click()
    await expect(
      page.getByRole('region', { name: '继续阅读' }),
    ).toBeVisible()
  })
})

test('移动端菜单展示站点导航', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/Home')

  await page.getByRole('button', { name: '打开导航菜单' }).click()
  await expect(
    page.getByRole('button', { name: '关闭导航菜单' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'INFORMATION 介绍' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'PORTFOLIO 作品' })).toBeVisible()
})
