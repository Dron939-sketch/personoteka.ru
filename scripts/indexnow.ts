/**
 * Отправка адресов сайта в IndexNow — §10.1.
 *
 *   npm run indexnow                # все страницы персон и разделов
 *   npm run indexnow -- --since=7   # только изменённые за последние 7 дней
 *   npm run indexnow -- --dry       # показать список и ничего не отправлять
 *
 * Запускается после выкладки. Для Яндекса и Bing это единственный способ
 * попросить переобход без ручного захода в Вебмастер; Google протокол
 * не поддерживает и ходит по карте сайта сам.
 *
 * Ключ лежит в `src/lib/site.ts` и оттуда же отдаётся файлом `/indexnow.txt`,
 * который поисковик скачивает для сверки. Настройки окружения не требуется.
 *
 * Отправлять весь список каждый день бессмысленно и вредно: поисковик считает
 * заявки на неизменившиеся страницы шумом. По умолчанию скрипт шлёт всё —
 * это режим для первой выкладки, — а в расписании стоит использовать `--since`.
 */
import fs from 'node:fs'
import path from 'node:path'

import { ARTICLE_ROOT } from '../src/lib/article-href'
import { indexNowKey } from '../src/lib/indexnow'

const ENDPOINT = 'https://api.indexnow.org/IndexNow'
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://personoteka.ru').replace(/\/$/, '')

/** Разделы, которые меняются вместе с каталогом и стоят переобхода. */
const SECTIONS = [
  '/',
  '/katalog/',
  '/rejting/',
  '/rodilis-segodnya/',
  '/tarify/',
  '/razmestit/',
  '/o-proekte/',
  '/redakciya/',
  '/redpolitika/',
]

interface Person {
  slug: string
  status?: string
  updated_at?: string
  published_at?: string
  spheres?: string[]
  city?: string
}

interface Article {
  slug: string
  kind: keyof typeof ARTICLE_ROOT
  published_at?: string
  updated_at?: string
}

/**
 * Редакционные материалы. Раньше их здесь не было, и новая статья узнавалась
 * поисковиком только при следующем обходе карты сайта — то есть ровно тот
 * контент, ради скорости которого протокол и заводят, шёл общим порядком.
 */
function readArticles(): Article[] {
  const dir = path.join(process.cwd(), 'content/articles')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as Article)
}

function readPersons(): Person[] {
  const dir = path.join(process.cwd(), 'content/persons')
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as Person)
    .filter((p) => (p.status ?? 'published') === 'published')
}

function parseArgs() {
  const args = process.argv.slice(2)
  const since = args.find((a) => a.startsWith('--since='))
  return {
    dry: args.includes('--dry'),
    sinceDays: since ? Number(since.split('=')[1]) : undefined,
  }
}

function main() {
  const { dry, sinceDays } = parseArgs()
  // Ключ берётся оттуда же, откуда его отдаёт роут `/indexnow.txt`: два
  // независимых источника рано или поздно разошлись бы, и заявки стали бы
  // отбиваться с 422 — молча, потому что сайт при этом работает нормально.
  const key = indexNowKey()

  if (!dry && !key) {
    console.error('Ключ IndexNow не задан или не проходит проверку формата.')
    process.exit(1)
  }

  let persons = readPersons()
  if (sinceDays !== undefined) {
    if (!Number.isFinite(sinceDays) || sinceDays <= 0) {
      console.error('--since ожидает положительное число дней.')
      process.exit(1)
    }
    const edge = Date.now() - sinceDays * 24 * 60 * 60 * 1000
    persons = persons.filter((p) => {
      const stamp = p.updated_at ?? p.published_at
      return stamp ? Date.parse(stamp) >= edge : false
    })
  }

  // Рубрики и города берутся из самих персон: слать адреса разделов, которых
  // на сайте нет, — верный способ набрать 404 в отчёте Вебмастера.
  let articles = readArticles()
  if (sinceDays !== undefined) {
    const edge = Date.now() - sinceDays * 24 * 60 * 60 * 1000
    articles = articles.filter((a) => {
      const stamp = a.updated_at ?? a.published_at
      return stamp ? Date.parse(stamp) >= edge : false
    })
  }

  const spheres = new Set(persons.flatMap((p) => p.spheres ?? []))
  const cities = new Set(persons.map((p) => p.city).filter(Boolean) as string[])

  const urls = [
    ...(sinceDays === undefined ? SECTIONS : ['/', '/katalog/']),
    ...persons.map((p) => `/${p.slug}/`),
    ...articles.map((a) => `${ARTICLE_ROOT[a.kind]}${a.slug}/`),
    ...[...spheres].map((s) => `/sfera/${s}/`),
    ...[...cities].map((c) => `/gorod/${c}/`),
  ].map((p) => `${SITE_URL}${p}`)

  console.log(
    `Адресов к отправке: ${urls.length} (персон: ${persons.length}, материалов: ${articles.length})`,
  )
  if (dry) {
    urls.slice(0, 20).forEach((u) => console.log('  ' + u))
    if (urls.length > 20) console.log(`  … и ещё ${urls.length - 20}`)
    return
  }

  const host = new URL(SITE_URL).host
  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation: `${SITE_URL}/indexnow.txt`, urlList: urls }),
  })
    .then((r) => {
      if (r.ok) console.log(`Принято: HTTP ${r.status}`)
      else if (r.status === 403) console.error('403: ключ не принят — проверьте /indexnow.txt')
      else if (r.status === 422) console.error('422: ключ в файле не совпадает с отправленным')
      else console.error(`Ошибка: HTTP ${r.status}`)
    })
    .catch((e) => console.error('IndexNow недоступен:', e instanceof Error ? e.message : e))
}

main()
