import 'server-only'

import fs from 'node:fs'
import path from 'node:path'

import { dataDir } from './data-dir'

/**
 * Счётчик просмотров страниц персон.
 *
 * Зачем свой, а не Метрика: цифры нужны внутри кабинета агентства, рядом со
 * страницами. Внешняя аналитика живёт в чужом интерфейсе и требует согласия на
 * cookie — а этот счётчик никаких cookie не ставит и никого не опознаёт: в файл
 * попадает только «сколько раз за день открывали такую-то страницу».
 *
 * Что он НЕ умеет и не должен обещать: источники трафика, поисковые запросы,
 * позиции в выдаче, уникальных посетителей. Для отчёта клиенту этого мало —
 * там по-прежнему нужна Метрика; здесь ровно тот минимум, который честно
 * считается на своём сервере.
 *
 * Хранилище — один JSON вида `{ слаг: { "2026-08-05": 12 } }`. Запись
 * буферизуется в памяти и сбрасывается на диск не чаще раза в пять секунд:
 * иначе популярная страница превратит счётчик в генератор записи на диск.
 * Цена буфера — потеря нескольких просмотров при аварийной остановке; для
 * счётчика это допустимо, для журнала согласий было бы недопустимо.
 */

const FILE = 'prosmotry.json'
const FLUSH_MS = 5000
/** Сколько дней подряд один и тот же адрес не досчитывается повторно. */
const DEDUP_MAX = 20000

type Counts = Record<string, Record<string, number>>

let cache: Counts | null = null
let dirty = false
let lastFlush = 0
const seen = new Set<string>()

function file(): string {
  return path.join(dataDir(), FILE)
}

function load(): Counts {
  if (cache) return cache
  const target = file()
  if (!fs.existsSync(target)) {
    cache = {}
    return cache
  }
  try {
    cache = JSON.parse(fs.readFileSync(target, 'utf8')) as Counts
  } catch {
    cache = {}
  }
  return cache
}

function flush(force = false): void {
  if (!dirty || !cache) return
  const now = Date.now()
  if (!force && now - lastFlush < FLUSH_MS) return
  fs.mkdirSync(dataDir(), { recursive: true, mode: 0o700 })
  fs.writeFileSync(file(), JSON.stringify(cache), { encoding: 'utf8', mode: 0o600 })
  dirty = false
  lastFlush = now
}

/** Сегодняшняя дата в UTC — в том же виде, в каком лежит в файле. */
export function today(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function recordView(slug: string, ip: string, now = new Date()): void {
  const day = today(now)
  const key = `${ip}|${slug}|${day}`
  // Одно открытие одной страницы одним адресом за день. Не «уникальные
  // посетители» — просто защита от перезагрузок и ботов, бьющих в одну точку.
  if (seen.has(key)) return
  if (seen.size > DEDUP_MAX) seen.clear()
  seen.add(key)

  const counts = load()
  const days = (counts[slug] ??= {})
  days[day] = (days[day] ?? 0) + 1
  dirty = true
  flush()
}

/** Просмотры одной страницы по дням. */
export function viewsByDay(slug: string): Record<string, number> {
  flush(true)
  return load()[slug] ?? {}
}

/** Сумма просмотров за последние `days` дней включительно. */
export function viewsLast(slug: string, days: number, now = new Date()): number {
  const from = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
  const border = today(from)
  return Object.entries(viewsByDay(slug))
    .filter(([day]) => day >= border)
    .reduce((sum, [, n]) => sum + n, 0)
}

export function viewsTotal(slug: string): number {
  return Object.values(viewsByDay(slug)).reduce((sum, n) => sum + n, 0)
}
