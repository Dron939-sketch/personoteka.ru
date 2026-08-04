import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHeader } from '@/components/PageHeader'
import { formatDate } from '@/lib/format'
import { getPersonGaps } from '@/lib/lk-data'
import { SITE } from '@/lib/site'

import styles from './page.module.css'

/**
 * Качество карточек: чего не хватает каждой персоне до полноты по §5.1, §5.3 и §11.
 * Список отсортирован от самых неполных — это и есть очередь на доработку.
 */

export const metadata: Metadata = {
  title: 'Качество карточек',
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE.url}/lk/kachestvo/` },
}

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  published: 'опубликована',
  draft: 'черновик',
  review: 'на проверке',
  hidden: 'скрыта',
}

export default function QualityPage() {
  const rows = getPersonGaps()
  const complete = rows.filter((r) => r.gaps.length === 0).length

  // Сводка по типам пробелов: показывает, что чинить пачкой, а не поштучно.
  const byGap = new Map<string, number>()
  for (const row of rows) {
    for (const gap of row.gaps) byGap.set(gap, (byGap.get(gap) ?? 0) + 1)
  }
  const summary = [...byGap.entries()].sort((a, b) => b[1] - a[1])

  return (
    <>
      <PageHeader
        title="Качество карточек"
        lead="Чего не хватает каждой карточке до полноты по контент-модели и правовым требованиям. Сверху — самые неполные."
        meta={`Карточек: ${rows.length} · полностью заполнено: ${complete}`}
      />

      <section className={styles.summary}>
        <h2 className={`caption ${styles.summaryTitle}`}>Пробелы по частоте</h2>
        <ul className={styles.summaryList}>
          {summary.map(([gap, count]) => (
            <li key={gap}>
              <span className={styles.summaryName}>{gap}</span>
              <span className={`tabular ${styles.summaryCount}`}>{count}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.scroller}>
        <table className={styles.table}>
          <caption className={styles.caption}>
            Проверяется тем же набором правил, что и `npm run check:content`.
          </caption>
          <thead>
            <tr>
              <th scope="col">Персона</th>
              <th scope="col">Состояние</th>
              <th scope="col">Чего не хватает</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.slug}>
                <th scope="row" className={styles.person}>
                  {row.status === 'published' ? (
                    <Link href={`/${row.slug}/`}>{row.display_name}</Link>
                  ) : (
                    row.display_name
                  )}
                  <span className={styles.meta}>
                    {row.editorName} · {formatDate(row.updated_at)}
                  </span>
                </th>
                <td className={styles.status}>{STATUS_LABEL[row.status] ?? row.status}</td>
                <td>
                  {row.gaps.length === 0 ? (
                    <span className={styles.ok}>всё на месте</span>
                  ) : (
                    <ul className={styles.gaps}>
                      {row.gaps.map((gap) => (
                        <li key={gap}>{gap}</li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
