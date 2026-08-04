'use client'

import { useEffect, useState } from 'react'

import styles from './ThemeToggle.module.css'

type Theme = 'light' | 'dark'

const KEY = 'personoteka-theme'

/**
 * Переключатель темы (§7.2). Ставит [data-theme] на <html> — атрибут выигрывает
 * у prefers-color-scheme, поэтому ручной выбор всегда сильнее системного.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(KEY)
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored)
      return
    }
    setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  }, [])

  const switchTo = (next: Theme) => {
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // приватный режим — тема просто не переживёт перезагрузку
    }
  }

  // До гидратации тема неизвестна: рисуем неактивную заглушку того же размера,
  // чтобы шапка не дёргалась (CLS).
  if (theme === null) {
    return <span className={styles.placeholder} aria-hidden="true" />
  }

  const next: Theme = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className={styles.button}
      onClick={() => switchTo(next)}
      aria-label={next === 'dark' ? 'Включить тёмную тему' : 'Включить светлую тему'}
      title={next === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M15 11.3A6.5 6.5 0 0 1 6.7 3a6.5 6.5 0 1 0 8.3 8.3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="9" y1="1.5" x2="9" y2="3" />
        <line x1="9" y1="15" x2="9" y2="16.5" />
        <line x1="1.5" y1="9" x2="3" y2="9" />
        <line x1="15" y1="9" x2="16.5" y2="9" />
        <line x1="3.8" y1="3.8" x2="4.9" y2="4.9" />
        <line x1="13.1" y1="13.1" x2="14.2" y2="14.2" />
        <line x1="3.8" y1="14.2" x2="4.9" y2="13.1" />
        <line x1="13.1" y1="4.9" x2="14.2" y2="3.8" />
      </g>
    </svg>
  )
}
