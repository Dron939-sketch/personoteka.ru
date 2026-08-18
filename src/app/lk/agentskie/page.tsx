import type { Metadata } from 'next'
import Link from 'next/link'

import { AgencyAccountForm } from '@/components/AgencyAccountForm'
import { AgencyMaterialActions } from '@/components/AgencyMaterialActions'
import { EmptyState, PageHeader } from '@/components/PageHeader'
import { listAgencies } from '@/lib/agencies'
import { publishedThisMonth } from '@/lib/agency-publish'
import { getAllPersonsRaw } from '@/lib/content'
import { formatDate } from '@/lib/format'
import { SITE } from '@/lib/site'
import { viewsLast, viewsTotal } from '@/lib/views'

import styles from './page.module.css'

/**
 * Материалы агентств — экран постпроверки.
 *
 * Агентские страницы публикуются без ожидания редакции, поэтому этот список и
 * есть редакционный контроль: новые сверху, у каждой — ссылка на страницу и
 * кнопка снятия. Проверка постфактум работает ровно настолько, насколько
 * регулярно кто-то сюда заходит; чтобы это было видно, у каждой страницы стоит
 * дата публикации, а не только имя.
 */

export const metadata: Metadata = {
  title: 'Материалы агентств',
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE.url}/lk/agentskie/` },
}

export const dynamic = 'force-dynamic'

export default function AgencyMaterialsPage() {
  const agencies = listAgencies()
  const persons = getAllPersonsRaw()
    .filter((p) => p.agency)
    .sort((a, b) => b.published_at.localeCompare(a.published_at))

  return (
    <>
      <PageHeader
        title="Материалы агентств"
        lead="Страницы, опубликованные по подписке. Проверка редакции — постфактум."
        meta={`Агентств: ${agencies.length} · страниц: ${persons.length}`}
      />

      {/* Заведение доступа — здесь же, где контроль материалов. На хостинге
          у владельца нет консоли, и CLI-скрипт недоступен; без этой формы
          тариф «Доступ для агентств» было бы физически некому включить. */}
      <section className={styles.block}>
        <h2 className="ruled">Завести доступ агентству</h2>
        <AgencyAccountForm />
      </section>

      {agencies.length === 0 ? (
        <EmptyState
          title="Агентств пока нет"
          hint="Заполните форму выше: логин и пароль передаются агентству, лимит — из договора."
        />
      ) : (
        <section className={styles.block}>
          <h2 className="ruled">Подписки</h2>
          <ul className={styles.agencies}>
            {agencies.map((agency) => (
              <li key={agency.slug} className={styles.agency}>
                <span className={styles.agencyName}>
                  {agency.name}
                  {agency.disabled && <span className={styles.paused}>приостановлена</span>}
                </span>
                <span className={`tabular ${styles.agencyCount}`}>
                  {publishedThisMonth(agency.slug)} / {agency.limit_per_month} за месяц
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.block}>
        <h2 className="ruled">Страницы</h2>

        {persons.length === 0 ? (
          <EmptyState title="Агентства пока ничего не опубликовали" />
        ) : (
          <ul className={styles.list}>
            {persons.map((person) => (
              <li key={person.slug} className={styles.card}>
                <div className={styles.head}>
                  <p className={styles.name}>
                    <Link href={`/${person.slug}/`}>{person.display_name}</Link>
                    <span className={styles.tagline}>{person.tagline}</span>
                  </p>
                  <span
                    className={person.status === 'published' ? styles.live : styles.hiddenMark}
                  >
                    {person.status === 'published' ? 'на сайте' : 'снята'}
                  </span>
                </div>

                <dl className={styles.meta}>
                  <div>
                    <dt>Агентство</dt>
                    <dd>{person.agency?.name}</dd>
                  </div>
                  <div>
                    <dt>Опубликована</dt>
                    <dd className="tabular">{formatDate(person.published_at)}</dd>
                  </div>
                  <div>
                    <dt>Источников</dt>
                    <dd className="tabular">{person.sources?.length ?? 0}</dd>
                  </div>
                  <div>
                    <dt>Просмотры</dt>
                    <dd className="tabular">
                      {viewsLast(person.slug, 30)} за 30 дней · {viewsTotal(person.slug)} всего
                    </dd>
                  </div>
                </dl>

                <AgencyMaterialActions
                  slug={person.slug}
                  published={person.status === 'published'}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
