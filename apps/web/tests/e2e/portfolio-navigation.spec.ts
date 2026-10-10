import { expect, test, type Page } from '@playwright/test'

async function openPortfolio(page: Page, query = '') {
  await page.goto(`/#/Portfolio${query}`)
  await expect(page.locator('#global-loading')).toHaveCount(0)
  await expect(page.locator('.portfolio-stage')).toHaveAttribute('data-phase', 'idle')
}

async function swipeBlankDeck(page: Page) {
  const deck = page.locator('.portfolio-carousel__cards')
  await deck.scrollIntoViewIfNeeded()
  const box = await deck.boundingBox()
  if (!box) throw new Error('卡组不可见')
  const session = await page.context().newCDPSession(page)
  try {
    const x = box.x + box.width / 2 + 65
    const y = box.y + 10
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 0 }] })
    for (let step = 1; step <= 6; step += 1) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 130 * step / 6, y, id: 0 }] })
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    await session.detach()
  }
}

test.describe('作品导航回归契约', () => {
  test('目录方向键同步焦点，Enter 打开新的选择', async ({ page }) => {
    await openPortfolio(page)
    const items = page.locator('.portfolio-directory__item')
    await items.nth(0).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('.portfolio-card.is-active em')).toHaveText('2025年度总结')
    await expect(items.nth(1)).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#portfolio-detail-title')).toHaveText('2025年度总结')
    await expect(page).toHaveURL(/project=annual-report$/)
  })

  test('中央卡连续方向键切换保留焦点并可立即打开', async ({ page }) => {
    await openPortfolio(page)
    const active = page.locator('.portfolio-card.is-active')
    await active.focus()
    for (const title of ['2025年度总结', '愚公迁移工具', '火山引擎ByteHouse 官网', 'Triple Uni']) {
      await page.keyboard.press('ArrowRight')
      await expect(active.locator('em')).toHaveText(title)
      await expect(active).toBeFocused()
    }
    await page.keyboard.press('Enter')
    await expect(page.locator('#portfolio-detail-title')).toHaveText('Triple Uni')
  })

  test('详情上下键保留阅读滚动，不切换项目', async ({ page }) => {
    await openPortfolio(page, '?project=annual-report')
    const title = page.locator('#portfolio-detail-title')
    await expect(title).toBeFocused()
    const before = await page.evaluate(() => scrollY)
    await page.keyboard.press('ArrowDown')
    await expect(title).toHaveText('2025年度总结')
    await expect(page).toHaveURL(/project=annual-report$/)
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before)
    await page.keyboard.press('ArrowUp')
    await expect(title).toHaveText('2025年度总结')
  })

  test('修饰方向键不切换项目，也不阻止浏览器原生行为', async ({ page }) => {
    await openPortfolio(page)
    await page.locator('.portfolio-directory__item').nth(1).focus()
    await page.keyboard.press('Enter')
    const title = page.locator('#portfolio-detail-title')
    await expect(title).toHaveText('2025年度总结')
    await page.evaluate(() => {
      window.addEventListener('keydown', event => {
        if (event.key.startsWith('Arrow')) {
          document.documentElement.dataset.modifiedKeyPrevented = String(event.defaultPrevented)
        }
      })
    })
    // Playwright 的按键输入不保证触发浏览器工具栏快捷键，直接验证事件是否被应用消费。
    for (const key of ['Control+ArrowRight', 'Meta+ArrowRight', 'Shift+ArrowRight', 'Alt+ArrowLeft']) {
      await title.focus()
      await page.keyboard.press(key)
      await expect(page.locator('html')).toHaveAttribute('data-modified-key-prevented', 'false')
      await expect(page).toHaveURL(/project=annual-report$/)
    }
  })

  test('浏览器 Back/Forward 同步详情与返回目录的选择和焦点', async ({ page }) => {
    await openPortfolio(page)
    await page.locator('.portfolio-directory__item').nth(1).focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('#portfolio-detail-title')).toHaveText('2025年度总结')
    await page.getByRole('button', { name: '下一个项目', exact: true }).click()
    await expect(page.locator('#portfolio-detail-title')).toHaveText('愚公迁移工具')
    await page.goBack()
    await expect(page.locator('#portfolio-detail-title')).toHaveText('2025年度总结')
    await page.goBack()
    const active = page.locator('.portfolio-card.is-active')
    await expect(active.locator('em')).toHaveText('2025年度总结')
    await expect(active).toBeFocused()
    await page.goForward()
    await expect(page.locator('#portfolio-detail-title')).toHaveText('2025年度总结')
    await page.goForward()
    await expect(page.locator('#portfolio-detail-title')).toHaveText('愚公迁移工具')
    await page.getByRole('button', { name: '返回档案', exact: true }).click()
    await expect(active.locator('em')).toHaveText('愚公迁移工具')
    await expect(active).toBeFocused()
  })

  test('空白区域横滑后第一次键盘 Enter 仍能打开详情', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop-chromium', '原生触摸在手机和平板验证')
    await openPortfolio(page)
    await swipeBlankDeck(page)
    const active = page.locator('.portfolio-card.is-active')
    await expect(active.locator('em')).toHaveText('2025年度总结')
    await active.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('#portfolio-detail-title')).toHaveText('2025年度总结')
  })

  test('混合鼠标与键盘选择不会残留旧预览，离开目录项即清理', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', '预览属于精确指针')
    await openPortfolio(page)
    const items = page.locator('.portfolio-directory__item')
    const preview = page.locator('.portfolio-directory__preview')
    await items.nth(1).hover()
    await expect(preview).toHaveAttribute('data-project', 'annual-report')
    await items.nth(2).focus()
    await expect(page.locator('.portfolio-card.is-active em')).toHaveText('愚公迁移工具')
    await expect(preview).not.toHaveClass(/is-visible/)
    await expect(preview).not.toHaveAttribute('data-project', /.+/)
    await items.nth(1).hover()
    await page.locator('.portfolio-directory__heading').hover()
    await expect(preview).not.toHaveClass(/is-visible/)
  })

  test('图片失败后详情可见标注原创回退，切换项目不残留错误状态', async ({ page }) => {
    await page.route('**/Detail/TripleUni.webp', route => route.abort())
    await openPortfolio(page, '?project=triple-uni')
    const art = page.locator('.portfolio-details__art')
    const register = page.locator('.portfolio-details__art-register')
    await expect(art.locator('.project-artwork--graphic')).toBeVisible()
    await expect(register).toContainText('原创封面')
    await expect(register).toContainText('非产品截图')
    await page.getByRole('button', { name: '下一个项目', exact: true }).click()
    await expect(art.locator('img')).toHaveAttribute('src', /YearReport/)
    await expect(register).toContainText('作品视觉')
    await expect(register).not.toContainText('原创封面')
  })
})
