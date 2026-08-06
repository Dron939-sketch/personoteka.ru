/**
 * Отбор кандидатов по фактическому спросу.
 *
 *   NODE_USE_ENV_PROXY=1 npx tsx scripts/popularity.ts <список.txt> <выход.json>
 *
 * «Самые популярные» — это не ощущение редактора, а измеримая величина.
 * Ближайшая доступная мера интереса к человеку — просмотры его статьи в русской
 * Википедии: она есть почти у каждого публичного лица, а счётчик Викимедиа
 * открыт и одинаков для всех.
 *
 * Что это НЕ измеряет: спрос на людей без статьи (их Википедия просто не
 * покажет) и сиюминутные всплески вокруг новости. Поэтому берутся полные
 * месяцы, а не последние дни, и список кандидатов составляет редактор —
 * скрипт только расставляет его по спросу.
 *
 * Имя кандидата сначала разрешается через поиск: заголовок статьи часто
 * отличается от того, как человека называют («Макан (рэпер)», а не «Макан»).
 */
import fs from 'node:fs'

const UA = { 'User-Agent': 'personoteka-editorial/1.0 (redakciya@personoteka.ru)' }

/**
 * Пауза между запросами. Викимедиа отвечает 429 задолго до любого разумного
 * темпа, и молча получить ноль вместо числа хуже, чем подождать: ноль выглядит
 * как «человека не читают», а на деле это отказ сервера.
 */
const DELAY_MS = Number(process.env.WIKI_DELAY_MS ?? 1100)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Запрос с повтором на 429 и 5xx: три попытки с растущей паузой. */
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
const API = 'https://ru.wikipedia.org/w/api.php'
const METRICS = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/ru.wikipedia/all-access/user'

/** Полные месяцы, за которые считаем спрос. */
const MONTHS = ['2026-05', '2026-06', '2026-07']

export interface Candidate {
  query: string
  title: string
  views: number
  perMonth: number[]
}

async function resolveTitle(query: string): Promise<string | null> {
  const url = `${API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json`
  const res = await get(url)
  if (!res) return null
  const data = (await res.json()) as { query?: { search?: { title: string }[] } }
  return data.query?.search?.[0]?.title ?? null
}

function monthRange(month: string): [string, string] {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return [`${y}${String(m).padStart(2, '0')}0100`, `${y}${String(m).padStart(2, '0')}${last}00`]
}

async function views(title: string): Promise<number[]> {
  const article = encodeURIComponent(title.replace(/ /g, '_'))
  const out: number[] = []
  for (const month of MONTHS) {
    const [from, to] = monthRange(month)
    const res = await get(`${METRICS}/${article}/monthly/${from}/${to}`)
    if (!res) {
      // Отличаем отказ сервера от честного нуля: -1 не спутать со «не читают».
      out.push(-1)
      continue
    }
    const data = (await res.json()) as { items?: { views: number }[] }
    out.push(data.items?.[0]?.views ?? 0)
  }
  return out
}

async function main() {
  const [listFile, outFile] = process.argv.slice(2)
  if (!listFile || !outFile) {
    console.error('usage: popularity.ts <список.txt> <выход.json>')
    process.exit(1)
  }

  const names = fs
    .readFileSync(listFile, 'utf8')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#'))

  const results: Candidate[] = []
  // Строго последовательно: параллельные запросы к открытому API Викимедиа
  // упираются в 429 на втором десятке имён.
  for (const [i, query] of names.entries()) {
    const title = await resolveTitle(query)
    const perMonth = title ? await views(title) : []
    const failed = perMonth.some((v) => v < 0)
    results.push({
      query,
      title: title ?? '',
      views: failed ? -1 : perMonth.reduce((a, b) => a + b, 0),
      perMonth,
    })
    process.stdout.write(`${i + 1}/${names.length}\r`)
  }

  const broken = results.filter((r) => r.views < 0)
  if (broken.length) {
    console.log(`\nНе удалось измерить: ${broken.map((b) => b.query).join(', ')}`)
  }

  results.sort((a, b) => b.views - a.views)
  fs.writeFileSync(outFile, `${JSON.stringify(results, null, 1)}\n`, 'utf8')

  console.log(`\nГотово. ${results.length} кандидатов, файл ${outFile}\n`)
  for (const [i, r] of results.slice(0, 60).entries()) {
    console.log(`${String(i + 1).padStart(3)}. ${String(r.views).padStart(8)}  ${r.query}${r.title && r.title !== r.query ? `  → ${r.title}` : ''}`)
  }
}

void main()
