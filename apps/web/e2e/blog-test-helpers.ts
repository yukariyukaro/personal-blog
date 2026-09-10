import { expect, type Page } from '@playwright/test'

export async function openReadyBlog(page: Page) {
  await page.goto('/#/Home')
  await expect(
    page.getByRole('region', { name: '博客内容', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('searchbox', { name: '搜索文章' }),
  ).toBeVisible()
}
