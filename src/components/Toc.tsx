'use client'

import { useEffect, useState } from 'react'

import styles from './Toc.module.css'

export interface TocItem {
  id: string
  label: string
}

/**
 * Оглавление страницы персоны (§8.1): липкое справа на ≥1024 px,
 * аккордеон сверху на мобайле.
 *
 * Активный пункт подсвечивается по IntersectionObserver — без обработчика scroll,
 * чтобы не тратить бюджет INP (§9.2).
 */
export function Toc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null)

  useEffect(() => {
    if (!items.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      // Верхняя треть вьюпорта: раздел считается текущим, когда его заголовок вверху экрана.
      { rootMargin: '-80px 0px -66% 0px', threshold: 0 },
    )
    for (const item of items) {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [items])

  if (items.length < 2) return null

  const list = (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            className={item.id === active ? styles.active : undefined}
            aria-current={item.id === active ? 'true' : undefined}
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  )

  return (
    <>
      <nav className={styles.desktop} aria-label="Содержание страницы">
        <p className={`caption ${styles.title}`}>Содержание</p>
        {list}
      </nav>
      <details className={styles.mobile}>
        <summary>Содержание</summary>
        {list}
      </details>
    </>
  )
}
