import 'server-only'

import fs from 'node:fs'
import path from 'node:path'

import { dataDir } from './data-dir'
import type { Article, City, Editor, Person, RatingSnapshot, Sphere } from './types'

/**
 * Слой доступа к контенту. Сейчас источник — файлы в `content/`, страницы собираются
 * статически (§9.1). При переезде на headless CMS меняется только этот модуль:
 * сигнатуры функций остаются, страницы не трогаем.
 *
 * Источников персон два. Репозиторий — редакционные материалы, они известны на
 * сборке и кэшируются на процесс. Каталог `persons` внутри `DATA_DIR` — то, что
 * агентства публикуют из кабинета уже после сборки; он перечитывается по времени
 * изменения каталога, иначе новая страница появилась бы только после деплоя.
 * При совпадении слага побеждает репозиторий: редакционная правка сильнее
 * агентской, и подменить чужую страницу через кабинет нельзя.
 */

const CONTENT_DIR = path.join(process.cwd(), 'content')

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, relativePath), 'utf8')) as T
}

/** Кэш на процесс сборки: файлы читаются один раз, а не на каждую из сотен страниц. */
function once<T>(load: () => T): () => T {
  let value: T | undefined
  return () => {
    if (value === undefined) value = load()
    return value
  }
}

const loadSpheres = once<Sphere[]>(() => readJson<Sphere[]>('spheres.json'))
const loadCities = once<City[]>(() => readJson<City[]>('cities.json'))
const loadEditors = once<Editor[]>(() => readJson<Editor[]>('editors.json'))
const loadRating = once<RatingSnapshot>(() => readJson<RatingSnapshot>('rating.json'))

function readPersonDir(dir: string): Person[] {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => {
      // Одна битая карточка не должна ронять каталог целиком.
      try {
        const person = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as Person
        // `updated_at` проставляет фотоконвейер, и у персоны без портрета
        // поля может не быть. Страница и карты сайта считают его обязательным,
        // поэтому по умолчанию дата обновления равна дате публикации.
        person.updated_at ||= person.published_at
        return [person]
      } catch {
        return []
      }
    })
}

const loadRepoPersons = once<Person[]>(() => readPersonDir(path.join(CONTENT_DIR, 'persons')))

/** Каталог агентских публикаций. Появляется только на работающем сервере. */
export function runtimePersonsDir(): string {
  return path.join(dataDir(), 'persons')
}

let runtimeCache: { stamp: number; persons: Person[] } | null = null

function loadRuntimePersons(): Person[] {
  const dir = runtimePersonsDir()
  if (!fs.existsSync(dir)) return []
  // Время изменения каталога меняется при добавлении и удалении файла; правка
  // существующей карточки идёт через тот же код, который каталог и трогает.
  const stamp = fs.statSync(dir).mtimeMs
  if (runtimeCache?.stamp === stamp) return runtimeCache.persons
  const persons = readPersonDir(dir)
  runtimeCache = { stamp, persons }
  return persons
}

function loadAllPersons(): Person[] {
  const repo = loadRepoPersons()
  const known = new Set(repo.map((p) => p.slug))
  // Индекс внимания живёт в снапшоте рейтинга (§6.2) и подмешивается сюда,
  // чтобы значение на карточке и в таблице рейтинга не могли разойтись.
  const index = new Map(loadRating().entries.map((e) => [e.slug, e.attention_index]))
  return [...repo, ...loadRuntimePersons().filter((p) => !known.has(p.slug))]
    .map((person) => ({ ...person, attention_index: index.get(person.slug) }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'ru'))
}

const loadArticles = once<Article[]>(() => {
  const dir = path.join(CONTENT_DIR, 'articles')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as Article)
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
})

/** Публичные персоны: черновики, скрытые и снятые с публикации наружу не отдаются. */
export function getPersons(): Person[] {
  return loadAllPersons().filter((p) => p.status === 'published')
}

/** Все персоны, включая непубличные, — для сборки маршрутов и проверок целостности. */
export function getAllPersonsRaw(): Person[] {
  return loadAllPersons()
}

export function getPerson(slug: string): Person | undefined {
  return getPersons().find((p) => p.slug === slug)
}

export function getArticles(kind?: Article['kind']): Article[] {
  return loadArticles().filter(
    (a) => a.status === 'published' && (kind === undefined || a.kind === kind),
  )
}

export function getArticle(slug: string): Article | undefined {
  return getArticles().find((a) => a.slug === slug)
}

/** Материалы, в которых упомянута персона, — для перелинковки (§5.2). */
export function getArticlesForPerson(slug: string): Article[] {
  return getArticles().filter((a) => a.mentions.includes(slug))
}

export function getSpheres(): Sphere[] {
  return loadSpheres()
}

export function getSphere(slug: string): Sphere | undefined {
  return loadSpheres().find((s) => s.slug === slug)
}

export function getCities(): City[] {
  return loadCities()
}

export function getCity(slug: string): City | undefined {
  return loadCities().find((c) => c.slug === slug)
}

export function getEditor(slug: string): Editor | undefined {
  return loadEditors().find((e) => e.slug === slug)
}

export function getEditors(): Editor[] {
  return loadEditors()
}

export function getRating(): RatingSnapshot {
  return loadRating()
}

/** Позиция персоны в рейтинге — для строки «Индекс 82 · 14-е место в сфере» (§8.1). */
export function getRatingEntry(slug: string) {
  return loadRating().entries.find((e) => e.slug === slug)
}

export function getPersonsBySphere(sphereSlug: string): Person[] {
  return getPersons().filter((p) => p.spheres.includes(sphereSlug))
}

export function getPersonsByCity(citySlug: string): Person[] {
  return getPersons().filter((p) => p.city === citySlug)
}

/** Города, в которых есть хотя бы одна опубликованная персона, — для мега-меню и каталога. */
export function getPopulatedCities(): City[] {
  const used = new Set(getPersons().map((p) => p.city))
  return getCities().filter((c) => used.has(c.slug))
}

/**
 * Похожие персоны для блока внизу страницы (§8.1):
 * сначала совпадение по сфере и городу, затем только по сфере.
 */
/**
 * Слаг основателя проекта. Его карточка ставится первой в «похожих» на каждой
 * биографии — это редакционное решение владельца, а не результат подсчёта
 * близости, и стоит понимать, чем оно оплачено.
 *
 * Блок «Похожие персоны» — обещание: читатель ждёт, что там люди той же
 * профессии или города. Постоянная карточка на всех страницах это обещание
 * частично размывает и для поисковика выглядит сквозным навигационным
 * элементом, а не тематической перелинковкой. Поэтому сделано аккуратно:
 * карточка одна, дублей нет (если основатель и так прошёл по близости, второй
 * раз он не добавляется), на собственной странице его нет, и остальные места
 * в блоке по-прежнему занимает алгоритм.
 */
const FOUNDER_SLUG = 'andrej-mejster'

export function getRelatedPersons(person: Person, limit = 6): Person[] {
  const others = getPersons().filter((p) => p.slug !== person.slug)
  const score = (p: Person) => {
    const sphereHits = p.spheres.filter((s) => person.spheres.includes(s)).length
    const cityHit = p.city && p.city === person.city ? 1 : 0
    return sphereHits * 2 + cityHit
  }
  const ranked = others
    .map((p) => ({ p, s: score(p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (b.p.attention_index ?? 0) - (a.p.attention_index ?? 0))
    .map((x) => x.p)

  const founder = person.slug === FOUNDER_SLUG ? undefined : getPerson(FOUNDER_SLUG)
  if (!founder || founder.status !== 'published') return ranked.slice(0, limit)

  return [founder, ...ranked.filter((p) => p.slug !== FOUNDER_SLUG)].slice(0, limit)
}

/**
 * «Родились сегодня» (§4.1): сравниваем день и месяц по московскому времени.
 * Умершие в подборку не попадают: страница читается как поздравление,
 * и день рождения покойного в этом ряду выглядит бестактно.
 */
export function getBornOn(month: number, day: number): Person[] {
  return getPersons().filter((p) => {
    if (!p.birth_date || p.birth_date_public === false || p.death_date) return false
    const [, m, d] = p.birth_date.split('-').map(Number)
    return m === month && d === day
  })
}

/**
 * Витрина главной — ручной порядок из `content/home-vitrina.txt`.
 *
 * Автоматика тут пока не работает: рейтинг пуст, индекс внимания у всех нулевой,
 * и любая сортировка вырождается в алфавит. А витрине нужно другое — чередование
 * сфер, узнаваемые лица и хорошие портреты подряд. Это редакторская работа,
 * и держать её в текстовом файле честнее, чем прятать в коде.
 *
 * Опечатка в слаге не роняет главную: неизвестные и неопубликованные строки
 * молча пропускаются.
 */
export function getShowcasePersons(limit = 8): Person[] {
  const file = path.join(CONTENT_DIR, 'home-vitrina.txt')
  if (!fs.existsSync(file)) return []

  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((slug) => getPerson(slug))
    .filter((p): p is Person => Boolean(p) && p!.status === 'published')
    .slice(0, limit)
}

export function getNewestPersons(limit = 8): Person[] {
  return [...getPersons()]
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
    .slice(0, limit)
}

/** Первая буква фамилии для алфавитного указателя (§4.1: `/katalog/a/`). */
export function personLetter(person: Person): string {
  const surname = person.full_name.trim().split(/\s+/)[0] ?? ''
  return surname.charAt(0).toUpperCase()
}

export const RU_ALPHABET = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split('')

export function getPersonsByLetter(letter: string): Person[] {
  return getPersons().filter((p) => personLetter(p) === letter.toUpperCase())
}
