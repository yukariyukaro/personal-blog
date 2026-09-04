import * as NavigationMenu from '@radix-ui/react-navigation-menu'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  navigationItems,
  type NavigationItemId,
} from '../../app/navigation/navigationConfig'
import { siteProfile } from '../../config/siteProfile'
import ThemeSwitch from '../ThemeSwitch'
import './Navbar.css'

interface NavbarProps {
  visible?: boolean
  activeItemId?: NavigationItemId
}

export default function Navbar({ visible = true, activeItemId }: NavbarProps) {
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
        <Link to="/Home" className="site-nav__logo">{siteProfile.name}</Link>
      </div>

      <NavigationMenu.List className="site-nav__list">
        {navigationItems.map((item) => {
          const isActive = activeItemId === item.id
          return (
            <NavigationMenu.Item key={item.id} className="site-nav__item">
              <NavigationMenu.Link asChild>
                <Link
                  className={`site-nav__link ${isActive ? 'site-nav__link--active' : ''}`}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="site-nav__text-en">{item.label}</span>
                  <span className="site-nav__text-zh">{item.shortLabel}</span>
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
          {navigationItems.map((item) => (
            <Link
              key={item.id}
              className={`site-nav__mobile-link ${activeItemId === item.id ? 'is-active' : ''}`}
              to={item.path}
              onClick={() => setIsMenuOpen(false)}
            >
              <span>{item.label}</span>
              <strong>{item.shortLabel}</strong>
            </Link>
          ))}
        </div>
      </div>
    </NavigationMenu.Root>
  )
}
