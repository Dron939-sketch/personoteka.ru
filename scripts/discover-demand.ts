/**
 * Поиск новых кандидатов по фактическому спросу — без списка от редактора.
 *
 *   NODE_USE_ENV_PROXY=1 npx tsx scripts/discover-demand.ts 2026 07 [выход.json]
 *
 * `popularity.ts` расставляет по спросу уже составленный список: он отвечает
 * на вопрос «кого из этих людей читают чаще». Здесь задача обратная — узнать,
 * кого читают вообще, не спрашивая редактора. Источник — открытая выкладка
 * Викимедиа «топ-1000 статей русской Википедии за месяц».
 *
 * Из тысячи заголовков нужно вытащить людей и отсеять всё остальное, поэтому
 * каждая статья сверяется с Викиданными: `P31 = Q5` («это человек») и `P27`
 * (гражданство). Гражданство важно не ради формальности — каталог про
 * русскоязычных персон, а в месячном топе половина позиций это футболисты
 * мировых чемпионатов, которых мы не пишем.
 *
 * Заодно проверяется `P18` — есть ли у персоны изображение в Викиданных.
 * Это точнее, чем `pageimages` русской Википедии: там в карточку попадает
 * и несвободный логотип, и постер фильма, а `P18` почти всегда указывает
 * на файл Викисклада, который конвейер портретов сможет забрать.
 *
 * Что метод НЕ находит: людей без статьи в Википедии и тех, кого читают
 * ровно столько, чтобы не попасть в первую тысячу. Для них по-прежнему
 * нужен список от редактора и `popularity.ts`.
 */
import fs from 'node:fs'
import path from 'node:path'

const UA = { 'User-Agent': 'personoteka-editorial/1.0 (redakciya@personoteka.ru)' }
const DELAY_MS = Number(process.env.WIKI_DELAY_MS ?? 400)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Гражданства, которые нас интересуют: Россия, СССР и соседи по бывшему Союзу. */
const CITIZENSHIP: Record<string, string> = {
  Q159: 'Россия',
  Q15180: 'СССР',
  Q34266: 'Российская империя',
  Q232: 'Казахстан',
  Q265: 'Узбекистан',
  Q184: 'Беларусь',
  Q212: 'Украина',
  Q399: 'Армения',
  Q227: 'Азербайджан',
  Q813: 'Киргизия',
  Q863: 'Таджикистан',
  Q874: 'Туркменистан',
  Q217: 'Молдавия',
  Q230: 'Грузия',
  Q37024: 'Латвия',
  Q191: 'Эстония',
  Q37: 'Литва',
}

/** Служебные и неименные страницы, которые в топе всегда идут первыми. */
const SKIP_PREFIX = ['Заглавная_страница', 'Служебная:', 'Википедия:', 'Категория:', 'Портал:', 'Файл:', 'Шаблон:']

async function get(url: string): Promise<Response | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await sleep(DELAY_MS)
    const res = await fetch(url, { headers: UA })
    if (res.ok) return res
    if (res.status !== 429 && res.status < 500) return null
    await sleep(2000 * (attempt + 1))
  }
  return null
}

interface TopArticle {
  article: string
  views: number
  rank: number
}

async function fetchTop(year: string, month: string): Promise<TopArticle[]> {
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/ru.wikipedia/all-access/${year}/${month}/all-days`
  const res = await get(url)
  if (!res) throw new Error(`Викимедиа не отдала топ за ${year}-${month}`)
  const data = (await res.json()) as { items: { articles: TopArticle[] }[] }
  return data.items[0].articles.filter(
    (a) => !SKIP_PREFIX.some((p) => a.article.startsWith(p)),
  )
}

interface Entity {
  title: string
  qid: string
  isHuman: boolean
  citizenship: string[]
  hasImage: boolean
}

/** Викиданные принимают до 50 заголовков за запрос — больше отдают ошибку. */
async function fetchEntities(titles: string[]): Promise<Entity[]> {
  const out: Entity[] = []
  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50)
    const url =
      'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&sites=ruwiki&props=claims' +
      `&titles=${encodeURIComponent(chunk.join('|'))}`
    const res = await get(url)
    if (!res) continue
    const data = (await res.json()) as {
      entities?: Record<string, { id: string; claims?: Record<string, unknown[]> }>
    }
    for (const entity of Object.values(data.entities ?? {})) {
      if (!entity.claims) continue
      const claims = entity.claims as Record<string, { mainsnak?: { datavalue?: { value?: { id?: string } } } }[]>
      const ids = (prop: string) =>
        (claims[prop] ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean) as string[]
      out.push({
        title: '',
        qid: entity.id,
        isHuman: ids('P31').includes('Q5'),
        citizenship: ids('P27'),
        hasImage: Boolean(claims.P18?.length),
      })
    }
    process.stdout.write(`  Викиданные: ${Math.min(i + 50, titles.length)}/${titles.length}\r`)
  }
  return out
}

/**
 * Викиданные возвращают сущности без привязки к запрошенному заголовку, поэтому
 * связь восстанавливается вторым проходом: по каждому Q-идентификатору спрашиваем
 * его русскую статью. Дешевле, чем ходить по одному заголовку за раз.
 */
async function fetchSitelinks(qids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  for (let i = 0; i < qids.length; i += 50) {
    const chunk = qids.slice(i, i + 50)
    const url =
      'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks' +
      `&sitefilter=ruwiki&ids=${chunk.join('|')}`
    const res = await get(url)
    if (!res) continue
    const data = (await res.json()) as {
      entities?: Record<string, { id: string; sitelinks?: { ruwiki?: { title: string } } }>
    }
    for (const entity of Object.values(data.entities ?? {})) {
      const title = entity.sitelinks?.ruwiki?.title
      if (title) map.set(entity.id, title)
    }
  }
  return map
}

/**
 * Ключи уже написанных персон — в двух видах, и оба нужны.
 *
 * Пара «имя + фамилия» закрывает обычную карточку. Но заголовок статьи бывает
 * однословным: «Emin», «Баста», «Zivert». Сверять такой заголовок с парами
 * бесполезно — он ни с чем не совпадёт, и скрипт предложит написать человека,
 * который в каталоге уже есть. Так однажды и вышло: Эмин Агаларов, написанный
 * в партии 22, вернулся в очередь под заголовком «Emin» и был переписан заново.
 * Поэтому отдельно собираются одиночные слова всех вариантов имени.
 */
interface Written {
  pairs: Set<string>
  singles: Set<string>
}

function writtenKeys(root: string): Written {
  const dir = path.join(root, 'content/persons')
  const pairs = new Set<string>()
  const singles = new Set<string>()
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue
    const person = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as {
      full_name?: string
      display_name?: string
      name_latin?: string
    }
    for (const name of [person.full_name, person.display_name, person.name_latin]) {
      if (!name) continue
      pairs.add(nameKey(name))
      for (const word of normalize(name)) {
        // Отчества и служебные части вроде «оглы» ключами быть не должны.
        if (word.length >= 4 && !/(вич|вна|оглы|кызы)$/.test(word)) singles.add(word)
      }
    }
  }
  return { pairs, singles }
}

function isWritten(title: string, written: Written): boolean {
  const parts = normalize(title)
  if (parts.length >= 2) return written.pairs.has(nameKey(title))
  return parts.length === 1 && written.singles.has(parts[0])
}

/**
 * Заголовок статьи приводится к сравнимому виду: убираются уточнения в скобках
 * («Баста (музыкант)»), запятая инверсии и регистр.
 */
function normalize(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\([^)]*\)/g, '')
    .replace(/[,_]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/** Имя и фамилия сортируются: «Чурсина, Людмила» и «Людмила Чурсина» совпадут. */
function nameKey(title: string): string {
  const parts = normalize(title)
  return parts.length >= 2 ? [parts[0], parts[1]].sort().join(' ') : parts.join(' ')
}

async function main() {
  const [year, month, outArg] = process.argv.slice(2)
  if (!year || !month) {
    console.error('Использование: npx tsx scripts/discover-demand.ts <год> <месяц> [выход.json]')
    process.exit(1)
  }
  const root = process.cwd()
  const out = path.join(root, outArg ?? `content/queue-demand-${year}-${month}.json`)

  console.log(`Топ русской Википедии за ${year}-${month}…`)
  const top = await fetchTop(year, month)
  console.log(`  статей в топе: ${top.length}`)

  const entities = await fetchEntities(top.map((a) => a.article))
  process.stdout.write('\n')
  const people = entities.filter((e) => e.isHuman)
  console.log(`  из них людей: ${people.length}`)

  const links = await fetchSitelinks(people.map((e) => e.qid))
  const written = writtenKeys(root)
  const viewsByTitle = new Map(top.map((a) => [a.article.replace(/_/g, ' '), a.views]))

  const rows = people
    .map((e) => {
      const title = links.get(e.qid)
      if (!title) return null
      const citizenship = e.citizenship.map((q) => CITIZENSHIP[q]).filter(Boolean)
      if (citizenship.length === 0) return null
      return {
        name: title,
        views: viewsByTitle.get(title) ?? 0,
        wikidata: e.qid,
        citizenship,
        free_photo: e.hasImage,
        written: isWritten(title, written),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b!.views - a!.views) as {
    name: string
    views: number
    wikidata: string
    citizenship: string[]
    free_photo: boolean
    written: boolean
  }[]

  fs.writeFileSync(out, `${JSON.stringify({ period: `${year}-${month}`, rows }, null, 2)}\n`)

  const fresh = rows.filter((r) => !r.written)
  console.log(`\nНаших персон в топе: ${rows.length}, из них не написано: ${fresh.length}`)
  for (const r of fresh.slice(0, 40)) {
    const photo = r.free_photo ? 'фото' : '  — '
    console.log(`${String(r.views).padStart(8)} ${photo} ${r.name} (${r.citizenship.join(', ')})`)
  }
  console.log(`\nЗаписано: ${path.relative(root, out)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
