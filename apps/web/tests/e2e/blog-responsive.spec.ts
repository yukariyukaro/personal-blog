import { expect, test, type Page } from '@playwright/test'
import { openReadyArticle, openReadyBlog } from './blog-test-helpers'

// 背景音乐开关在三档视口都随导航栏可见，且默认（未开启时）可交互
async function expectMusicToggleReady(page: Page) {
  const musicToggle = page.getByRole('button', { name: '播放背景音乐' })
  await expect(musicToggle).toBeVisible()
  await expect(musicToggle).toHaveAttribute('aria-pressed', 'false')
}

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

  await expectMusicToggleReady(page)
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

  await expectMusicToggleReady(page)
}

async function expectMobileLayout(page: Page) {
  const mobileMenu = page.locator('.site-nav__mobile-menu')
  const menuButton = page.getByRole('button', { name: '打开导航菜单' })

  await expect(page.locator('.site-nav__list')).toBeHidden()
  await expect(mobileMenu).toBeHidden()
  await expect(page.locator('.site-nav__mobile-overlay')).toBeHidden()
  await expect(page.getByRole('button', { name: '开启 Live2D 看板娘' }))
    .toHaveCount(0)
  await expect(page.locator('.blog-article-grid .featured-article').first())
    .toBeVisible()
  await expectMusicToggleReady(page)

  const widthState = await page.evaluate(() => {
    const dashboard = document.querySelector('.blog-dashboard')
    if (!dashboard) {
      throw new Error('文章列表区域缺失')
    }
    const dashboardRect = dashboard.getBoundingClientRect()
    return {
      pageFitsViewport:
        document.documentElement.scrollWidth <= window.innerWidth,
      dashboardFitsViewport:
        dashboardRect.left >= 0 && dashboardRect.right <= window.innerWidth,
    }
  })
  expect(widthState).toEqual({
    pageFitsViewport: true,
    dashboardFitsViewport: true,
  })

  await menuButton.focus()
  await expect(menuButton).toBeFocused()
  const focusStart = await menuButton.elementHandle()
  if (!focusStart) {
    throw new Error('无法记录导航菜单按钮焦点')
  }

  const visibleTabbableCount = await page.locator('body *').evaluateAll(
    (elements) => elements.filter((element) => {
      const htmlElement = element as HTMLElement
      const style = getComputedStyle(element)
      const isScrollable =
        (['auto', 'scroll'].includes(style.overflowX)
          && htmlElement.scrollWidth > htmlElement.clientWidth)
        || (['auto', 'scroll'].includes(style.overflowY)
          && htmlElement.scrollHeight > htmlElement.clientHeight)
      return (htmlElement.tabIndex >= 0 || isScrollable)
        && !element.matches(':disabled')
        && !element.closest('[inert]')
        && style.visibility !== 'hidden'
        && style.display !== 'none'
        && element.getClientRects().length > 0
    }).length,
  )
  const maxTabPressCount = Math.max(visibleTabbableCount + 2, 10)
  let focusMoved = false
  let completedFocusLoop = false

  for (let tabIndex = 0; tabIndex < maxTabPressCount; tabIndex += 1) {
    await page.keyboard.press('Tab')
    const focusState = await mobileMenu.evaluate((menu, start) => ({
      isInsideHiddenMenu: menu.contains(document.activeElement),
      isAtStart: document.activeElement === start,
    }), focusStart)

    expect(focusState.isInsideHiddenMenu).toBe(false)
    if (!focusState.isAtStart) {
      focusMoved = true
    } else if (focusMoved) {
      completedFocusLoop = true
      break
    }
  }
  expect(
    completedFocusLoop,
    `焦点未在 ${maxTabPressCount} 次 Tab 操作内回到导航菜单按钮`,
  ).toBe(true)

  await menuButton.click()
  // 菜单打开后汉堡与遮罩按钮同名，first() 指向 DOM 顺序更前的汉堡按钮
  await expect(
    page.getByRole('button', { name: '关闭导航菜单' }).first(),
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
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/#\/Information$/)

  // 抽屉契约：右贴边、宽度受限、完整落在视口内（等滑入动画结束后测量）
  await menuButton.click()
  await expect(mobileMenu).toBeVisible()
  await expect
    .poll(
      () =>
        mobileMenu.evaluate((menu) => {
          const rect = menu.getBoundingClientRect()
          return {
            rightAligned: Math.abs(rect.right - window.innerWidth) <= 1,
            widthLimited: rect.width <= 320,
            fullyInViewport: rect.left >= 0,
          }
        }),
      { timeout: 2_000 },
    )
    .toEqual({
      rightAligned: true,
      widthLimited: true,
      fullyInViewport: true,
    })

  // 点击遮罩关闭抽屉（点左侧未被抽屉覆盖的可见区域）
  await page
    .locator('.site-nav__mobile-overlay')
    .click({ position: { x: 20, y: 200 } })
  await expect(mobileMenu).toBeHidden()
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

  test('移动端文章页正文可读且不横向溢出', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile-chromium',
      '正文可读性契约仅在移动端校验',
    )

    await openReadyArticle(page, 'abstraction')

    await expect(page.locator('.markdown-body')).toBeVisible()

    const widthState = await page.evaluate(() => {
      const articleElement = document.querySelector('.blog-document')
      if (!articleElement) {
        throw new Error('文章正文区域缺失')
      }
      const articleRect = articleElement.getBoundingClientRect()
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
  })
})
