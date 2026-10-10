import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function useHomeDescent(scopeRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const scope = scopeRef.current
    const runway = scope?.querySelector<HTMLElement>('.home-page__runway')
    const sticky = scope?.querySelector<HTMLElement>('.home-page__sticky')
    if (!scope || !runway || !sticky) return

    let disposed = false
    let refreshFrame = 0
    const media = gsap.matchMedia()
    const context = gsap.context(() => {
      media.add({
        motion: '(prefers-reduced-motion: no-preference)',
        desktop: '(min-width: 1024px)',
      }, ({ conditions }) => {
        if (!conditions?.motion) return
        const desktop = Boolean(conditions.desktop)
        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: runway,
            start: 'top top',
            // 原生 sticky 释放前完成溶解；不用第二套 pin spacer 改变文档流。
            end: () => `+=${Math.max(1, runway.offsetHeight - sticky.offsetHeight)}`,
            scrub: 0.45,
            invalidateOnRefresh: true,
          },
        })

        timeline
          .addLabel('departure', 0)
          .to('.home-bg', { scale: desktop ? 1.08 : 1.035, duration: 1 }, 'departure')
          .to('.home-page__dim', { opacity: 0.35, duration: 0.8 }, 'departure')
          .to('.home-info-container', { y: -32, autoAlpha: 0, duration: 0.36 }, 'departure')
          .to('.home-top-frame', { autoAlpha: 0, duration: 0.36 }, 'departure')
          .to('.hero-rail', { y: -18, autoAlpha: 0, duration: 0.4 }, 0.08)
          .addLabel('dissolve', 0.18)
          .to('.home-page__veil', { opacity: 1, duration: 0.82 }, 'dissolve')
          .addLabel('archive', 1)
      }, scope)
    }, scope)

    const refresh = () => {
      if (disposed) return
      cancelAnimationFrame(refreshFrame)
      refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh())
    }
    const observer = new ResizeObserver(refresh)
    observer.observe(runway)
    observer.observe(sticky)
    void document.fonts.ready.then(refresh)
    refresh()

    return () => {
      disposed = true
      observer.disconnect()
      cancelAnimationFrame(refreshFrame)
      media.revert()
      context.revert()
    }
  }, [scopeRef])

}
