/**
 * Сборка редакционной очереди из списка имён.
 *
 *   npm run queue
 *
 * Читает `content/queue-roster.txt` (рубрики + имена), приводит имена к виду
 * «Имя Фамилия», считает слаг по правилам §4.1 и пишет `content/queue.json`.
 *
 * Зачем это отдельный файл, а не сразу персоны: по §11.2 биографию нельзя
 * опубликовать до того, как есть основание — согласие героя либо статус публичной
 * фигуры при общедоступности сведений. Очередь фиксирует, у кого какое основание
 * и что ещё нужно собрать, и не даёт случайно опубликовать непроверенный текст.
 *
 * Уже опубликованные персоны (файл в content/persons/) помечаются как `published`
 * и выпадают из работы автоматически.
 */
import fs from 'node:fs'
import path from 'node:path'

import { RESERVED_SLUGS } from '../src/lib/site'
import { nameToLatin, slugify } from '../src/lib/translit'
import type { Sphere } from '../src/lib/types'

const root = process.cwd()
const rosterPath = path.join(root, 'content/queue-roster.txt')
const outPath = path.join(root, 'content/queue.json')
const personsDir = path.join(root, 'content/persons')

const spheres = new Set(
  (JSON.parse(fs.readFileSync(path.join(root, 'content/spheres.json'), 'utf8')) as Sphere[]).map(
    (s) => s.slug,
  ),
)

/** Слаги персон, у которых файл есть И статус действительно `published`. */
const published = new Set(
  (fs.existsSync(personsDir) ? fs.readdirSync(personsDir) : [])
    .filter((f) => f.endsWith('.json'))
    .filter((f) => {
      const data = JSON.parse(fs.readFileSync(path.join(personsDir, f), 'utf8')) as {
        status?: string
      }
      return data.status === 'published'
    })
    .map((f) => path.basename(f, '.json')),
)

/** Черновики: файл заведён, но материал ещё не опубликован. */
const drafting = new Set(
  (fs.existsSync(personsDir) ? fs.readdirSync(personsDir) : [])
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.basename(f, '.json')),
)

const PATRONYMIC = /(ович|евич|ьич|инична|ична|овна|евна)$/i
/** Азербайджанские и тюркские отчества вида «Алекпер оглы», «Зуфаровна». */
const PATRONYMIC_TAIL = /^(оглы|оглу|кызы|гызы)$/i

/** Типичные фамильные окончания — нужны, чтобы распознать порядок «Фамилия Имя». */
const SURNAME_ENDING = /(ов|ев|ёв|ин|ын|ский|цкий|ова|ева|ёва|ина|ына|ская|цкая|ко|ук|юк|ян|дзе|швили|ых|их)$/i

/**
 * Приводит запись редактора к паре «полное имя» / «Имя Фамилия».
 * Порядок ФИО определяется по позиции отчества: «Гречищев Александр Владимирович»
 * и «Александр Владимирович Гречищев» дают один и тот же слаг.
 */
function parseName(raw: string): { full: string; display: string } {
  const cleaned = raw.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
  const parts = cleaned.split(' ')

  if (parts.length < 2) return { full: cleaned, display: cleaned }

  const tailIndex = parts.findIndex((p) => PATRONYMIC_TAIL.test(p))
  const patronymicIndex = parts.findIndex((p) => PATRONYMIC.test(p))

  // «Сафаров Эльчин Алекпер оглы»: отчество занимает два слова в конце.
  if (tailIndex > 0) {
    return { full: cleaned, display: `${parts[1]} ${parts[0]}` }
  }

  if (patronymicIndex === 1 && parts.length >= 3) {
    // Имя Отчество Фамилия
    return { full: cleaned, display: `${parts[0]} ${parts.slice(2).join(' ')}` }
  }
  if (patronymicIndex === 2 && parts.length >= 3) {
    // Фамилия Имя Отчество
    return { full: cleaned, display: `${parts[1]} ${parts[0]}` }
  }

  // «Соколов Андрей» — фамилия впереди, отчества нет. Признак: первое слово имеет
  // фамильное окончание, второе — нет. Если оба или ни одного, порядок не трогаем:
  // ошибиться в имени героя хуже, чем оставить запись как её ввёл редактор.
  if (parts.length === 2 && SURNAME_ENDING.test(parts[0]) && !SURNAME_ENDING.test(parts[1])) {
    return { full: cleaned, display: `${parts[1]} ${parts[0]}` }
  }

  // Псевдоним или «Имя Фамилия» — оставляем как есть.
  return { full: cleaned, display: cleaned }
}

export interface QueueEntry {
  slug: string
  /** Как записал редактор — чтобы не потерять исходную форму ФИО. */
  source_name: string
  full_name: string
  display_name: string
  name_latin: string
  sphere: string
  /**
   * queued — в работе не начата; drafting — пишется; published — файл персоны есть;
   * blocked — нет публичных источников, нужна анкета и согласие героя.
   */
  status: 'queued' | 'drafting' | 'published' | 'blocked'
  /** Основание публикации по §11.2. Заполняет редактор. */
  basis?: 'public_figure' | 'consent'
  note?: string
}

const text = fs.readFileSync(rosterPath, 'utf8')
const entries: QueueEntry[] = []
const seen = new Map<string, string>()
const problems: string[] = []

let sphere = ''
for (const line of text.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#') === true) {
    const header = /^##\s+(\S+)/.exec(trimmed)
    if (header) {
      sphere = header[1]
      if (!spheres.has(sphere)) problems.push(`неизвестная сфера «${sphere}» в списке`)
    }
    continue
  }
  if (!sphere) {
    problems.push(`строка «${trimmed}» вне рубрики`)
    continue
  }

  const { full, display } = parseName(trimmed)
  let slug = slugify(display)

  if (RESERVED_SLUGS.has(slug)) {
    problems.push(`слаг «${slug}» (${display}) зарезервирован — нужен суффикс сферы`)
    slug = `${slug}-${sphere}`
  }

  const clash = seen.get(slug)
  if (clash) {
    // §4.1: однофамильцы разводятся суффиксом сферы.
    problems.push(`совпадение слагов: «${display}» и «${clash}» → ${slug}, добавлен суффикс`)
    slug = `${slug}-${sphere}`
  }
  seen.set(slug, display)

  entries.push({
    slug,
    source_name: trimmed,
    full_name: full,
    display_name: display,
    name_latin: nameToLatin(display),
    sphere,
    status: published.has(slug) ? 'published' : drafting.has(slug) ? 'drafting' : 'queued',
  })
}

// Ручные пометки прошлого прогона (status, basis, note) не затираем.
if (fs.existsSync(outPath)) {
  const previous = JSON.parse(fs.readFileSync(outPath, 'utf8')) as QueueEntry[]
  const byslug = new Map(previous.map((e) => [e.slug, e]))
  for (const entry of entries) {
    const old = byslug.get(entry.slug)
    if (!old) continue
    if (old.basis) entry.basis = old.basis
    if (old.note) entry.note = old.note
    if (entry.status !== 'published' && old.status !== 'queued') entry.status = old.status
  }
}

fs.writeFileSync(outPath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8')

const byStatus = entries.reduce<Record<string, number>>((acc, e) => {
  acc[e.status] = (acc[e.status] ?? 0) + 1
  return acc
}, {})

for (const problem of problems) console.warn(`  внимание: ${problem}`)

console.log(`\nОчередь: ${entries.length} персон`)
for (const [status, count] of Object.entries(byStatus)) {
  console.log(`  ${status}: ${count}`)
}
const bySphere = entries.reduce<Record<string, number>>((acc, e) => {
  acc[e.sphere] = (acc[e.sphere] ?? 0) + 1
  return acc
}, {})
console.log('  по рубрикам:', Object.entries(bySphere).map(([s, c]) => `${s} ${c}`).join(', '))
