/**
 * Приём портрета персоны из локального файла — §7.5 ТЗ.
 *
 *   npx tsx scripts/add-photo.ts <slug> <путь-к-файлу> \
 *     --author="И. Фотографов" --license="CC BY 4.0" --source="https://…"
 *
 * Кадрирует в 4:5, приводит к 1200×1500 и применяет единую мягкую коррекцию,
 * чтобы галерея портретов от разных фотографов выглядела как один каталог.
 * Кадрирование по умолчанию — по «вниманию»: sharp сам находит самую значимую
 * область, и для портрета это почти всегда лицо. Если промахнулся, есть
 * --gravity=north|centre|south.
 *
 * Когда снимок доступен по ссылке, лучше не пользоваться этим скриптом,
 * а добавить запись в `content/photo-sources.json`: тогда автор и лицензия
 * возьмутся из первоисточника автоматически (см. fetch-photos.ts).
 */
import fs from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

import { attachPortrait, makePortrait } from './lib/portrait'

function parseArgs() {
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
  return { slug, file, opts }
}

function position(gravity?: string) {
  if (!gravity || gravity === 'attention') return sharp.strategy.attention
  if (gravity === 'entropy') return sharp.strategy.entropy
  return gravity
}

async function main() {
  const { slug, file, opts } = parseArgs()
  const root = process.cwd()
  const personPath = path.join(root, 'content/persons', `${slug}.json`)

  if (!fs.existsSync(personPath)) {
    console.error(`Нет персоны с слагом «${slug}»: ${personPath}`)
    process.exit(1)
  }
  if (!fs.existsSync(file)) {
    console.error(`Файл не найден: ${file}`)
    process.exit(1)
  }
  if (!opts.license) {
    console.error(
      'Не указана лицензия. Права на фотографию принадлежат фотографу — ' +
        'без основания публиковать снимок нельзя.\n' +
        'Примеры: --license="CC BY 4.0" · --license="предоставлено героем"',
    )
    process.exit(1)
  }

  const result = await makePortrait(file, slug, root, position(opts.gravity))
  if (result.upscaled) {
    console.warn(
      `  внимание: оригинал ${result.sourceWidth}×${result.sourceHeight} меньше требуемых ` +
        '1200×1500 — портрет растянут и потеряет резкость',
    )
  }

  attachPortrait(
    personPath,
    slug,
    { author: opts.author, license: opts.license, source_url: opts.source },
    opts.caption,
  )

  const kb = (fs.statSync(result.outPath).size / 1024).toFixed(0)
  console.log(`Портрет готов: public/media/${slug}.jpg — 1200×1500, ${kb} КБ`)
  console.log(`Записан в ${path.relative(root, personPath)}`)
}

void main()
