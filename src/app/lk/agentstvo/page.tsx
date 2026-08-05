import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState, PageHeader } from '@/components/PageHeader'
import { agencyPersons, publishedThisMonth } from '@/lib/agency-publish'
import { formatDate } from '@/lib/format'
import { currentAgency } from '@/lib/lk-session'
import { SITE } from '@/lib/site'
import { viewsLast, viewsTotal } from '@/lib/views'

import styles from './page.module.css'

/**
 * Кабинет агентства: лимит подписки, свои страницы и просмотры по ним.
 *
 * Показывается только то, что действительно считается на нашем сервере. Ни
 * позиций в выдаче, ни источников трафика здесь нет и не будет, пока не появится
 * внешняя аналитика: отчёт клиенту строится ровно из этих чисел, и придуманная
 * цифра обесценивает весь кабинет.
 */

export const metadata: Metadata = {
  title: 'Кабинет агентства',
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE.url}/lk/agentstvo/` },
}

export const dynamic = 'force-dynamic'

export default async function AgencyPage() {
  const agency = await currentAgency()
  if (!agency) {
    return <EmptyState title="Учётная запись агентства не найдена" />
  }

  const persons = agencyPersons(agency.slug).sort((a, b) =>
    b.published_at.localeCompare(a.published_at),
  )
  const used = publishedThisMonth(agency.slug)
  const left = Math.max(0, agency.limit_per_month - used)
  const views30 = persons.reduce((sum, p) => sum + viewsLast(p.slug, 30), 0)

  return (
    <>
      <PageHeader
        title={agency.name}
        lead="Страницы, опубликованные вашим агентством, и просмотры по ним."
        meta={agency.disabled ? 'Подписка приостановлена' : undefined}
      />

      <section className={styles.tiles}>
        <div className={styles.tile}>
          <p className={`caption ${styles.tileLabel}`}>Осталось в этом месяце</p>
          <p className={`tabular ${styles.tileValue}`}>
            {left} / {agency.limit_per_month}
          </p>
          <p className={styles.tileNote}>опубликовано {used}</p>
        </div>
        <div className={styles.tile}>
          <p className={`caption ${styles.tileLabel}`}>Страниц всего</p>
          <p className={`tabular ${styles.tileValue}`}>{persons.length}</p>
          <p className={styles.tileNote}>включая снятые редакцией</p>
        </div>
        <div className={styles.tile}>
          <p className={`caption ${styles.tileLabel}`}>Просмотры за 30 дней</p>
          <p className={`tabular ${styles.tileValue}`}>{views30}</p>
          <p className={styles.tileNote}>по всем страницам агентства</p>
        </div>
      </section>

      <section className={styles.block}>
        <div className={styles.headline}>
          <h2 className="ruled">Мои страницы</h2>
          {!agency.disabled && left > 0 && (
            <Link href="/lk/agentstvo/novaya/" className={styles.action}>
              Новая биография
            </Link>
          )}
        </div>

        {persons.length === 0 ? (
          <EmptyState
            title="Страниц пока нет"
            hint="Первая биография публикуется из формы — она проведёт по всем обязательным полям."
          />
        ) : (
          <div className={styles.scroller}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Страница</th>
                  <th scope="col">Опубликована</th>
                  <th scope="col">Состояние</th>
                  <th scope="col">За 30 дней</th>
                  <th scope="col">Всего</th>
                </tr>
              </thead>
              <tbody>
                {persons.map((person) => (
                  <tr key={person.slug}>
                    <th scope="row" className={styles.name}>
                      {person.status === 'published' ? (
                        <Link href={`/${person.slug}/`}>{person.display_name}</Link>
                      ) : (
                        person.display_name
                      )}
                      <span className={styles.tagline}>{person.tagline}</span>
                    </th>
                    <td className="tabular">{formatDate(person.published_at)}</td>
                    <td>
                      {person.status === 'published' ? (
                        <span className={styles.live}>на сайте</span>
                      ) : (
                        <span className={styles.hidden}>снята редакцией</span>
                      )}
                    </td>
                    <td className="tabular">{viewsLast(person.slug, 30)}</td>
                    <td className="tabular">{viewsTotal(person.slug)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.block}>
        <h2 className="ruled">Что означают эти цифры</h2>
        <div className="prose">
          <p>
            Просмотр — открытие страницы. Один адрес за сутки считается один раз,
            поэтому перезагрузки счётчик не накручивают. Это не «уникальные
            посетители»: людей мы не опознаём и cookie для счёта не ставим.
          </p>
          <p>
            Позиций в поиске и источников перехода здесь нет — их считает внешняя
            аналитика, а её на портале пока не стоит. Если такие данные нужны в
            отчёте клиенту, напишите менеджеру: подключение обсуждается отдельно.
          </p>
          <p>
            Страницу может снять редакция, если материал расходится с{' '}
            <Link href="/redpolitika/">редполитикой</Link>. Снятая страница остаётся
            в этом списке, а место в лимите за неё возвращает менеджер.
          </p>
        </div>
      </section>
    </>
  )
}
