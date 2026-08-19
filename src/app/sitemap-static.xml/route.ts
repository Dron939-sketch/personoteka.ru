import {
  RU_ALPHABET,
  getArticles,
  getPersons,
  getPersonsByCity,
  getPersonsByLetter,
  getPersonsBySphere,
  getPopulatedCities,
  getSpheres,
  personLetter,
} from '@/lib/content'
import { pageParams } from '@/lib/pagination'
import { SITE } from '@/lib/site'
import { XML_HEADERS, urlset, type SitemapUrl } from '@/lib/sitemap'
import { translit } from '@/lib/translit'

/**
 * Карта витрин и служебных страниц (§10.1).
 * `/poisk/` и `/lk/` сюда не попадают — они закрыты в robots.txt.
 */

export const dynamic = 'force-static'
export const revalidate = 3600

export function GET() {
  const persons = getPersons()

  const urls: SitemapUrl[] = [
    { loc: `${SITE.url}/`, changefreq: 'daily', priority: 1 },
    { loc: `${SITE.url}/katalog/`, changefreq: 'daily', priority: 0.8 },
    { loc: `${SITE.url}/rejting/`, changefreq: 'daily', priority: 0.8 },
    { loc: `${SITE.url}/rodilis-segodnya/`, changefreq: 'daily', priority: 0.6 },
    { loc: `${SITE.url}/proverka-cifrovogo-sleda/`, changefreq: 'monthly', priority: 0.7 },
    // Разделы лент попадают в карту только когда в них что-то есть: сами
    // страницы в этом случае отдают noindex, и звать на них краулера — значит
    // отправлять его в тупик и получать расхождение в отчёте Вебмастера.
    ...(getArticles('interview').length
      ? [{ loc: `${SITE.url}/interv-yu/`, changefreq: 'weekly' as const, priority: 0.6 }]
      : []),
    ...(getArticles('news').length
      ? [{ loc: `${SITE.url}/novosti/`, changefreq: 'weekly' as const, priority: 0.6 }]
      : []),
    ...(getArticles('guide').length
      ? [{ loc: `${SITE.url}/kak-eto-rabotaet/`, changefreq: 'weekly' as const, priority: 0.7 }]
      : []),
    { loc: `${SITE.url}/razmestit/`, changefreq: 'monthly', priority: 0.8 },
    { loc: `${SITE.url}/tarify/`, changefreq: 'monthly', priority: 0.7 },
    { loc: `${SITE.url}/redpolitika/`, changefreq: 'monthly', priority: 0.7 },
    { loc: `${SITE.url}/redakciya/`, changefreq: 'monthly', priority: 0.6 },
    { loc: `${SITE.url}/o-proekte/`, changefreq: 'monthly', priority: 0.6 },
    { loc: `${SITE.url}/kontakty/`, changefreq: 'monthly', priority: 0.5 },
    { loc: `${SITE.url}/reklama/`, changefreq: 'monthly', priority: 0.4 },
    { loc: `${SITE.url}/pravila/`, changefreq: 'yearly', priority: 0.4 },
    { loc: `${SITE.url}/politika-konfidencialnosti/`, changefreq: 'yearly', priority: 0.4 },
    { loc: `${SITE.url}/udalenie-dannyh/`, changefreq: 'yearly', priority: 0.5 },
    { loc: `${SITE.url}/ispolzovanie-ii/`, changefreq: 'yearly', priority: 0.4 },
  ]

  // Алфавитный указатель
  const usedLetters = new Set(persons.map(personLetter))
  for (const letter of RU_ALPHABET) {
    if (!usedLetters.has(letter)) continue
    urls.push({
      loc: `${SITE.url}/katalog/${translit(letter)}/`,
      changefreq: 'weekly',
      priority: 0.5,
    })
  }

  // Рубрики: сферы, города и их пересечения — первые два уровня фильтров (§8.3)
  for (const sphere of getSpheres()) {
    urls.push({ loc: `${SITE.url}/sfera/${sphere.slug}/`, changefreq: 'weekly', priority: 0.7 })

    const cities = new Set(
      persons.filter((p) => p.spheres.includes(sphere.slug) && p.city).map((p) => p.city as string),
    )
    for (const city of cities) {
      urls.push({
        loc: `${SITE.url}/sfera/${sphere.slug}/${city}/`,
        changefreq: 'weekly',
        priority: 0.6,
      })
    }
  }

  for (const city of getPopulatedCities()) {
    urls.push({ loc: `${SITE.url}/gorod/${city.slug}/`, changefreq: 'weekly', priority: 0.7 })
  }

  // Вторые и дальше страницы списков. Без них в карте виден только первый
  // экран каждого раздела: хвост каталога робот нашёл бы лишь по ссылкам
  // пагинации, то есть на несколько переходов глубже и много позже.
  const paged = (base: string, count: number, priority: number) => {
    for (const { page } of pageParams(count)) {
      urls.push({ loc: `${SITE.url}${base}stranica/${page}/`, changefreq: 'weekly', priority })
    }
  }

  paged('/katalog/', persons.length, 0.6)
  for (const letter of RU_ALPHABET) {
    if (!usedLetters.has(letter)) continue
    paged(`/katalog/${translit(letter)}/`, getPersonsByLetter(letter).length, 0.4)
  }
  for (const sphere of getSpheres()) {
    paged(`/sfera/${sphere.slug}/`, getPersonsBySphere(sphere.slug).length, 0.5)
  }
  for (const city of getPopulatedCities()) {
    paged(`/gorod/${city.slug}/`, getPersonsByCity(city.slug).length, 0.5)
  }

  return new Response(urlset(urls), { headers: XML_HEADERS })
}
