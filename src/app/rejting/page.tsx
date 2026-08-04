import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { EmptyState, PageHeader } from '@/components/PageHeader'
import { RatingTable } from '@/components/RatingTable'
import { getPerson, getRating, getSpheres } from '@/lib/content'
import { formatDate } from '@/lib/format'
import { itemListJsonLd } from '@/lib/jsonld'
import { FRESHNESS_HALF_LIFE_DAYS, WEIGHTS } from '@/lib/rating'
import { SITE } from '@/lib/site'

import styles from './page.module.css'

/**
 * Индекс внимания (§6.2). Публичная методика — часть продукта: рейтинг, устройство
 * которого не объяснено, не отличим от рекламной подборки.
 */

export const metadata: Metadata = {
  title: 'Индекс внимания',
  description:
    'Рейтинг персон по индексу внимания: интерес аудитории за 30 дней, нормализованный внутри когорты сферы. Методика расчёта открыта.',
  alternates: { canonical: `${SITE.url}/rejting/` },
}

export const revalidate = 3600

export default function RatingPage() {
  const rating = getRating()
  const spheres = getSpheres()

  const rows = rating.entries.flatMap((entry) => {
    const person = getPerson(entry.slug)
    return person ? [{ entry, person }] : []
  })

  const bySphere = spheres
    .map((sphere) => ({
      sphere,
      rows: rows.filter((r) => r.entry.sphere === sphere.slug),
    }))
    .filter((group) => group.rows.length > 1)

  return (
    <div className="container">
      <JsonLd data={itemListJsonLd(rows.map((r) => r.person), 'Индекс внимания')} />

      <Breadcrumbs items={[{ label: 'Индекс внимания' }]} />

      <PageHeader
        title="Индекс внимания"
        lead="Показатель интереса аудитории к странице персоны за последние 30 дней. Нормализуется внутри когорты сферы: врач соревнуется с врачами, а не с артистами."
        meta={
          <>
            Последний пересчёт: {formatDate(rating.computed_at)} ·{' '}
            <Link href="/rejting/2026/">Итоги 2026 года</Link>
          </>
        }
      />

      <section className={styles.section}>
        {rows.length === 0 ? (
          <EmptyState
            title="Рейтинг ещё не рассчитан"
            hint={
              <>
                Индекс считается по поведению аудитории за 30 дней. Пока данных
                недостаточно, места не присваиваются: показывать одинаковое число у всех
                значило бы выдавать отсутствие статистики за результат. Методика расчёта —
                ниже на этой странице.
              </>
            }
          />
        ) : (
          <RatingTable
            rows={rows}
            spheres={spheres}
            caption="Общий рейтинг. Значение индекса — от 0 до 100."
          />
        )}
      </section>

      {bySphere.map(({ sphere, rows: sphereRows }) => (
        <section key={sphere.slug} className={`${styles.section} deferred`}>
          <h2 className="ruled">{sphere.name}</h2>
          <RatingTable
            rows={sphereRows}
            spheres={spheres}
            inSphere
            caption={`Рейтинг внутри сферы «${sphere.name}».`}
          />
        </section>
      ))}

      <section className={`${styles.method} deferred`}>
        <h2 className="ruled">Как считается индекс</h2>
        <div className="prose">
          <p>
            Индекс собирается из пяти составляющих. Каждая нормализуется минимаксом внутри
            когорты сферы, поэтому величина аудитории самой сферы на результат не влияет.
          </p>
          <ul>
            <li>
              Внутренние поисковые запросы по персоне за 30 дней —{' '}
              <span className="tabular">{pct(WEIGHTS.searches)}</span>
            </li>
            <li>
              Уникальные просмотры страницы за 30 дней —{' '}
              <span className="tabular">{pct(WEIGHTS.views)}</span>
            </li>
            <li>
              Глубина чтения: доля дочитавших до 75 % —{' '}
              <span className="tabular">{pct(WEIGHTS.depth)}</span>
            </li>
            <li>
              Переходы по внешним ссылкам персоны —{' '}
              <span className="tabular">{pct(WEIGHTS.outbound)}</span>
            </li>
            <li>
              Свежесть страницы: экспоненциальное затухание с полураспадом{' '}
              <span className="tabular">{FRESHNESS_HALF_LIFE_DAYS}</span> дней —{' '}
              <span className="tabular">{pct(WEIGHTS.freshness)}</span>
            </li>
          </ul>
          <p>
            Пересчёт идёт раз в сутки ночью, история сохраняется — из неё строится динамика
            места. Данные очищаются от ботов, дедуплицируются по паре «IP + браузер», на
            каждый источник действует ограничение вклада.
          </p>
          <p>
            Накрутка показателей означает снятие персоны с рейтинга на 90 дней. Топ-20 перед
            публикацией годовых итогов проверяется вручную. Условие зафиксировано в{' '}
            <Link href="/pravila/">правилах пользования</Link>.
          </p>
        </div>
      </section>
    </div>
  )
}

function pct(weight: number): string {
  return `${Math.round(weight * 100)} %`
}
