/**
 * Снимок для редакционного материала с Викисклада.
 *
 * Права на фотографию принадлежат фотографу, поэтому скрипт берёт файл только
 * под свободной лицензией и вытаскивает автора вместе с изображением: CC BY и
 * CC BY-SA требуют указывать его рядом с кадром. Файл под несвободной лицензией
 * или без разбираемых сведений о правах не скачивается вовсе — молча подставить
 * такой кадр в статью нельзя.
 *
 *   npm run photo:commons -- "File:Пример.jpg" --slug=pokaz-mod [--width=1440]
 *
 * На выходе — файл в `public/media/stati/` и готовый кусок JSON для `figures`.
 */
import fs from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

const OK_LICENSES = [/^cc0/i, /^cc[ -]by(-sa)?[ -]/i, /^public domain/i, /^pd-/i]
const UA = { 'User-Agent': 'personoteka-editorial/1.0 (https://personoteka.ru)' }
const API = 'https://commons.wikimedia.org/w/api.php'

type Info = {
  url: string
  descriptionurl: string
  width: number
  height: number
  extmetadata?: Record<string, { value?: string }>
}

function arg(name: string): string | undefined {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`))
  return found?.slice(name.length + 3)
}

/** Разметка из полей Викисклада: там встречается HTML со ссылками. */
function plain(value: string | undefined): string {
  if (!value) return ''
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function info(title: string): Promise<Info> {
  const url =
    `${API}?action=query&format=json&prop=imageinfo&iiprop=url|size|extmetadata` +
    `&titles=${encodeURIComponent(title)}`
  const res = await fetch(url, { headers: UA })
  if (!res.ok) throw new Error(`Викисклад ответил ${res.status}`)
  const data = (await res.json()) as {
    query?: { pages?: Record<string, { imageinfo?: Info[] }> }
  }
  const page = Object.values(data.query?.pages ?? {})[0]
  const first = page?.imageinfo?.[0]
  if (!first) throw new Error(`Файл не найден: ${title}`)
  return first
}

async function main() {
  const title = process.argv[2]
  const slug = arg('slug')
  const width = Number(arg('width') ?? 1440)

  if (!title || !slug) {
    console.error('Использование: npm run photo:commons -- "File:…" --slug=… [--width=1440]')
    process.exit(1)
  }

  const meta = await info(title)
  const license = plain(meta.extmetadata?.LicenseShortName?.value)
  const author = plain(meta.extmetadata?.Artist?.value)

  if (!OK_LICENSES.some((re) => re.test(license))) {
    console.error(
      `Лицензия «${license || 'не указана'}» не подходит для публикации.\n` +
        'Берём только CC0, CC BY, CC BY-SA и общественное достояние.',
    )
    process.exit(1)
  }

  const root = process.cwd()
  const dir = path.join(root, 'public/media/stati')
  fs.mkdirSync(dir, { recursive: true })

  const file = await fetch(meta.url, { headers: UA })
  if (!file.ok) throw new Error(`Скачивание не удалось: ${file.status}`)
  const buf = Buffer.from(await file.arrayBuffer())

  const out = path.join(dir, `${slug}.jpg`)
  const result = await sharp(buf)
    .rotate()
    .resize(width, undefined, { withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out)

  console.log(`Готово: public/media/stati/${slug}.jpg — ${result.width}×${result.height}`)
  console.log(
    JSON.stringify(
      {
        src: `/media/stati/${slug}.jpg`,
        width: result.width,
        height: result.height,
        author: author || undefined,
        license,
        source_url: meta.descriptionurl,
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  console.error((err as Error).message)
  process.exit(1)
})
