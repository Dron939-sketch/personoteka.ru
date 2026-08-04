/**
 * Автоматическое получение портретов по списку источников.
 *
 *   npx tsx scripts/fetch-photos.ts            # только те, у кого портрета ещё нет
 *   npx tsx scripts/fetch-photos.ts --force    # перекачать все
 *
 * Список — `content/photo-sources.json`. Два режима записи:
 *
 *   { "slug": "sergej-lavrov", "commons": "File:Sergey Lavrov, official photo 05.jpg" }
 *   { "slug": "kto-to", "url": "https://…", "author": "…", "license": "CC BY 4.0",
 *     "source_url": "https://…" }
 *
 * Режим `commons` предпочтителен: автор и лицензия берутся из API Викисклада,
 * то есть из первоисточника, а не переписываются руками. Переписанная вручную
 * атрибуция — это ровно то место, где появляются ошибки, а ошибка в авторстве
 * при свободной лицензии означает нарушение её условий.
 *
 * Скрипт отказывается публиковать снимок с несвободной лицензией: «нашлось
 * в интернете» основанием не является.
 *
 * Запускать нужно там, где открыт доступ в сеть, — например в GitHub Actions
 * (см. .github/workflows/photos.yml).
 */
import fs from 'node:fs'
import path from 'node:path'

import { attachPortrait, isFreeLicense, makePortrait, type Rights } from './lib/portrait'
import type { Person } from '../src/lib/types'

interface CommonsSource {
  slug: string
  commons: string
  caption?: string
}
/** Название статьи в русской Википедии — самый удобный вход: по нему находится
 *  элемент Викиданных, а у него свойство P18 «изображение» с основным портретом. */
interface WikipediaSource {
  slug: string
  wikipedia: string
  caption?: string
}
interface DirectSource {
  slug: string
  url: string
  author?: string
  license: string
  source_url?: string
  caption?: string
}
type Source = CommonsSource | WikipediaSource | DirectSource

const root = process.cwd()
const force = process.argv.includes('--force')

/** Снимает разметку вики из полей атрибуции: там часто приходит HTML со ссылками. */
function stripMarkup(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

interface CommonsInfo {
  url: string
  author: string
  license: string
  descriptionUrl: string
  width: number
  height: number
}

async function fetchCommons(title: string): Promise<CommonsInfo> {
  const api = new URL('https://commons.wikimedia.org/w/api.php')
  api.searchParams.set('action', 'query')
  api.searchParams.set('format', 'json')
  api.searchParams.set('titles', title)
  api.searchParams.set('prop', 'imageinfo')
  api.searchParams.set('iiprop', 'url|size|extmetadata')

  const response = await fetch(api, {
    headers: { 'User-Agent': 'personoteka-photo-bot/1.0 (https://personoteka.ru)' },
  })
  if (!response.ok) throw new Error(`Викисклад ответил ${response.status}`)

  const data = (await response.json()) as {
    query?: { pages?: Record<string, { imageinfo?: Record<string, unknown>[] }> }
  }
  const page = Object.values(data.query?.pages ?? {})[0]
  const info = page?.imageinfo?.[0]
  if (!info) throw new Error(`файл «${title}» на Викискладе не найден`)

  const extra = (info.extmetadata ?? {}) as Record<string, { value?: string }>
  return {
    url: String(info.url),
    width: Number(info.width),
    height: Number(info.height),
    descriptionUrl: String(info.descriptionurl ?? ''),
    author: stripMarkup(extra.Artist?.value ?? ''),
    license: stripMarkup(extra.LicenseShortName?.value ?? ''),
  }
}

/**
 * Название статьи в Википедии → файл на Викискладе.
 *
 * Цепочка: статья → элемент Викиданных → свойство P18 «изображение».
 * P18 — это выбранный сообществом основной портрет персоны, поэтому кадр
 * почти всегда пригоден, а имя файла не приходится угадывать.
 */
async function resolveViaWikipedia(title: string): Promise<string> {
  const wiki = new URL('https://ru.wikipedia.org/w/api.php')
  wiki.searchParams.set('action', 'query')
  wiki.searchParams.set('format', 'json')
  wiki.searchParams.set('prop', 'pageprops')
  wiki.searchParams.set('titles', title)

  const wikiResponse = await fetch(wiki, {
    headers: { 'User-Agent': 'personoteka-photo-bot/1.0 (https://personoteka.ru)' },
  })
  if (!wikiResponse.ok) throw new Error(`Википедия ответила ${wikiResponse.status}`)
  const wikiData = (await wikiResponse.json()) as {
    query?: { pages?: Record<string, { pageprops?: { wikibase_item?: string } }> }
  }
  const qid = Object.values(wikiData.query?.pages ?? {})[0]?.pageprops?.wikibase_item
  if (!qid) throw new Error(`для статьи «${title}» не найден элемент Викиданных`)

  const wd = new URL('https://www.wikidata.org/w/api.php')
  wd.searchParams.set('action', 'wbgetclaims')
  wd.searchParams.set('format', 'json')
  wd.searchParams.set('entity', qid)
  wd.searchParams.set('property', 'P18')

  const wdResponse = await fetch(wd, {
    headers: { 'User-Agent': 'personoteka-photo-bot/1.0 (https://personoteka.ru)' },
  })
  if (!wdResponse.ok) throw new Error(`Викиданные ответили ${wdResponse.status}`)
  const wdData = (await wdResponse.json()) as {
    claims?: { P18?: { mainsnak?: { datavalue?: { value?: string } } }[] }
  }
  const file = wdData.claims?.P18?.[0]?.mainsnak?.datavalue?.value
  if (!file) throw new Error(`у элемента ${qid} нет изображения (свойство P18)`)

  return `File:${file}`
}

async function download(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'personoteka-photo-bot/1.0 (https://personoteka.ru)' },
  })
  if (!response.ok) throw new Error(`${url} → ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

async function main() {
  const listPath = path.join(root, 'content/photo-sources.json')
  if (!fs.existsSync(listPath)) {
    console.log('Список источников пуст: content/photo-sources.json не найден.')
    return
  }

  const sources = JSON.parse(fs.readFileSync(listPath, 'utf8')) as Source[]
  let done = 0
  let skipped = 0
  const problems: string[] = []

  for (const source of sources) {
    const personPath = path.join(root, 'content/persons', `${source.slug}.json`)
    if (!fs.existsSync(personPath)) {
      problems.push(`${source.slug}: нет такой персоны`)
      continue
    }

    const person = JSON.parse(fs.readFileSync(personPath, 'utf8')) as Person
    if (!force && person.photos?.some((p) => p.portrait)) {
      skipped += 1
      continue
    }

    try {
      let buffer: Buffer
      let rights: Rights

      if ('commons' in source || 'wikipedia' in source) {
        const title =
          'commons' in source ? source.commons : await resolveViaWikipedia(source.wikipedia)
        const info = await fetchCommons(title)
        if (!info.license) throw new Error('Викисклад не отдал лицензию')
        if (!isFreeLicense(info.license)) {
          throw new Error(`лицензия «${info.license}» не разрешает свободное использование`)
        }
        buffer = await download(info.url)
        rights = {
          author: info.author || undefined,
          license: info.license,
          source_url: info.descriptionUrl || undefined,
        }
        console.log(`  ${source.slug}: ${info.width}×${info.height}, ${info.license}`)
      } else {
        if (!isFreeLicense(source.license) && source.license !== 'предоставлено героем') {
          throw new Error(`лицензия «${source.license}» не разрешает публикацию`)
        }
        buffer = await download(source.url)
        rights = {
          author: source.author,
          license: source.license,
          source_url: source.source_url,
        }
      }

      const result = await makePortrait(buffer, source.slug, root)
      attachPortrait(personPath, source.slug, rights, source.caption)
      if (result.upscaled) {
        problems.push(
          `${source.slug}: оригинал ${result.sourceWidth}×${result.sourceHeight} меньше 1200×1500 — портрет растянут`,
        )
      }
      done += 1
    } catch (error) {
      problems.push(`${source.slug}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  for (const problem of problems) console.warn(`  внимание: ${problem}`)
  console.log(`\nОбработано: ${done}. Пропущено (портрет уже есть): ${skipped}.`)
  if (done === 0 && problems.length > 0) process.exitCode = 1
}

void main()
