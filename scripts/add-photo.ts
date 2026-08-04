/**
 * Приём портрета персоны — §7.5 ТЗ.
 *
 *   npx tsx scripts/add-photo.ts <slug> <путь-к-файлу> \
 *     --author="И. Фотографов" --license="CC BY 4.0" --source="https://…"
 *
 * Делает из произвольного снимка портрет по правилам дизайн-системы:
 * кадрирует в 4:5, приводит к 1200×1500 и применяет единую мягкую коррекцию —
 * контраст +4, насыщенность −6. Смысл коррекции в том, чтобы галерея портретов
 * от разных фотографов выглядела как один каталог, а не как сборная солянка.
 *
 * Кадрирование по умолчанию — по «вниманию»: sharp сам находит самую значимую
 * область кадра, и для портрета это почти всегда лицо. Если промахнулся,
 * есть --gravity=north|centre|south.
 *
 * Скрипт сразу прописывает фотографию в файл персоны вместе с данными о правах:
 * без них снимок публиковать нельзя, а свободные лицензии ещё и требуют
 * указывать автора рядом с изображением.
 */
import fs from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

import type { Person, Photo } from '../src/lib/types'

const WIDTH = 1200
const HEIGHT = 1500 // 4:5 — §7.5

interface Options {
  slug: string
  file: string
  author?: string
  license?: string
  source?: string
  gravity: string
  caption?: string
}

function parseArgs(): Options {
  const [slug, file, ...rest] = process.argv.slice(2)
  if (!slug || !file) {
    console.error(
      'Использование: npx tsx scripts/add-photo.ts <slug> <файл> ' +
        '[--author="…"] [--license="…"] [--source="…"] [--caption="…"] [--gravity=attention]',
    )
    process.exit(1)
  }
  const opts: Record<string, string> = {}
  for (const arg of rest) {
    const m = /^--([\w-]+)=(.*)$/.exec(arg)
    if (m) opts[m[1]] = m[2]
  }
  return {
    slug,
    file,
    author: opts.author,
    license: opts.license,
    source: opts.source,
    caption: opts.caption,
    gravity: opts.gravity ?? 'attention',
  }
}

function position(gravity: string) {
  if (gravity === 'attention') return sharp.strategy.attention
  if (gravity === 'entropy') return sharp.strategy.entropy
  return gravity // north / centre / south и т. п.
}

async function main() {
  const o = parseArgs()
  const root = process.cwd()
  const personPath = path.join(root, 'content/persons', `${o.slug}.json`)

  if (!fs.existsSync(personPath)) {
    console.error(`Нет персоны с слагом «${o.slug}»: ${personPath}`)
    process.exit(1)
  }
  if (!fs.existsSync(o.file)) {
    console.error(`Файл не найден: ${o.file}`)
    process.exit(1)
  }

  const source = sharp(o.file)
  const meta = await source.metadata()
  if (!meta.width || !meta.height) {
    console.error('Не удалось прочитать размеры изображения')
    process.exit(1)
  }
  // §7.5: минимум 1200×1500. Растягивать меньший оригинал бессмысленно —
  // портрет станет мыльным, и это будет видно на витрине.
  if (meta.width < WIDTH || meta.height < HEIGHT) {
    console.warn(
      `  внимание: оригинал ${meta.width}×${meta.height} меньше требуемых ${WIDTH}×${HEIGHT} — ` +
        'портрет будет апскейлиться и потеряет резкость',
    )
  }

  const mediaDir = path.join(root, 'public/media')
  fs.mkdirSync(mediaDir, { recursive: true })
  const outName = `${o.slug}.jpg`
  const outPath = path.join(mediaDir, outName)

  await sharp(o.file)
    .rotate() // учитываем EXIF-ориентацию, иначе портрет может лечь набок
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: position(o.gravity) })
    .modulate({ saturation: 0.94 }) // насыщенность −6 %
    .linear(1.04, -(128 * 0.04)) // контраст +4 %
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(outPath)

  const person = JSON.parse(fs.readFileSync(personPath, 'utf8')) as Person

  const photo: Photo = {
    src: `/media/${outName}`,
    portrait: true,
    width: WIDTH,
    height: HEIGHT,
    alt: `Портрет: ${person.display_name}, ${person.tagline.toLowerCase()}`,
    ...(o.caption ? { caption: o.caption } : {}),
    ...(o.author ? { author: o.author } : {}),
    ...(o.license ? { license: o.license } : {}),
    ...(o.source ? { source_url: o.source } : {}),
  }

  // Портрет всегда первый: страница и PDF-досье берут именно его.
  const rest = (person.photos ?? []).filter((p) => !p.portrait)
  person.photos = [photo, ...rest]
  person.updated_at = new Date().toISOString()

  fs.writeFileSync(personPath, `${JSON.stringify(person, null, 2)}\n`, 'utf8')

  const kb = (fs.statSync(outPath).size / 1024).toFixed(0)
  console.log(`Портрет готов: public/media/${outName} — ${WIDTH}×${HEIGHT}, ${kb} КБ`)
  console.log(`Записан в ${path.relative(root, personPath)}`)
  if (!o.license) {
    console.warn('  внимание: не указана лицензия — без основания снимок публиковать нельзя')
  }
}

void main()
