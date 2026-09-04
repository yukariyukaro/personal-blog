import * as NavigationMenu from '@radix-ui/react-navigation-menu'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ThemeSwitch from '../ThemeSwitch'
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
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchButtonRef = useRef<HTMLButtonElement | null>(null)

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

  useEffect(() => {
    if (!isMenuOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMenuOpen])

  useEffect(() => {
    const handleFocusSearch = () => {
      setIsSearchOpen(true)
      window.setTimeout(() => searchButtonRef.current?.focus(), 0)
    }
    window.addEventListener('blog:focus-search', handleFocusSearch)
    return () => window.removeEventListener('blog:focus-search', handleFocusSearch)
  }, [])

  const focusArticleSearch = () => {
    setIsSearchOpen(false)
    setIsMenuOpen(false)
    window.dispatchEvent(new CustomEvent('blog:focus-search'))
  }

  return (
    <NavigationMenu.Root
      className={`site-nav ${visible ? '' : 'site-nav--hidden'} ${
        scrollProgress > 0.01 ? 'site-nav--scrolled' : ''
      } ${isMenuOpen ? 'site-nav--menu-open' : ''}`}
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
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="site-nav__text-en">{item.en}</span>
                  <span className="site-nav__text-zh">{item.zh}</span>
                </Link>
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          )
        })}
      </NavigationMenu.List>

      <div className="site-nav__actions">
        <button
          ref={searchButtonRef}
          className={`site-nav__icon-button ${isSearchOpen ? 'is-active' : ''}`}
          type="button"
          aria-label="搜索文章"
          title="搜索文章"
          onClick={focusArticleSearch}
        >
          <span aria-hidden="true">⌕</span>
        </button>
        <ThemeSwitch />
        <button
          className="site-nav__menu-button"
          type="button"
          aria-label={isMenuOpen ? '关闭导航菜单' : '打开导航菜单'}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <span aria-hidden="true">{isMenuOpen ? '×' : '≡'}</span>
        </button>
      </div>

      <div className={`site-nav__mobile-menu ${isMenuOpen ? 'is-open' : ''}`}>
        <div className="site-nav__mobile-menu-inner">
          <button
            className="site-nav__mobile-search"
            type="button"
            onClick={focusArticleSearch}
          >
            <span aria-hidden="true">⌕</span>
            搜索文章
          </button>
          {NAV_ITEMS.map((item, index) => (
            <Link
              key={item.en}
              className={`site-nav__mobile-link ${activeIndex === index ? 'is-active' : ''}`}
              to={item.to}
              onClick={() => setIsMenuOpen(false)}
            >
              <span>{item.en}</span>
              <strong>{item.zh}</strong>
            </Link>
          ))}
        </div>
      </div>
    </NavigationMenu.Root>
  )
}
