import { useEffect, useState } from 'react'
import './ThemeSwitch.css'

type Theme = 'dark' | 'light'

const STORAGE_KEY = 'blog-theme'

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  let storedTheme: string | null = null
  try {
    storedTheme = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    storedTheme = null
  }
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

export default function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // 隐私模式下 localStorage 可能不可写，主题仍保持当前会话生效。
    }
  }, [theme])

  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const label = theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'

  return (
    <button
      className="theme-switch"
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(nextTheme)}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☼' : '◐'}</span>
    </button>
  )
}
