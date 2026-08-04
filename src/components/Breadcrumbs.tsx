import Link from 'next/link'

import { SITE } from '@/lib/site'

import styles from './Breadcrumbs.module.css'

export interface Crumb {
  href?: string
  label: string
}

/**
 * Хлебные крошки на всех внутренних страницах (§4.2) вместе с разметкой
 * `BreadcrumbList` (§10.2) — одним компонентом, чтобы видимая навигация и разметка
 * не могли разойтись.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ href: '/', label: 'Главная' }, ...items]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: new URL(item.href, SITE.url).toString() } : {}),
    })),
  }

  return (
    <nav className={styles.wrap} aria-label="Вы находитесь здесь">
      <ol className={styles.list}>
        {all.map((item, i) => (
          <li className={styles.item} key={`${item.label}-${i}`}>
            {item.href && i < all.length - 1 ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </nav>
  )
}
