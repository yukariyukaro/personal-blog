import { expect, test } from '@playwright/test'

test('页面私有模块路径进入 404，而不是渲染组件或数据模块', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', '路由扫描与视口无关')
  for (const path of [
    '/Portfolio/components/DetailPanel/projects',
    '/Portfolio/components/DetailPanel/ProjectDetails',
    '/Portfolio/components/ProjectDetails',
    '/Portfolio/hooks/usePortfolioController',
    '/Portfolio/utils/projects',
    '/Home/components/HeroPanel',
    '/Home/hooks/useHeroVideo',
  ]) {
    await page.goto(`/#${path}`)
    await expect(page.locator('#global-loading')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: '档案未找到。' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Unexpected Application Error!' })).toHaveCount(0)
  }
})

test('合法页面入口与动态文章路由保持可访问', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', '入口与视口无关')
  for (const [path, selector] of [
    ['/Home', '.home-page'],
    ['/Information', '.intro-panel'],
    ['/Portfolio', '.portfolio-stage'],
    ['/Editor', '.md-launcher'],
    ['/Post/abstraction', '.markdown-body'],
  ]) {
    await page.goto(`/#${path}`)
    await expect(page.locator(selector)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Unexpected Application Error!' })).toHaveCount(0)
  }
})
