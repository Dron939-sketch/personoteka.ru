import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { EmptyState, PageHeader } from '@/components/PageHeader'
import { PublicationList } from '@/components/PublicationList'
import { getPerson, getPersons } from '@/lib/content'
import { SITE } from '@/lib/site'

/** Подстраница персоны «Публикации и упоминания» — §4.1. */

// Неизвестный параметр рендерится по запросу и упирается в notFound() ниже — это
// честная 404. С `false` Next вместо неё пишет в лог NoFallbackError на каждый
// битый адрес: страница всё равно отдаётся, но лог засоряется, а причину не видно.
export const dynamicParams = true

export function generateStaticParams() {
  return getPersons()
    .filter((p) => (p.publications?.length ?? 0) + (p.media_mentions?.length ?? 0) > 0)
    .map((person) => ({ slug: person.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const person = getPerson(slug)
  if (!person) return {}

  return {
    title: `${person.display_name} — публикации и упоминания в СМИ`,
    description: `Публикации ${person.display_name} и упоминания в СМИ: список с указанием издания и даты.`,
    alternates: { canonical: `${SITE.url}/${person.slug}/publikacii/` },
  }
}

export default async function PublicationsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const person = getPerson(slug)
  if (!person) notFound()

  const own = person.publications ?? []
  const mentions = person.media_mentions ?? []

  return (
    <div className="container">
      <Breadcrumbs
        items={[{ href: `/${person.slug}/`, label: person.display_name }, { label: 'Публикации' }]}
      />

      <PageHeader
        title="Публикации и упоминания"
        lead={`${person.display_name} — ${person.tagline.toLowerCase()}.`}
        meta={
          <Link href={`/${person.slug}/`}>← Вернуться к биографии</Link>
        }
      />

      {own.length === 0 && mentions.length === 0 ? (
        <EmptyState
          title="Публикаций пока нет"
          hint="Раздел заполняется редакцией по мере появления материалов."
        />
      ) : (
        <div style={{ display: 'grid', gap: 'var(--sp-12)', paddingBottom: 'var(--sp-12)' }}>
          {own.length > 0 && (
            <section>
              <h2 className="ruled">Собственные публикации</h2>
              <PublicationList items={own} />
            </section>
          )}
          {mentions.length > 0 && (
            <section>
              <h2 className="ruled">Упоминания в СМИ</h2>
              <PublicationList items={mentions} />
            </section>
          )}
        </div>
      )}
    </div>
  )
}
