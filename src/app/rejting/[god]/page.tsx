import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PageHeader } from '@/components/PageHeader'
import { RatingTable } from '@/components/RatingTable'
import { getPerson, getRating, getSpheres } from '@/lib/content'
import { formatDate } from '@/lib/format'
import { SITE } from '@/lib/site'

/**
 * Годовые итоги рейтинга — `/rejting/2026/` (§4.1, §6.2).
 * Итоги публикуются после ручного аудита топ-20; до конца года страница показывает
 * текущий срез и говорит об этом прямо.
 */

// Неизвестный параметр рендерится по запросу и упирается в notFound() ниже — это
// честная 404. С `false` Next вместо неё пишет в лог NoFallbackError на каждый
// битый адрес: страница всё равно отдаётся, но лог засоряется, а причину не видно.
export const dynamicParams = true

/** Итоги ведутся с года запуска портала. */
const FIRST_YEAR = 2026

export function generateStaticParams() {
  const currentYear = Number(getRating().computed_at.slice(0, 4))
  const years: { god: string }[] = []
  for (let year = FIRST_YEAR; year <= currentYear; year += 1) {
    years.push({ god: String(year) })
  }
  return years
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ god: string }>
}): Promise<Metadata> {
  const { god } = await params
  return {
    title: `Индекс внимания: итоги ${god} года`,
    description: `Годовые итоги индекса внимания «Персонотеки» за ${god} год.`,
    alternates: { canonical: `${SITE.url}/rejting/${god}/` },
  }
}

export default async function RatingYearPage({ params }: { params: Promise<{ god: string }> }) {
  const { god } = await params
  const year = Number(god)
  if (!Number.isInteger(year) || year < FIRST_YEAR) notFound()

  const rating = getRating()
  const snapshotYear = Number(rating.computed_at.slice(0, 4))
  if (year > snapshotYear) notFound()

  const isFinal = year < snapshotYear
  const rows = rating.entries.slice(0, 20).flatMap((entry) => {
    const person = getPerson(entry.slug)
    return person ? [{ entry, person }] : []
  })

  return (
    <div className="container">
      <Breadcrumbs
        items={[{ href: '/rejting/', label: 'Индекс внимания' }, { label: `Итоги ${year}` }]}
      />

      <PageHeader
        title={`Индекс внимания: итоги ${year} года`}
        lead={
          isFinal
            ? `Топ-20 по итогам ${year} года. Состав проверен редакцией вручную перед публикацией.`
            : `Год ещё не закончен: показан текущий срез на ${formatDate(rating.computed_at)}. Итоговый список будет опубликован после ручной проверки топ-20.`
        }
        meta={<Link href="/rejting/">К текущему рейтингу</Link>}
      />

      <div style={{ paddingBottom: 'var(--sp-16)' }}>
        <RatingTable
          rows={rows}
          spheres={getSpheres()}
          caption={
            isFinal
              ? `Итоговый топ-20 за ${year} год.`
              : `Предварительный топ-20, срез от ${formatDate(rating.computed_at)}.`
          }
        />
      </div>
    </div>
  )
}
