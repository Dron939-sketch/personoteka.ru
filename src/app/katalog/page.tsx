import type { Metadata } from 'next'

import { SITE } from '@/lib/site'

import { CatalogView } from './CatalogView'

/**
 * Первая страница каталога. Остальные лежат на `/katalog/stranica/N/`
 * и рендерятся тем же `CatalogView`.
 */
export const metadata: Metadata = {
  title: 'Каталог персон',
  description:
    'Каталог биографий: фильтры по сфере деятельности, городу и десятилетию рождения, алфавитный указатель.',
  alternates: { canonical: `${SITE.url}/katalog/` },
}

export default function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <CatalogView searchParams={searchParams} page={1} />
}
