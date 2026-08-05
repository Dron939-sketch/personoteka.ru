import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHeader } from '@/components/PageHeader'
import { getPersons } from '@/lib/content'
import { getPersonGaps, getQueueStats } from '@/lib/lk-data'
import { formatDate } from '@/lib/format'
import { SITE } from '@/lib/site'
import { readLeads, readRemovals, ticketStates } from '@/lib/tickets'

import styles from './page.module.css'

/**
 * Обзор кабинета. Показывает только то, что действительно известно из
 * репозитория: сколько персон в очереди, сколько опубликовано, чего не хватает
 * карточкам. Разделы, для которых нужны данные аналитики, честно помечены
 * как недоступные — выдумывать просмотры и позиции нельзя.
 */

export const metadata: Metadata = {
  title: 'Кабинет редакции',
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE.url}/lk/` },
}

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  queued: 'в очереди',
  drafting: 'в работе',
  published: 'опубликовано',
  blocked: 'ждёт согласия',
}

export default function LkOverviewPage() {
  const stats = getQueueStats()
  const gaps = getPersonGaps()
  const published = getPersons()

  const withoutPhoto = gaps.filter((g) => g.gaps.includes('нет портрета')).length
  const withoutLinks = gaps.filter((g) => g.gaps.includes('нет ссылок (пустой sameAs)')).length
  const unverified = gaps.filter((g) => g.gaps.includes('не проверено по документам')).length
  const lastUpdate = published.map((p) => p.updated_at).sort().at(-1)

  const done = stats.byStatus.published ?? 0
  const percent = stats.total ? Math.round((done / stats.total) * 100) : 0

  // Незакрытые обращения выносим на обзор: срок по §11.3 идёт независимо от того,
  // открыл кто-нибудь раздел заявок или нет.
  const states = ticketStates()
  const isOpen = (id: string) => ['open', 'in_work'].includes(states.get(id)?.state ?? 'open')
  const openRemovals = readRemovals().filter((t) => isOpen(t.id))
  const openLeads = readLeads().filter((t) => isOpen(t.id))
  const overdue = openRemovals.filter((t) => Date.parse(t.acknowledge_by) < Date.now()).length

  return (
    <>
      <PageHeader
        title="Кабинет редакции"
        lead="Состояние наполнения по данным репозитория."
        meta={lastUpdate ? `Последнее обновление карточки: ${formatDate(lastUpdate)}` : undefined}
      />

      <section className={styles.tiles}>
        <div className={styles.tile}>
          <p className={`caption ${styles.tileLabel}`}>Открытых обращений</p>
          <p className={`tabular ${styles.tileValue}`}>
            {openRemovals.length + openLeads.length}
          </p>
          <p className={styles.tileNote}>
            {overdue > 0
              ? `просрочено по сроку §11.3: ${overdue}`
              : `запросов на удаление: ${openRemovals.length}`}
          </p>
        </div>
        <div className={styles.tile}>
          <p className={`caption ${styles.tileLabel}`}>Готово из списка</p>
          <p className={`tabular ${styles.tileValue}`}>
            {done} / {stats.total}
          </p>
          <p className={styles.tileNote}>{percent} % очереди</p>
        </div>
        <div className={styles.tile}>
          <p className={`caption ${styles.tileLabel}`}>Без портрета</p>
          <p className={`tabular ${styles.tileValue}`}>{withoutPhoto}</p>
          <p className={styles.tileNote}>показывается монограмма</p>
        </div>
        <div className={styles.tile}>
          <p className={`caption ${styles.tileLabel}`}>Без внешних ссылок</p>
          <p className={`tabular ${styles.tileValue}`}>{withoutLinks}</p>
          <p className={styles.tileNote}>пустой sameAs в разметке</p>
        </div>
        <div className={styles.tile}>
          <p className={`caption ${styles.tileLabel}`}>Не проверено по документам</p>
          <p className={`tabular ${styles.tileValue}`}>{unverified}</p>
          <p className={styles.tileNote}>значок «Проверено» не стоит</p>
        </div>
      </section>

      <section className={styles.block}>
        <h2 className="ruled">Очередь по статусам</h2>
        <ul className={styles.statusList}>
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <li key={status}>
              <span className={styles.statusName}>{STATUS_LABEL[status] ?? status}</span>
              <span className={`tabular ${styles.statusCount}`}>{count}</span>
            </li>
          ))}
        </ul>
        <p className={styles.more}>
          <Link href="/lk/ochered/">Открыть очередь</Link>
          {' · '}
          <Link href="/lk/zayavki/">Заявки и запросы</Link>
        </p>
      </section>

      <section className={styles.block}>
        <h2 className="ruled">По рубрикам</h2>
        <ul className={styles.spheres}>
          {stats.bySphere.map((sphere) => (
            <li key={sphere.slug} className={styles.sphere}>
              <span className={styles.sphereName}>{sphere.name}</span>
              <span className={styles.bar} aria-hidden="true">
                <span
                  className={styles.barFill}
                  style={{ width: `${Math.round((sphere.done / sphere.total) * 100)}%` }}
                />
              </span>
              <span className={`tabular ${styles.sphereCount}`}>
                {sphere.done} / {sphere.total}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${styles.block} ${styles.pending}`}>
        <h2 className="ruled">Чего здесь пока нет</h2>
        <div className="prose">
          <p>
            Разделы владельца профиля и агентства из §8.5 — статистика просмотров,
            поисковые запросы к профилю, динамика индекса внимания, счета и отчёты —
            требуют двух вещей, которых в проекте ещё нет: базы пользователей
            и сбора событий. Вход тоже общий: роли появятся вместе с базой.
          </p>
          <p>
            Показывать эти экраны с придуманными числами нельзя: отчёт клиенту
            строится ровно из этих данных, и цифра, взятая ниоткуда, обесценивает
            весь кабинет. Появятся вместе с этапом 6 дорожной карты.
          </p>
        </div>
      </section>
    </>
  )
}
