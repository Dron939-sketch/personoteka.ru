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
  /**
   * Свои площадки. Ссылки на них в материалах идут без `nofollow`.
   *
   * Правило «портал не торгует ссылочным весом» касается чужих ссылок —
   * оплаченных размещений и присланных материалов. Ссылка на собственный
   * первоисточник проекта ничего не продаёт: она указывает, где текст вышел
   * впервые, и закрывать её от поисковика значит прятать авторство.
   */
  ownDomains: ['meysternlp.ru'],

  /** До регистрации сетевого издания (§11.5) поле пустое и блок в подвале скрыт. */
  smiCertificate: '',
  legal: {
    entity: '',
    inn: '',
  },
} as const

/**
 * Номер счётчика Яндекс.Метрики. Не секрет — он и так виден в исходном коде
 * страницы, — поэтому лежит в репозитории, а не в переменных окружения:
 * иначе после каждого переноса хостинга статистика молча обрывалась бы.
 * `0` выключает аналитику целиком; счётчик работает только на своём домене
 * и только после согласия на аналитические cookie (см. `components/Metrika`).
 */
export const METRIKA_ID = Number(process.env.NEXT_PUBLIC_METRIKA_ID ?? 111742977)

/**
 * Код подтверждения прав в Яндекс.Вебмастере.
 *
 * Не секрет — он и так виден в исходном коде каждой страницы, — поэтому лежит
 * в репозитории, а не только в переменных окружения: иначе после переноса
 * хостинга подтверждение молча слетело бы, а Яндекс перепроверяет права
 * периодически. Тот же код продублирован файлом `public/yandex_<код>.html`:
 * два независимых способа подтверждения дешевле, чем один потерянный.
 */
export const YANDEX_VERIFICATION = process.env.YANDEX_VERIFICATION ?? 'd3cdb8df76f8c5c3'

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
  'proverka-cifrovogo-sleda',
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
  { href: '/kak-eto-rabotaet/', label: 'Как это работает' },
  { href: '/interv-yu/', label: 'Интервью' },
  { href: '/redpolitika/', label: 'Редполитика' },
] as const
