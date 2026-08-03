import { getArticles, getPersons } from '@/lib/content'
import { SITE } from '@/lib/site'
import { XML_HEADERS, sitemapIndex } from '@/lib/sitemap'

/** Индекс карт сайта (§10.1). */

export const dynamic = 'force-static'
export const revalidate = 3600

export function GET() {
  const persons = getPersons()
  const articles = getArticles()

  const latest = (dates: string[]) => dates.sort().at(-1)

  const xml = sitemapIndex([
    {
      loc: `${SITE.url}/sitemap-static.xml`,
    },
    {
      loc: `${SITE.url}/sitemap-persons.xml`,
      lastmod: latest(persons.map((p) => p.updated_at)),
    },
    ...(articles.length
      ? [
          {
            loc: `${SITE.url}/sitemap-articles.xml`,
            lastmod: latest(articles.map((a) => a.updated_at)),
          },
        ]
      : []),
  ])

  return new Response(xml, { headers: XML_HEADERS })
}
