import 'server-only'

import fs from 'node:fs'
import path from 'node:path'

import type { Article, City, Editor, Person, RatingSnapshot, Sphere } from './types'

/**
 * Слой доступа к контенту. Сейчас источник — файлы в `content/`, страницы собираются
 * статически (§9.1). При переезде на headless CMS меняется только этот модуль:
 * сигнатуры функций остаются, страницы не трогаем.
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

const loadAllPersons = once<Person[]>(() => {
  const dir = path.join(CONTENT_DIR, 'persons')
  if (!fs.existsSync(dir)) return []
  // Индекс внимания живёт в снапшоте рейтинга (§6.2) и подмешивается сюда,
  // чтобы значение на карточке и в таблице рейтинга не могли разойтись.
  const index = new Map(loadRating().entries.map((e) => [e.slug, e.attention_index]))
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const person = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as Person
      return { ...person, attention_index: index.get(person.slug) }
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'ru'))
})

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
export function getRelatedPersons(person: Person, limit = 6): Person[] {
  const others = getPersons().filter((p) => p.slug !== person.slug)
  const score = (p: Person) => {
    const sphereHits = p.spheres.filter((s) => person.spheres.includes(s)).length
    const cityHit = p.city && p.city === person.city ? 1 : 0
    return sphereHits * 2 + cityHit
  }
  return others
    .map((p) => ({ p, s: score(p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (b.p.attention_index ?? 0) - (a.p.attention_index ?? 0))
    .slice(0, limit)
    .map((x) => x.p)
}

/** «Родились сегодня» (§4.1): сравниваем день и месяц по московскому времени. */
export function getBornOn(month: number, day: number): Person[] {
  return getPersons().filter((p) => {
    if (!p.birth_date || p.birth_date_public === false) return false
    const [, m, d] = p.birth_date.split('-').map(Number)
    return m === month && d === day
  })
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
