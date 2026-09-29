import { expect, test } from '@playwright/test'
import { openReadyArticle, openReadyBlog } from './blog-test-helpers'

/**
 * 性能契约：把已经修掉的「常驻重型合成层」与「滚动期主线程开销」固化下来，防止回归。
 *
 * 两条防线：
 * 1. 合成层契约（确定性）：用计算样式断言 will-change / backdrop-filter / background-attachment，
 *    这几种写法一旦被加回来就会立刻失败，不依赖机器性能。
 * 2. 运行时预算（宽松阈值）：测量真实滚动期间的主线程长任务，只在出现明显劣化时才失败。
 */
test.describe('性能契约', () => {
  test('首屏与阅读区不再持有常驻重型合成层', async ({ page }) => {
    await openReadyBlog(page)

    const homeStyles = await page.evaluate(() => {
      const read = (selector: string) => {
        const element = document.querySelector(selector)
        if (!element) {
          throw new Error(`缺少节点：${selector}`)
        }
        const style = getComputedStyle(element)
        return {
          willChange: style.willChange,
          backdropFilter: style.backdropFilter,
          backgroundAttachment: style.backgroundAttachment,
        }
      }

      const waveUse = document.querySelector('.home-page__waves-parallax use')
      return {
        homeBackground: read('.home-bg'),
        waves: read('.home-page__waves'),
        navbar: read('.site-nav'),
        reader: read('.blog-reader'),
        blogCard: read('.blog-card'),
        featuredArticle: read('.featured-article'),
        waveWillChange: waveUse ? getComputedStyle(waveUse).willChange : null,
      }
    })

    // 首屏 hero：不再对全视口图层做永久提权（否则浏览器会长期保留带滤镜的整屏图层）
    expect(homeStyles.homeBackground.willChange).toBe('auto')
    // 波浪：容器与 4 层 use 都不再常驻提权
    expect(homeStyles.waves.willChange).toBe('auto')
    expect(homeStyles.waveWillChange).toBe('auto')
    // 固定导航栏：不再对播放中的视频与波浪做逐帧 backdrop 采样
    expect(homeStyles.navbar.backdropFilter).toBe('none')
    // 阅读区：固定背景由 sticky 层承担，不再用 background-attachment: fixed 逐帧重绘整屏
    expect(homeStyles.reader.backgroundAttachment).toBe('scroll')
    // 阅读区卡片：去掉会随滚动/悬停重复采样背景的毛玻璃
    expect(homeStyles.blogCard.backdropFilter).toBe('none')
    expect(homeStyles.featuredArticle.backdropFilter).toBe('none')

    await openReadyArticle(page, 'abstraction')
    expect(
      await page
        .locator('.blog-document')
        .evaluate((element) => getComputedStyle(element).backdropFilter),
    ).toBe('none')
  })

  test('滚动期间的主线程开销在预算内', async ({ page }) => {
    test.slow()
    // 本用例测量真实动效路径（波浪动画、视频），需先关闭 playground 全局的 reducedMotion: 'reduce'
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await openReadyBlog(page)
    // 先让首屏淡入、视频可见性切换与字体加载等一次性工作结束，避免把启动开销算进预算
    await page.waitForTimeout(2_000)

    const metrics = await page.evaluate(async () => {
      const longTasks: number[] = []
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTasks.push(entry.duration)
        }
      })
      observer.observe({ type: 'longtask', buffered: false })

      const frameDeltas: number[] = []
      let previousFrame = performance.now()
      let isTracking = true
      const trackFrame = (now: number) => {
        frameDeltas.push(now - previousFrame)
        previousFrame = now
        if (isTracking) {
          requestAnimationFrame(trackFrame)
        }
      }
      requestAnimationFrame(trackFrame)

      const nextFrame = () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve())
        })

      const step = Math.max(Math.round(window.innerHeight * 0.2), 120)
      for (let index = 0; index < 15; index += 1) {
        window.scrollBy(0, step)
        await nextFrame()
      }
      window.scrollTo(0, 0)
      await nextFrame()

      isTracking = false
      observer.disconnect()

      const sortedDeltas = [...frameDeltas].sort((left, right) => left - right)
      return {
        longTaskCount: longTasks.length,
        longTaskTotal: Math.round(
          longTasks.reduce((sum, duration) => sum + duration, 0),
        ),
        longestTask: Math.round(longTasks.length > 0 ? Math.max(...longTasks) : 0),
        medianFrameDelta: Math.round(
          sortedDeltas[Math.floor(sortedDeltas.length / 2)] ?? 0,
        ),
        frameCount: frameDeltas.length,
      }
    })

    console.log('[perf] 滚动预算', JSON.stringify(metrics))

    // 阈值刻意放宽：只拦截「明显劣化」，正常滚动不应出现成片的长任务或长时间卡帧
    expect(metrics.longTaskTotal).toBeLessThan(1_500)
    expect(metrics.longestTask).toBeLessThan(700)
    expect(metrics.medianFrameDelta).toBeLessThan(120)
  })
})
