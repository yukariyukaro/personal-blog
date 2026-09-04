import { expect, test, type Page } from '@playwright/test'
import { openReadyBlog } from './blog-test-helpers'

async function expectDesktopLayout(page: Page) {
  const leftSidebar = page.getByRole('complementary', { name: '作者信息' })
  const main = page.locator('.blog-main')
  const rightSidebar = page.getByRole('complementary', { name: '站点信息' })

  await expect(leftSidebar).toBeVisible()
  await expect(main).toBeVisible()
  await expect(rightSidebar).toBeVisible()

  const layout = await page.locator('.blog-dashboard').evaluate((dashboard) => {
    const left = dashboard.querySelector('.blog-sidebar--left')
    const center = dashboard.querySelector('.blog-main')
    const right = dashboard.querySelector('.blog-sidebar--right')
    if (!left || !center || !right) {
      throw new Error('博客三栏结构缺失')
    }

    const leftRect = left.getBoundingClientRect()
    const centerRect = center.getBoundingClientRect()
    const rightRect = right.getBoundingClientRect()
    return {
      display: getComputedStyle(dashboard).display,
      columnCount: getComputedStyle(dashboard).gridTemplateColumns.split(' ').length,
      leftBeforeCenter: leftRect.right <= centerRect.left,
      centerBeforeRight: centerRect.right <= rightRect.left,
    }
  })

  expect(layout).toEqual({
    display: 'grid',
    columnCount: 3,
    leftBeforeCenter: true,
    centerBeforeRight: true,
  })
}

async function expectTabletLayout(page: Page) {
  await expect(
    page.getByRole('complementary', { name: '作者信息' }),
  ).toBeVisible()
  await expect(
    page.getByRole('complementary', { name: '站点信息' }),
  ).toBeHidden()

  const layout = await page.locator('.blog-dashboard').evaluate(
    (dashboard) => ({
      display: getComputedStyle(dashboard).display,
      columnCount: getComputedStyle(dashboard).gridTemplateColumns.split(' ').length,
    }),
  )
  expect(layout).toEqual({ display: 'grid', columnCount: 1 })

  const cards = page.locator('.blog-article-grid .featured-article')
  await expect(cards.first()).toBeVisible()
  await expect(cards.nth(1)).toBeVisible()
  const [firstCard, secondCard] = await Promise.all([
    cards.first().boundingBox(),
    cards.nth(1).boundingBox(),
  ])
  expect(firstCard).not.toBeNull()
  expect(secondCard).not.toBeNull()
  expect(Math.abs(firstCard!.y - secondCard!.y)).toBeLessThan(2)
  expect(firstCard!.x + firstCard!.width).toBeLessThanOrEqual(secondCard!.x)
}

async function expectMobileLayout(page: Page) {
  const mobileMenu = page.locator('.site-nav__mobile-menu')
  const menuButton = page.getByRole('button', { name: '打开导航菜单' })

  await expect(page.locator('.site-nav__list')).toBeHidden()
  await expect(mobileMenu).toBeHidden()
  await expect(page.getByRole('button', { name: '开启 Live2D 看板娘' }))
    .toHaveCount(0)
  await expect(page.locator('.markdown-body')).toBeVisible()

  const widthState = await page.evaluate(() => {
    const article = document.querySelector('.blog-document')
    if (!article) {
      throw new Error('文章正文区域缺失')
    }
    const articleRect = article.getBoundingClientRect()
    return {
      pageFitsViewport:
        document.documentElement.scrollWidth <= window.innerWidth,
      articleFitsViewport:
        articleRect.left >= 0 && articleRect.right <= window.innerWidth,
    }
  })
  expect(widthState).toEqual({
    pageFitsViewport: true,
    articleFitsViewport: true,
  })

  const hiddenMenuFocusableCount = await mobileMenu
    .locator(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    .count()
  expect(hiddenMenuFocusableCount).toBeGreaterThan(0)

  await menuButton.focus()
  const tabPressCount = hiddenMenuFocusableCount + 3
  for (let tabIndex = 0; tabIndex < tabPressCount; tabIndex += 1) {
    await page.keyboard.press('Tab')
    expect(
      await mobileMenu.evaluate(
        (menu) => !menu.contains(document.activeElement),
      ),
    ).toBe(true)
  }

  await menuButton.click()
  await expect(
    page.getByRole('button', { name: '关闭导航菜单' }),
  ).toBeVisible()
  const informationLink = page.getByRole('link', {
    name: 'INFORMATION 介绍',
  })
  await expect(informationLink).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'PORTFOLIO 作品' }),
  ).toBeVisible()

  await informationLink.focus()
  await expect(informationLink).toBeFocused()
  await informationLink.click()
  await expect(page).toHaveURL(/\/#\/Information$/)
}

test.describe('响应式契约', () => {
  test('当前项目符合对应视口的布局与交互', async ({ page }, testInfo) => {
    await openReadyBlog(page)

    switch (testInfo.project.name) {
      case 'desktop-chromium':
        await expectDesktopLayout(page)
        break
      case 'tablet-chromium':
        await expectTabletLayout(page)
        break
      case 'mobile-chromium':
        await expectMobileLayout(page)
        break
      default:
        throw new Error(`未覆盖的响应式测试项目：${testInfo.project.name}`)
    }
  })
})
