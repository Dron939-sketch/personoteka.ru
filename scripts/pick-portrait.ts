/**
 * Подбор портрета: показать кандидатов, а не брать первый попавшийся.
 *
 *   npm run photo:pick -- <slug> [запрос]
 *
 * Скрипт собирает все свободные снимки персоны на Викискладе — из категории
 * и из свойства P18 Викиданных, — отсеивает по объективным пунктам критерия
 * (см. design/photos/README.md) и складывает уцелевших в контактный лист
 * с номерами. Выбор делает человек: пункты про свет, фон, тёмные очки
 * и групповые кадры автоматике недоступны.
 *
 * Выбранный номер записывается в content/photo-sources.json режимом `commons`,
 * после чего обычный `npm run photos:fetch --force` ставит портрет на место.
 */
import fs from 'node:fs'
import path from 'node:path'

import sharp, { type OverlayOptions } from 'sharp'

import { isFreeLicense } from './lib/portrait'
import type { Person } from '../src/lib/types'

const UA = { 'User-Agent': 'personoteka-photo-bot/1.0 (https://personoteka.ru)' }
const OUT = 'design/photos/candidates'

interface Candidate {
  title: string
  url: string
  width: number
  height: number
  license: string
  author: string
  score: number
  reason: string[]
}

async function api(base: string, params: Record<string, string>): Promise<any> {
  const u = new URL(base)
  u.searchParams.set('format', 'json')
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  const r = await fetch(u, { headers: UA })
  if (!r.ok) throw new Error(`${base} → ${r.status}`)
  return r.json()
}

const strip = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Названия, по которым видно, что в кадре не один человек. */
const GROUP = /\b(and|with|group|meeting|press.?conference|delegation)\b|\bи\b|встреч|совещан|заседан|перегово/i

/**
 * Оценка по тем пунктам критерия, которые поддаются проверке.
 * Всё остальное — свет, фон, очки, ракурс — остаётся человеку.
 */
function score(c: Omit<Candidate, 'score' | 'reason'>): { score: number; reason: string[] } {
  const reason: string[] = []
  let s = 0

  const ratio = c.height / c.width
  if (ratio >= 1.15) {
    s += 30
    reason.push('вертикальный')
  } else if (ratio >= 0.95) {
    s += 15
    reason.push('квадратный')
  } else {
    s -= 25
    reason.push('горизонтальный')
  }

  if (c.width >= 1200 && c.height >= 1500) {
    s += 30
    reason.push('разрешение с запасом')
  } else if (c.width >= 900 && c.height >= 1100) {
    s += 10
    reason.push('разрешение впритык')
  } else {
    s -= 20
    reason.push(`мелкий (${c.width}×${c.height})`)
  }

  if (GROUP.test(c.title)) {
    s -= 30
    reason.push('похоже на групповой кадр')
  }
  if (/cropped|portrait|headshot|face/i.test(c.title)) {
    s += 15
    reason.push('кадрирован под портрет')
  }
  if (/^cc0|public domain|^cc[ -]by[ -]\d/i.test(c.license)) {
    s += 5
    reason.push('лицензия без условий об производных')
  }

  return { score: s, reason }
}

async function candidatesFor(query: string): Promise<string[]> {
  const titles = new Set<string>()

  // Категория персоны — там лежит всё, что о ней загружено.
  const cats = await api('https://commons.wikimedia.org/w/api.php', {
    action: 'query',
    list: 'search',
    srnamespace: '14',
    srsearch: query,
    srlimit: '3',
  })
  for (const cat of cats.query?.search ?? []) {
    const members = await api('https://commons.wikimedia.org/w/api.php', {
      action: 'query',
      list: 'categorymembers',
      cmtitle: cat.title,
      cmtype: 'file',
      cmlimit: '50',
    })
    for (const m of members.query?.categorymembers ?? []) titles.add(m.title)
  }

  // Поиск по файлам — на случай, если категории нет.
  const files = await api('https://commons.wikimedia.org/w/api.php', {
    action: 'query',
    list: 'search',
    srnamespace: '6',
    srsearch: query,
    srlimit: '30',
  })
  for (const f of files.query?.search ?? []) titles.add(f.title)

  return [...titles].filter((t) => /\.(jpe?g|png)$/i.test(t))
}

async function describe(titles: string[]): Promise<Candidate[]> {
  const out: Candidate[] = []
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20)
    const data = await api('https://commons.wikimedia.org/w/api.php', {
      action: 'query',
      titles: batch.join('|'),
      prop: 'imageinfo',
      iiprop: 'url|size|extmetadata',
    })
    for (const page of Object.values<any>(data.query?.pages ?? {})) {
      const info = page.imageinfo?.[0]
      if (!info) continue
      const extra = info.extmetadata ?? {}
      const license = strip(extra.LicenseShortName?.value ?? '')
      if (!isFreeLicense(license)) continue
      const base = {
        title: page.title as string,
        url: String(info.url),
        width: Number(info.width),
        height: Number(info.height),
        license,
        author: strip(extra.Artist?.value ?? ''),
      }
      out.push({ ...base, ...score(base) })
    }
  }
  return out.sort((a, b) => b.score - a.score)
}

async function sheet(list: Candidate[], slug: string): Promise<string> {
  const CELL = 240
  const CELL_H = 300
  const LABEL = 22
  const COLS = 4
  const rows = Math.ceil(list.length / COLS)
  const composites: OverlayOptions[] = []

  for (const [i, c] of list.entries()) {
    const r = await fetch(c.url, { headers: UA })
    const buf = Buffer.from(await r.arrayBuffer())
    const thumb = await sharp(buf).rotate().resize(CELL, CELL_H, { fit: 'contain', background: '#eee' }).toBuffer()
    const x = (i % COLS) * CELL
    const y = Math.floor(i / COLS) * (CELL_H + LABEL)
    composites.push({ input: thumb, left: x, top: y })
    const label = `${i + 1}. ${c.width}×${c.height} · ${c.license}`
    composites.push({
      input: Buffer.from(
        `<svg width="${CELL}" height="${LABEL}"><rect width="100%" height="100%" fill="#fff"/>` +
          `<text x="4" y="15" font-family="sans-serif" font-size="12">${label}</text></svg>`,
      ),
      left: x,
      top: y + CELL_H,
    })
  }

  fs.mkdirSync(OUT, { recursive: true })
  const file = path.join(OUT, `${slug}.png`)
  await sharp({
    create: { width: COLS * CELL, height: rows * (CELL_H + LABEL), channels: 3, background: '#fff' },
  })
    .composite(composites)
    .png()
    .toFile(file)
  return file
}

async function main() {
  const [slug, ...rest] = process.argv.slice(2)
  if (!slug) {
    console.error('Использование: npm run photo:pick -- <slug> [поисковый запрос]')
    process.exit(1)
  }

  const personPath = path.join(process.cwd(), 'content/persons', `${slug}.json`)
  const person = fs.existsSync(personPath)
    ? (JSON.parse(fs.readFileSync(personPath, 'utf8')) as Person)
    : undefined
  const query = rest.join(' ') || person?.display_name || slug

  const titles = await candidatesFor(query)
  console.log(`Найдено файлов: ${titles.length}. Запрос: «${query}»`)

  const all = await describe(titles)
  const top = all.slice(0, 12)
  if (!top.length) {
    console.log('Свободных снимков не нашлось.')
    return
  }

  for (const [i, c] of top.entries()) {
    console.log(
      `${String(i + 1).padStart(2)}. [${String(c.score).padStart(3)}] ${c.width}×${c.height} ` +
        `${c.license} — ${c.title.replace(/^File:/, '')}\n      ${c.reason.join(', ')}`,
    )
  }

  const file = await sheet(top, slug)
  console.log(`\nКонтактный лист: ${file}`)
  console.log('Выбранный файл впишите в content/photo-sources.json режимом commons.')
}

void main()
