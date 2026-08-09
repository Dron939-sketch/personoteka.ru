/**
 * Замер спроса не по персонам, а по нишам.
 *
 *   NODE_USE_ENV_PROXY=1 npx tsx scripts/discover-niches.ts [выход.json]
 *
 * `discover-demand.ts` смотрит топ-1000 статей русской Википедии — это голова
 * спроса, и она устроена одинаково каждый месяц: политики, актёры, певцы.
 * Ниша по определению в топ-1000 не попадает: киберспортсмен с двадцатью
 * тысячами просмотров в месяц стоит где-то на четырёхтысячном месте и для
 * того измерителя невидим. Между тем именно такие люди и есть цель каталога:
 * спрос заметный, а конкуренция за выдачу почти никакая.
 *
 * Здесь спрос меряется по категориям русской Википедии. Для каждой категории
 * берутся её статьи, и по каждой запрашиваются три величины:
 *
 *   - просмотры за 30 дней (`prop=pageviews`) — сколько людей реально ищет;
 *   - размер статьи в байтах (`prop=info`) — насколько плотно ниша уже занята;
 *   - есть ли персона в каталоге — сверка та же, что в `discover-demand.ts`.
 *
 * Ключевая величина на выходе — не суммарные просмотры ниши, а число «рабочих»
 * персон: спрос выше порога, статья Википедии короче порога, у нас не написана.
 * Логика простая. Большие просмотры при длинной статье — это Википедия, которую
 * не обойти. Короткая статья без просмотров — никому не нужная строчка. Обходить
 * стоит там, где спрос уже есть, а единственный ответ на него — заготовка
 * в три абзаца: справочник с хронологией, источниками и портретом объективно
 * полезнее, и поисковик это видит.
 *
 * Чего метод не умеет: он не отличает человека от коллектива (в «Рэперах
 * России» лежат и группы) и не проверяет, есть ли по персоне проверяемые
 * источники. И то и другое решается глазами на следующем шаге — скрипт
 * сокращает выборку с тысяч до десятков, но не выбирает за редактора.
 *
 * Ещё он не видит главного: людей, у которых статьи в Википедии нет вовсе.
 * По ним спрос может быть каким угодно, а конкурента за первую строчку нет
 * совсем — но и измерить их этим способом нельзя, нужен источник поисковых
 * запросов.
 *
 * ВАЖНО про первый прогон. `prop=pageviews` отдаёт данные из кэша расширения
 * PageViewInfo, и для статьи, которую давно никто не запрашивал через API,
 * первый ответ приходит неполным — часть дней приезжает как `null`. Прогон
 * этот кэш прогревает, поэтому второй запуск по тем же категориям даёт
 * заметно большие числа, и правильные именно они. Ниши, померенные впервые,
 * надо перемерить, прежде чем сравнивать их с остальными.
 */
import fs from 'node:fs'
import path from 'node:path'

const UA = { 'User-Agent': 'personoteka-editorial/1.0 (redakciya@personoteka.ru)' }
const DELAY_MS = Number(process.env.WIKI_DELAY_MS ?? 900)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Спрос, ниже которого персона не окупает работы: ~30 просмотров в день. */
const MIN_VIEWS = 900
/** Размер статьи, выше которого Википедию по этой персоне не обойти. */
const MAX_BYTES = 14_000

/**
 * Ниши-кандидаты. Список редакционный: сюда попадает то, что похоже
 * на «спрос есть, справочников нет». Скрипт проверяет догадку числами.
 */
const NICHES: { title: string; note: string }[] = [
  { title: 'Киберспортсмены России', note: 'Аудитория молодая, справочников нет вовсе' },
  { title: 'Стендап-комики России', note: 'Жанр вырос за десять лет, Википедия отстаёт' },
  { title: 'Ютуберы России', note: 'Спрос высокий, статьи короткие' },
  { title: 'Рэперы России', note: 'Много заготовок в три абзаца' },
  { title: 'Актёры озвучивания России', note: 'Голоса узнают, имена ищут, статей почти нет' },
  { title: 'Шахматисты России', note: 'Плотная фактура и проверяемые рейтинги' },
  { title: 'Мультипликаторы России', note: 'Смежно с уже написанной «Культурой»' },
  { title: 'Спортивные комментаторы России', note: 'Медийные люди без справочных страниц' },
  { title: 'Артисты балета России', note: 'Высокая проверяемость, слабая оцифровка' },
  { title: 'Оперные певцы и певицы России', note: 'То же, что балет' },
  { title: 'Дирижёры России', note: 'Узкая, но устойчивая ниша' },
  { title: 'Фотографы России', note: 'Авторов ищут по имени с работ' },
  { title: 'Архитекторы России', note: 'Запрос идёт от зданий к автору' },
  { title: 'Космонавты России', note: 'Сильный интерес, конкуренция официальных сайтов' },
  { title: 'Историки России', note: 'Проверяемо, но конкуренция вузов' },
  { title: 'Модельеры России', note: 'Мало имён, но спрос концентрированный' },
  { title: 'Фигуристы России', note: 'Спорт с самой широкой женской аудиторией' },
  { title: 'Хоккеисты России', note: 'Большая категория, надо смотреть середину' },
  { title: 'Психологи России', note: 'Смежно с профилем владельца' },
  { title: 'Тиктокеры России', note: 'Самая молодая аудитория' },
  { title: 'Стримеры', note: 'Twitch и его наследники' },
  { title: 'Боксёры России', note: 'Смежно с уже написанным ММА' },
  { title: 'Биатлонисты России', note: 'Зимние виды дают сезонные всплески' },
  { title: 'Автогонщики России', note: 'Узко, но с устойчивым ядром' },
  { title: 'Писатели-фантасты России', note: 'Читательские сообщества ищут авторов' },
  { title: 'Рестораторы России', note: 'Имена на слуху из телепроектов' },
  { title: 'Продюсеры России', note: 'Фамилии знают, биографий нет' },
  { title: 'Футбольные тренеры России', note: 'Сезонный спрос, много фактуры' },
  { title: 'Гимнасты России', note: 'Крупная женская аудитория' },
  { title: 'Телеведущие России', note: 'Проверка: ниша, которую мы уже пишем' },
  { title: 'Певцы и певицы России', note: 'Проверка: заведомо занятая голова спроса' },
]

async function get(url: string): Promise<unknown | null> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await sleep(DELAY_MS)
    try {
      const res = await fetch(url, { headers: UA })
      if (res.ok) return (await res.json()) as unknown
      if (res.status !== 429 && res.status < 500) return null
    } catch {
      // Сеть до Викимедиа регулярно рвётся на длинных прогонах — это не повод падать.
    }
    await sleep(3000 * (attempt + 1))
  }
  return null
}

const api = 'https://ru.wikipedia.org/w/api.php?action=query&format=json&formatversion=2'

/**
 * Статьи категории. Один уровень вложенности разворачивается обязательно:
 * в русской Википедии верхняя категория почти всегда мелкая, а люди разложены
 * по подкатегориям. «Стендап-комики России» напрямую держит два десятка имён,
 * хотя в подкатегориях их сотни, и без спуска ниша выглядит несуществующей.
 * Глубже одного уровня не идём — там начинаются категории по годам и городам,
 * которые раздувают выборку, не добавляя имён.
 */
async function categoryMembers(title: string, limit = 1500): Promise<string[]> {
  const pages = async (cmtitle: string, type: 'page' | 'subcat') => {
    const out: string[] = []
    let cont = ''
    for (let page = 0; page < 6; page += 1) {
      const url = `${api}&list=categorymembers&cmtype=${type}&cmlimit=500&cmtitle=${encodeURIComponent(cmtitle)}${cont}`
      const data = (await get(url)) as
        | { query?: { categorymembers?: { title: string }[] }; continue?: { cmcontinue: string } }
        | null
      if (!data) break
      for (const m of data.query?.categorymembers ?? []) out.push(m.title)
      if (!data.continue?.cmcontinue) break
      cont = `&cmcontinue=${encodeURIComponent(data.continue.cmcontinue)}`
    }
    return out
  }

  const seen = new Set<string>(await pages(`Категория:${title}`, 'page'))
  if (seen.size < limit) {
    for (const sub of await pages(`Категория:${title}`, 'subcat')) {
      if (seen.size >= limit) break
      for (const m of await pages(sub, 'page')) seen.add(m)
    }
  }
  return [...seen].slice(0, limit)
}

interface Article {
  title: string
  views: number
  bytes: number
}

/** Просмотры и размер сразу за один запрос — API отдаёт до 50 заголовков. */
async function articleStats(titles: string[]): Promise<Article[]> {
  const out: Article[] = []
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50)
    const url = `${api}&prop=pageviews|info&pvipdays=30&titles=${encodeURIComponent(batch.join('|'))}`
    const data = (await get(url)) as
      | { query?: { pages?: { title: string; length?: number; pageviews?: Record<string, number | null> }[] } }
      | null
    for (const p of data?.query?.pages ?? []) {
      // Дни, за которые у API нет данных, приезжают как null — считаем их нулями.
      const views = Object.values(p.pageviews ?? {}).reduce<number>((a, b) => a + (b ?? 0), 0)
      out.push({ title: p.title, views, bytes: p.length ?? 0 })
    }
    process.stdout.write('.')
  }
  return out
}

interface Written {
  pairs: Set<string>
  singles: Set<string>
}

/** Та же сверка, что в discover-demand.ts: по имени и фамилии, а не по слагу. */
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

function normalize(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\([^)]*\)/g, '')
    .replace(/[,_]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function nameKey(title: string): string {
  const parts = normalize(title)
  return parts.length >= 2 ? [parts[0], parts[1]].sort().join(' ') : parts.join(' ')
}

async function main() {
  const root = process.cwd()
  const out = path.join(root, process.argv[2] ?? 'content/queue-niches.json')
  const written = writtenKeys(root)

  const niches = []
  for (const niche of NICHES) {
    process.stdout.write(`${niche.title} `)
    const members = await categoryMembers(niche.title)
    if (members.length === 0) {
      console.log('— категории нет')
      continue
    }
    const stats = await articleStats(members)
    const rows = stats
      .map((a) => ({ ...a, written: isWritten(a.title, written) }))
      .sort((x, y) => y.views - x.views)
    // Спрос есть и у нас не написано — но статья Википедии может быть любой.
    const demanded = rows.filter((r) => !r.written && r.views >= MIN_VIEWS)
    // «Рабочие» — те, ради кого ниша и берётся: вдобавок статья тонкая.
    const workable = demanded.filter((r) => r.bytes < MAX_BYTES)
    const totalViews = rows.reduce((a, r) => a + r.views, 0)
    niches.push({
      title: niche.title,
      note: niche.note,
      persons: rows.length,
      views_30d: totalViews,
      ours: rows.filter((r) => r.written).length,
      // Разница между demanded и workable показывает, что режет отбор: если
      // она велика — спрос в нише занят длинными статьями Википедии.
      demanded: demanded.length,
      demanded_views: demanded.reduce((a, r) => a + r.views, 0),
      workable: workable.length,
      workable_views: workable.reduce((a, r) => a + r.views, 0),
      top: demanded.slice(0, 30).map((r) => ({ name: r.title, views: r.views, bytes: r.bytes })),
    })
    console.log(` ${rows.length} персон, спрос у ${demanded.length}, из них тонких ${workable.length}`)
  }

  niches.sort((a, b) => b.demanded_views - a.demanded_views)
  fs.writeFileSync(out, `${JSON.stringify({ measured_days: 30, MIN_VIEWS, MAX_BYTES, niches }, null, 2)}\n`)

  console.log('\nниша | персон | наших | со спросом | из них тонких | спрос за 30 дней')
  for (const n of niches) {
    console.log(
      `${n.title} | ${n.persons} | ${n.ours} | ${n.demanded} | ${n.workable} | ${n.demanded_views.toLocaleString('ru')}`,
    )
  }
  console.log(`\nЗаписано: ${path.relative(root, out)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
