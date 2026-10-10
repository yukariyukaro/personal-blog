import { defineConfig } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './output/playwright/test-results',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
  timeout: 20_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder: './output/playwright/blog-acceptance-report',
        open: 'never',
      },
    ],
    // 机器可读的 Markdown 验收报告：AI 只读它即可，不必打开页面或通读整页截图。
    ['./tests/reporters/acceptance-report.ts'],
  ],
  use: {
    baseURL,
    locale: 'zh-CN',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    // 常规记录 DOM + aria 快照即可被文本工具读取；screen 体积最大，只在确实需要像素证据时单独开启。
    trace: {
      mode: 'retain-on-failure',
      snapshots: { dom: true, aria: true, screen: false },
      screenshots: false,
    },
    video: 'retain-on-failure',
  },
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    },
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
        viewport: { width: 1440, height: 900 },
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'tablet-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 834, height: 1112 },
        hasTouch: true,
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'mobile-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        reducedMotion: 'reduce',
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'pnpm run dev --host 127.0.0.1 --port 4173',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
