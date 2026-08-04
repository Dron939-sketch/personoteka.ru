/**
 * Выгрузка исходного материала с личности.ру — сайта-предшественника.
 *
 *   npm run import:lich          # выкачать всё в .import/lichnosty/
 *   npm run import:lich -- --list  # только показать, кого ещё нет в каталоге
 *
 * Что делает: обходит семь рубрик, собирает адреса всех страниц персон,
 * скачивает каждую, вынимает текст биографии и адрес фотографии. Результат —
 * `.import/lichnosty/all.json`, откуда редактор берёт факты при написании
 * биографии и адрес снимка для content/photo-sources.json.
 *
 * Материал служит источником фактов, а не текста. Дословное заимствование
 * недопустимо не только по авторскому праву (сайт принадлежит тому же
 * владельцу), но и по существу: поисковые системы сочли бы новый сайт
 * копией старого и не стали бы его индексировать, а для проекта,
 * живущего с органического трафика, это прямой ущерб.
 *
 * Права на фотографии подтверждены владельцем, поэтому в photo-sources
 * они записываются с основанием «архив редакции».
 */
import fs from 'node:fs'
import path from 'node:path'

const BASE = 'https://lichnosty.ru'
const RUBRICS = ['gosudarstvo', 'znamenitosti', 'obrazovanie', 'sport', 'biznes', 'blogery', 'eksperty']
const OUT = '.import/lichnosty'
const UA = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function get(url: string, tries = 3): Promise<string> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const r = await fetch(url, { headers: UA })
      if (r.ok) return await r.text()
      if (attempt === tries) throw new Error(String(r.status))
    } catch (error) {
      if (attempt === tries) throw error
    }
    await wait(1500 * attempt)
  }
}

const strip = (html: string) =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/g, ' ')

async function collectSlugs(): Promise<Map<string, string>> {
  const found = new Map<string, string>()
  for (const rubric of RUBRICS) {
    for (const page of ['', 'page/2/', 'page/3/', 'page/4/']) {
      let html: string
      try {
        html = await get(`${BASE}/type/${rubric}/${page}`)
      } catch {
        continue
      }
      for (const m of html.matchAll(/https:\/\/lichnosty\.ru\/bio\/([a-z0-9-]+)\//g)) {
        if (!found.has(m[1])) found.set(m[1], rubric)
      }
      await wait(300)
    }
  }
  return found
}

interface Entry {
  slug: string
  rubric: string
  photo: string
  text: string[]
}

async function main() {
  const listOnly = process.argv.includes('--list')
  fs.mkdirSync(OUT, { recursive: true })

  const slugs = await collectSlugs()
  console.log(`Персон на личности.ру: ${slugs.size}`)

  if (listOnly) {
    const dir = path.join(process.cwd(), 'content/persons')
    const done = new Set(
      fs.readdirSync(dir).map((f) => {
        const person = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as { slug: string }
        return person.slug
      }),
    )
    // Слаги у нас свои — по ГОСТ-транслитерации, — поэтому совпадение
    // проверяется приблизительно: по последней части имени.
    const missing = [...slugs].filter(([slug]) => {
      const tail = slug.split('-').pop() ?? slug
      return ![...done].some((our) => our.includes(tail) || tail.includes(our.split('-').pop() ?? ''))
    })
    console.log(`Похоже, ещё не написаны (${missing.length}):`)
    for (const [slug, rubric] of missing) console.log(`  ${rubric.padEnd(13)} ${slug}`)
    return
  }

  const all: Record<string, Entry> = {}
  let n = 0
  for (const [slug, rubric] of slugs) {
    try {
      const html = await get(`${BASE}/bio/${slug}/`)
      const photo = /og:image" content="([^"]+)"/.exec(html)?.[1] ?? ''
      const lines = strip(html)
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 40)
      // Отсекаем подвал: форму комментариев и уведомление о копировании.
      const stop = lines.findIndex((l) => l.includes('Сохранить моё имя') || l.includes('копирование материалов'))
      all[slug] = { slug, rubric, photo, text: lines.slice(0, stop === -1 ? undefined : stop) }
      n += 1
      if (n % 20 === 0) console.log(`  ${n}/${slugs.size}`)
      await wait(200)
    } catch (error) {
      console.warn(`  ${slug}: ${error instanceof Error ? error.message : error}`)
    }
  }

  fs.writeFileSync(path.join(OUT, 'all.json'), JSON.stringify(all, null, 1), 'utf8')
  console.log(`\nГотово: ${n} страниц → ${OUT}/all.json`)
}

void main()
