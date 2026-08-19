import Link from 'next/link'

import { pageHref } from '@/lib/pagination'

import styles from './Pagination.module.css'

/**
 * Переход между страницами списка.
 *
 * Номера выводятся ссылками, а не кнопками на сценарии: робот ходит по ссылкам,
 * и список, листаемый только скриптом, для него обрывается на первой странице.
 * По той же причине здесь нет «показать ещё» — подгрузка на месте не даёт
 * второй половине каталога собственных адресов.
 */
export function Pagination({
  base,
  page,
  pages,
  total,
}: {
  /** Адрес раздела: `/katalog/`, `/sfera/biznes/` и подобные. */
  base: string
  page: number
  pages: number
  total: number
}) {
  if (pages <= 1) return null

  return (
    <>
      <nav className={styles.nav} aria-label="Страницы каталога">
        {page > 1 && (
          <Link className={styles.step} href={pageHref(base, page - 1)} rel="prev">
            ← Предыдущая
          </Link>
        )}

        {windowed(page, pages).map((n, i) =>
          n === null ? (
            <span key={`gap-${i}`} className={styles.gap}>
              …
            </span>
          ) : n === page ? (
            <span key={n} className={styles.current} aria-current="page">
              {n}
            </span>
          ) : (
            <Link key={n} className={styles.page} href={pageHref(base, n)}>
              {n}
            </Link>
          ),
        )}

        {page < pages && (
          <Link className={styles.step} href={pageHref(base, page + 1)} rel="next">
            Следующая →
          </Link>
        )}
      </nav>
      <p className={styles.counter}>
        Страница {page} из {pages} · всего {total}
      </p>
    </>
  )
}

/**
 * Номера вокруг текущей страницы: края всегда видны, середина сворачивается
 * в многоточие. При 13 страницах ряд из всех номеров ещё читается, при 60 —
 * уже нет, а первая и последняя нужны всегда.
 */
function windowed(page: number, pages: number): (number | null)[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)

  const out: (number | null)[] = [1]
  const from = Math.max(2, page - 1)
  const to = Math.min(pages - 1, page + 1)

  if (from > 2) out.push(null)
  for (let n = from; n <= to; n++) out.push(n)
  if (to < pages - 1) out.push(null)

  out.push(pages)
  return out
}
