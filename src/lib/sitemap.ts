import 'server-only'

/** Сборка XML карт сайта (§10.1). Имена файлов заданы ТЗ, поэтому это route-хендлеры. */

export interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  priority?: number
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function urlset(urls: SitemapUrl[]): string {
  const body = urls
    .map((url) => {
      const parts = [`    <loc>${escapeXml(url.loc)}</loc>`]
      if (url.lastmod) parts.push(`    <lastmod>${url.lastmod.slice(0, 10)}</lastmod>`)
      if (url.changefreq) parts.push(`    <changefreq>${url.changefreq}</changefreq>`)
      if (url.priority !== undefined) parts.push(`    <priority>${url.priority.toFixed(1)}</priority>`)
      return `  <url>\n${parts.join('\n')}\n  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

export function sitemapIndex(maps: { loc: string; lastmod?: string }[]): string {
  const body = maps
    .map((map) => {
      const lastmod = map.lastmod ? `\n    <lastmod>${map.lastmod.slice(0, 10)}</lastmod>` : ''
      return `  <sitemap>\n    <loc>${escapeXml(map.loc)}</loc>${lastmod}\n  </sitemap>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`
}

export const XML_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  // Карты пересобираются при публикации; час кэша не мешает переобходу.
  'Cache-Control': 'public, max-age=3600, s-maxage=3600',
}
