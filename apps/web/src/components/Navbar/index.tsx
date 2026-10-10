import * as NavigationMenu from '@radix-ui/react-navigation-menu'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import {
  navigationItems,
  type NavigationItemId,
} from '../../config/navigationConfig'
import { siteProfile } from '../../config/siteProfile'
import MusicToggle from '../MusicToggle'
import './Navbar.css'

interface NavbarProps {
  visible?: boolean
  activeItemId?: NavigationItemId
}

// 移动端抽屉内的可聚焦元素（用于焦点圈与初始聚焦）
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled])'

export default function Navbar({ visible = true, activeItemId }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchButtonRef = useRef<HTMLButtonElement | null>(null)
  const scrollProgressRef = useRef<HTMLDivElement | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let animationFrameId = 0
    // 记录上一次写入 React 的阈值状态：进度条本身直接改 DOM，
    // 只有这个布尔值需要交给 React 才能驱动 .site-nav--scrolled 类名
    let isScrolledNow = false

    const updateProgress = () => {
      animationFrameId = 0
      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight
      const nextProgress =
        scrollableHeight > 0
          ? Math.min(Math.max(window.scrollY / scrollableHeight, 0), 1)
          : 0

      // 进度是连续值、每帧都在变：直接写样式，避免滚动时每帧触发 React 重渲染
      const progressBar = scrollProgressRef.current
      if (progressBar) {
        progressBar.style.opacity = nextProgress > 0 ? '1' : '0'
        progressBar.style.transform = `scaleX(${nextProgress})`
      }

      const nextIsScrolled = nextProgress > 0.01
      if (nextIsScrolled !== isScrolledNow) {
        isScrolledNow = nextIsScrolled
        setIsScrolled(nextIsScrolled)
      }
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
        menuButtonRef.current?.focus()
        return
      }
      if (event.key !== 'Tab') {
        return
      }
      // aria-modal 浮层的最低焦点闭环：Tab 循环限制在抽屉内
      const menu = mobileMenuRef.current
      if (!menu) {
        return
      }
      const focusable = menu.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (focusable.length === 0) {
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      const isInsideMenu = menu.contains(active)
      if (event.shiftKey && (active === first || !isInsideMenu)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !isInsideMenu)) {
        event.preventDefault()
        first.focus()
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    // 打开抽屉时把焦点移入第一个元素，配合 aria-modal；点击链接关闭时不抢焦点
    const focusTimer = window.setTimeout(() => {
      mobileMenuRef.current
        ?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
        ?.focus()
    }, 0)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      window.clearTimeout(focusTimer)
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
    // 文章列表页在 Home；不在该页时先跳回去，否则搜索框不存在、聚焦事件会静默失效
    if (!window.location.hash.startsWith('#/Home')) {
      navigate('/Home')
    }
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('blog:focus-search'))
    }, 0)
  }

  return (
    <NavigationMenu.Root
      className={`site-nav ${visible ? '' : 'site-nav--hidden'} ${
        isScrolled ? 'site-nav--scrolled' : ''
      } ${isMenuOpen ? 'site-nav--menu-open' : ''}`}
      aria-label="Main Navigation"
    >
      <div
        ref={scrollProgressRef}
        className="site-nav__scroll-progress"
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
          <svg
            className="site-nav__icon-svg"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="10.5" cy="10.5" r="6.75" fill="none" stroke="currentColor" strokeWidth="2.4" />
            <line x1="15.6" y1="15.6" x2="21" y2="21" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
        <MusicToggle />
        <button
          ref={menuButtonRef}
          className="site-nav__menu-button"
          type="button"
          aria-label={isMenuOpen ? '关闭导航菜单' : '打开导航菜单'}
          aria-expanded={isMenuOpen}
          aria-controls="site-nav-mobile-menu"
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <span aria-hidden="true">{isMenuOpen ? '×' : '≡'}</span>
        </button>
      </div>

      {/* 抽屉与遮罩挂到 body：.site-nav 的入场/隐藏 transform 会把 fixed 后代
          变成相对导航定位，portal 可彻底解耦（taozhiyy 同款做法） */}
      {createPortal(
        <>
          <button
            type="button"
            className={`site-nav__mobile-overlay ${isMenuOpen ? 'is-open' : ''}`}
            aria-label="关闭导航菜单"
            tabIndex={-1}
            onClick={() => {
              setIsMenuOpen(false)
              menuButtonRef.current?.focus()
            }}
          />

          <div
            ref={mobileMenuRef}
            id="site-nav-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="导航菜单"
            className={`site-nav__mobile-menu ${isMenuOpen ? 'is-open' : ''}`}
          >
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
        </>,
        document.body,
      )}
    </NavigationMenu.Root>
  )
}
