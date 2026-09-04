import { expect, test } from '@playwright/test'
import { openReadyBlog } from './blog-test-helpers'

test.describe('桌面响应式契约', () => {
  test('1440 宽度展示左侧栏、文章主栏和右侧栏', async ({ page }) => {
    test.skip(
      test.info().project.name !== 'desktop-chromium',
      '仅验证桌面项目',
    )
    await openReadyBlog(page)

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
  })
})

test.describe('平板响应式契约', () => {
  test('834 宽度使用单主栏并按平板设计排列文章卡', async ({ page }) => {
    test.skip(
      test.info().project.name !== 'tablet-chromium',
      '仅验证平板项目',
    )
    await openReadyBlog(page)

    await expect(
      page.getByRole('complementary', { name: '作者信息' }),
    ).toBeVisible()
    await expect(
      page.getByRole('complementary', { name: '站点信息' }),
    ).toBeHidden()

    const layout = await page.locator('.blog-dashboard').evaluate((dashboard) => ({
      display: getComputedStyle(dashboard).display,
      columnCount: getComputedStyle(dashboard).gridTemplateColumns.split(' ').length,
    }))
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
  })
})

test.describe('移动响应式契约', () => {
  test('390 宽度导航可用且正文与隐藏控件满足移动约束', async ({ page }) => {
    test.skip(
      test.info().project.name !== 'mobile-chromium',
      '仅验证移动项目',
    )
    await openReadyBlog(page)

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

    await menuButton.focus()
    await page.keyboard.press('Tab')
    expect(
      await page.evaluate(() =>
        document.activeElement?.closest('.site-nav__mobile-menu') === null,
      ),
    ).toBe(true)

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

    await informationLink.click()
    await expect(page).toHaveURL(/\/#\/Information$/)
  })
})
