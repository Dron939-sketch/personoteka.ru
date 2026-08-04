import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState, PageHeader } from '@/components/PageHeader'
import { getSpheres } from '@/lib/content'
import { getQueue } from '@/lib/lk-data'
import { SITE } from '@/lib/site'

import styles from './page.module.css'

/**
 * Очередь публикаций. Рабочий список редакции: кто ждёт, кто в работе,
 * кто опубликован. Данные — из `content/queue.json`, который собирается
 * из `queue-roster.txt` командой `npm run queue`.
 */

export const metadata: Metadata = {
  title: 'Очередь публикаций',
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE.url}/lk/ochered/` },
}

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  queued: 'В очереди',
  drafting: 'В работе',
  published: 'Опубликовано',
  blocked: 'Ждёт согласия',
}

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined

  const sphereFilter = one(params.sfera)
  const statusFilter = one(params.status)

  const spheres = getSpheres()
  const sphereName = new Map(spheres.map((s) => [s.slug, s.name]))

  const all = getQueue()
  const rows = all.filter(
    (e) =>
      (!sphereFilter || e.sphere === sphereFilter) && (!statusFilter || e.status === statusFilter),
  )

  const href = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams()
    const merged = { sfera: sphereFilter, status: statusFilter, ...patch }
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v)
    const s = q.toString()
    return s ? `/lk/ochered/?${s}` : '/lk/ochered/'
  }

  const usedSpheres = spheres.filter((s) => all.some((e) => e.sphere === s.slug))

  return (
    <>
      <PageHeader
        title="Очередь публикаций"
        lead="Список из content/queue-roster.txt. Пересобирается командой npm run queue."
        meta={`Показано: ${rows.length} из ${all.length}`}
      />

      <div className={styles.filters}>
        <div className={styles.group}>
          <span className="caption">Статус</span>
          <Link href={href({ status: undefined })} className={!statusFilter ? styles.on : undefined}>
            все
          </Link>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <Link
              key={value}
              href={href({ status: value })}
              className={statusFilter === value ? styles.on : undefined}
            >
              {label.toLowerCase()}
            </Link>
          ))}
        </div>
        <div className={styles.group}>
          <span className="caption">Рубрика</span>
          <Link href={href({ sfera: undefined })} className={!sphereFilter ? styles.on : undefined}>
            все
          </Link>
          {usedSpheres.map((s) => (
            <Link
              key={s.slug}
              href={href({ sfera: s.slug })}
              className={sphereFilter === s.slug ? styles.on : undefined}
            >
              {s.name.toLowerCase()}
            </Link>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="По этим условиям никого нет" />
      ) : (
        <div className={styles.scroller}>
          <table className={styles.table}>
            <caption className={styles.caption}>
              Слаг определяет адрес будущей страницы и после публикации не меняется.
            </caption>
            <thead>
              <tr>
                <th scope="col">Персона</th>
                <th scope="col">Слаг</th>
                <th scope="col">Рубрика</th>
                <th scope="col">Статус</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={entry.slug}>
                  <th scope="row" className={styles.person}>
                    {entry.status === 'published' ? (
                      <Link href={`/${entry.slug}/`}>{entry.display_name}</Link>
                    ) : (
                      entry.display_name
                    )}
                    {entry.full_name !== entry.display_name && (
                      <span className={styles.full}>{entry.full_name}</span>
                    )}
                  </th>
                  <td className={`tabular ${styles.slug}`}>{entry.slug}</td>
                  <td className={styles.sphere}>{sphereName.get(entry.sphere) ?? entry.sphere}</td>
                  <td>
                    <span className={`${styles.status} ${styles[entry.status] ?? ''}`}>
                      {STATUS_LABEL[entry.status] ?? entry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
