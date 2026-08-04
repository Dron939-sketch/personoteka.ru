import { getPersons } from '@/lib/content'
import { SITE } from '@/lib/site'
import { XML_HEADERS, urlset, type SitemapUrl } from '@/lib/sitemap'

/** Карта страниц персон (§10.1). Скрытые и `noindex` в карту не попадают. */

export const dynamic = 'force-static'
export const revalidate = 3600

export function GET() {
  const urls: SitemapUrl[] = []

  for (const person of getPersons()) {
    if (person.noindex) continue

    urls.push({
      loc: `${SITE.url}/${person.slug}/`,
      lastmod: person.updated_at,
      changefreq: 'monthly',
      priority: 0.9,
    })

    if ((person.publications?.length ?? 0) + (person.media_mentions?.length ?? 0) > 0) {
      urls.push({
        loc: `${SITE.url}/${person.slug}/publikacii/`,
        lastmod: person.updated_at,
        changefreq: 'monthly',
        priority: 0.5,
      })
    }
  }

  return new Response(urlset(urls), { headers: XML_HEADERS })
}
