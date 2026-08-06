/** Глобальные константы портала. Единственный источник правды по домену и реквизитам. */

export const SITE = {
  name: 'Персонотека',
  /** §1.3 — позиционирование. Используется в шапке главной и в OG. */
  tagline: 'Архив людей дела',
  promise: 'Биография, которую можно показать',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://personoteka.ru',
  locale: 'ru_RU',
  /** §11.6 — возрастная маркировка. */
  ageRating: '16+',
  email: 'redakciya@personoteka.ru',
  /** До регистрации сетевого издания (§11.5) поле пустое и блок в подвале скрыт. */
  smiCertificate: '',
  legal: {
    entity: '',
    inn: '',
  },
} as const

/**
 * §4.1 — реестр зарезервированных слов. Персона не может занять слаг из этого списка:
 * иначе она перекроет системный раздел (слаги персон живут в корне).
 * Проверяется скриптом `npm run check:content` и функцией `isReservedSlug`.
 */
export const RESERVED_SLUGS = new Set([
  'katalog',
  'sfera',
  'gorod',
  'rejting',
  'rodilis-segodnya',
  'novosti',
  'interv-yu',
  'poisk',
  'razmestit',
  'tarify',
  'redpolitika',
  'redakciya',
  'o-proekte',
  'kontakty',
  'reklama',
  'pravila',
  'politika-konfidencialnosti',
  'udalenie-dannyh',
  'lk',
  'admin',
  'api',
  'assets',
  'static',
  'media',
  'sitemap',
  'sitemap.xml',
  'robots',
  'robots.txt',
  'llms.txt',
  'indexnow',
  'indexnow.txt',
  'feed',
  'rss',
  'login',
  'logout',
  'blog',
  'news',
  'about',
  'search',
  'opensearch.xml',
  'favicon.ico',
  '_next',
])

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase())
}

/** Разделы навигации в шапке (§4.2). */
export const NAV = [
  { href: '/katalog/', label: 'Каталог' },
  { href: '/rejting/', label: 'Рейтинг' },
  { href: '/interv-yu/', label: 'Интервью' },
  { href: '/redpolitika/', label: 'Редполитика' },
] as const
