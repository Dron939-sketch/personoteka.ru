'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import styles from './CookieBanner.module.css'

/**
 * Баннер согласия на cookie — §11.8: обязателен вариант ОТКАЗА от аналитических
 * cookie, а не только «принять». До явного согласия аналитика не подключается.
 *
 * Выбор хранится в localStorage; технические cookie работают всегда и согласия
 * не требуют.
 */

const KEY = 'personoteka-cookie-consent'

export type CookieChoice = 'all' | 'necessary'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY)
      if (stored !== 'all' && stored !== 'necessary') setVisible(true)
    } catch {
      // приватный режим: показываем баннер каждый раз, но ничего не ломаем
      setVisible(true)
    }
  }, [])

  const choose = (choice: CookieChoice) => {
    try {
      localStorage.setItem(KEY, choice)
    } catch {
      /* выбор не переживёт перезагрузку — это допустимо */
    }
    setVisible(false)
    // Аналитика инициализируется здесь и только при choice === 'all' (§13).
    if (choice === 'all') {
      window.dispatchEvent(new CustomEvent('personoteka:analytics-allowed'))
    }
  }

  if (!visible) return null

  return (
    <div className={styles.banner} role="region" aria-label="Согласие на использование cookie">
      <p className={styles.text}>
        Сайт использует технические cookie, необходимые для работы, и аналитические cookie
        — для статистики посещений. От аналитических можно отказаться: на доступ к
        содержимому это не влияет. Подробнее — в{' '}
        <Link href="/politika-konfidencialnosti/">политике обработки персональных данных</Link>.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={() => choose('necessary')}>
          Только необходимые
        </button>
        <button type="button" className={styles.primary} onClick={() => choose('all')}>
          Принять все
        </button>
      </div>
    </div>
  )
}
