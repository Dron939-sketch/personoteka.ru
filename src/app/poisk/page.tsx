import type { Metadata } from 'next'
import { Suspense } from 'react'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PageHeader } from '@/components/PageHeader'
import { SearchResults } from '@/components/SearchResults'
import { SITE } from '@/lib/site'

/**
 * Поиск по порталу (§4.1). Страница закрыта от индексации в `robots.txt` (§10.1):
 * выдача поиска — служебная, в индексе ей делать нечего.
 */

export const metadata: Metadata = {
  title: 'Поиск по «Персонотеке»',
  description: 'Поиск персоны по имени, фамилии и роду занятий.',
  robots: { index: false, follow: true },
  alternates: { canonical: `${SITE.url}/poisk/` },
}

export default function SearchPage() {
  return (
    <div className="container">
      <Breadcrumbs items={[{ label: 'Поиск' }]} />
      <PageHeader
        title="Поиск по «Персонотеке»"
        lead="Введите имя, фамилию или род занятий. Поиск учитывает написание латиницей."
      />
      <Suspense fallback={null}>
        <SearchResults />
      </Suspense>
    </div>
  )
}
