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
 * Отправлять весь список каждый день бессмысленно и вредно: поисковик считает
 * заявки на неизменившиеся страницы шумом. По умолчанию скрипт шлёт всё —
 * это режим для первой выкладки, — а в расписании стоит использовать `--since`.
 */
import fs from 'node:fs'
import path from 'node:path'

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
  const key = process.env.INDEXNOW_KEY?.trim()

  if (!dry && !key) {
    console.error(
      'Нет переменной INDEXNOW_KEY. Придумайте строку из 8–128 букв и цифр,\n' +
        'положите её в окружение Amvera и повторите запуск.',
    )
    process.exit(1)
  }
  if (!dry && key && !/^[A-Za-z0-9-]{8,128}$/.test(key)) {
    console.error('INDEXNOW_KEY должен состоять из 8–128 латинских букв, цифр и дефисов.')
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
  const spheres = new Set(persons.flatMap((p) => p.spheres ?? []))
  const cities = new Set(persons.map((p) => p.city).filter(Boolean) as string[])

  const urls = [
    ...(sinceDays === undefined ? SECTIONS : ['/', '/katalog/']),
    ...persons.map((p) => `/${p.slug}/`),
    ...[...spheres].map((s) => `/sfera/${s}/`),
    ...[...cities].map((c) => `/gorod/${c}/`),
  ].map((p) => `${SITE_URL}${p}`)

  console.log(`Адресов к отправке: ${urls.length} (персон: ${persons.length})`)
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
