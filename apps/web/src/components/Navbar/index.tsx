import * as NavigationMenu from '@radix-ui/react-navigation-menu'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './Navbar.css'

interface NavbarProps {
  visible?: boolean
  activeIndex?: number
}

const NAV_ITEMS = [
  { en: 'INDEX', zh: '首页', to: '/Home' },
  { en: 'INFORMATION', zh: '介绍', to: '/Information' },
  { en: 'PORTFOLIO', zh: '作品', to: '/Portfolio' },
]

export default function Navbar({ visible = true, activeIndex = 0 }: NavbarProps) {
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    let animationFrameId = 0

    const updateProgress = () => {
      animationFrameId = 0
      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight
      const nextProgress =
        scrollableHeight > 0
          ? Math.min(Math.max(window.scrollY / scrollableHeight, 0), 1)
          : 0
      setScrollProgress(nextProgress)
    }

    const scheduleUpdate = () => {
      if (animationFrameId === 0) {
        animationFrameId = window.requestAnimationFrame(updateProgress)
      }
    }

    const resizeObserver = new ResizeObserver(scheduleUpdate)
    resizeObserver.observe(document.body)
    updateProgress()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [])

  return (
    <NavigationMenu.Root
      className={`site-nav ${visible ? '' : 'site-nav--hidden'} ${
        scrollProgress > 0.01 ? 'site-nav--scrolled' : ''
      }`}
      aria-label="Main Navigation"
    >
      <div
        className="site-nav__scroll-progress"
        style={{
          opacity: scrollProgress > 0 ? 1 : 0,
          transform: `scaleX(${scrollProgress})`,
        }}
        aria-hidden="true"
      />

      <div className="site-nav__logo-container">
        <Link to="/Home" className="site-nav__logo">娄宿三</Link>
      </div>

      <NavigationMenu.List className="site-nav__list">
        {NAV_ITEMS.map((item, index) => {
          const isActive = activeIndex === index
          return (
            <NavigationMenu.Item key={item.en} className="site-nav__item">
              <NavigationMenu.Link asChild>
                <Link
                  className={`site-nav__link ${isActive ? 'site-nav__link--active' : ''}`}
                  to={item.to}
                >
                  <span className="site-nav__text-en">{item.en}</span>
                  <span className="site-nav__text-zh">{item.zh}</span>
                </Link>
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          )
        })}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  )
}
