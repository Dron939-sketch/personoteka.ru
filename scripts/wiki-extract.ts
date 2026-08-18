/**
 * Выгрузка статей русской Википедии для фактчекинга.
 *
 *   npx tsx scripts/wiki-extract.ts <файл-со-списком> <куда.json>
 *
 * В списке — по заголовку статьи в строке. Пишет {заголовок: текст},
 * дальше редактор читает файл и сверяет по нему даты и должности.
 * Скрипт вспомогательный: в репозиторий его выдача не попадает.
 */
import fs from 'node:fs'

const API = 'https://ru.wikipedia.org/w/api.php'

/**
 * Пауза и повторы. Википедия отвечает 429 на десятке подряд идущих запросов,
 * а пустая строка в выдаче неотличима от «статьи нет» — редактор решит, что
 * сверять нечего, и напишет по памяти. Лучше подождать.
 */
const DELAY_MS = Number(process.env.WIKI_DELAY_MS ?? 1200)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function extract(title: string): Promise<string> {
  const url =
    `${API}?action=query&prop=extracts&explaintext=1&redirects=1&format=json&titles=` +
    encodeURIComponent(title)
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await sleep(DELAY_MS)
    const res = await fetch(url, { headers: { 'User-Agent': 'personoteka-editorial/1.0' } })
    if (res.ok) {
      const data = (await res.json()) as {
        query?: { pages?: Record<string, { extract?: string }> }
      }
      const pages = data.query?.pages ?? {}
      return Object.values(pages)[0]?.extract ?? ''
    }
    if (res.status !== 429 && res.status < 500) return ''
    await sleep(2500 * (attempt + 1))
  }
  return ''
}

async function main() {
  const [listFile, outFile] = process.argv.slice(2)
  if (!listFile || !outFile) {
    console.error('usage: wiki-extract.ts <список.txt> <выход.json>')
    process.exit(1)
  }

  const titles = fs
    .readFileSync(listFile, 'utf8')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  const out: Record<string, string> = {}
  for (const title of titles) {
    out[title] = await extract(title)
    console.log(`${title}: ${out[title].length} знаков`)
  }

  fs.writeFileSync(outFile, JSON.stringify(out, null, 1))
}

main()
