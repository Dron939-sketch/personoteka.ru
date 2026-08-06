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

    // Портрет уходит в карту отдельным узлом: биографии ищут по лицу не реже,
    // чем по имени, а картиночный поиск обходит изображения только по прямой
    // ссылке — из `srcset`, собранного на клиенте, он их не достаёт.
    const portrait = person.photos?.find((p) => p.portrait) ?? person.photos?.[0]

    urls.push({
      loc: `${SITE.url}/${person.slug}/`,
      lastmod: person.updated_at,
      changefreq: 'monthly',
      priority: 0.9,
      ...(portrait
        ? {
            image: {
              loc: new URL(portrait.src, SITE.url).toString(),
              caption: portrait.alt ?? `${person.display_name} — ${person.tagline}`,
            },
          }
        : {}),
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
