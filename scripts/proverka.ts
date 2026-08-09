/**
 * Проверка публичных заявлений персоны по официальным реестрам.
 *
 *   npm run proverka -- "Бухаров Игорь Александрович"
 *   npm run proverka -- "Иванов Иван" --company="Федерация рестораторов"
 *
 * Зачем это редакции. Биографии рубрики «Эксперты» пишутся со слов самого
 * героя: независимых публикаций о нём чаще всего нет. Проверить анкету
 * нечем — кроме государственных реестров, где часть заявлений о себе либо
 * подтверждается, либо нет. «Владелец компании», «предприниматель»,
 * «руководитель» — это записи в ЕГРЮЛ и ЕГРИП, а не эпитеты.
 *
 * Что скрипт НЕ делает и делать не будет. Он не ищет долги, судимости,
 * родственников, адреса и телефоны — то есть не занимается «пробивом».
 * Сведения из утечек в него не попадают ни при каких условиях: это
 * персональные данные, полученные незаконно, и работа с ними — уголовная
 * статья для того, кто их распространяет. Здесь только открытые реестры,
 * которые публикует само государство, и только та их часть, что относится
 * к профессиональной деятельности человека.
 *
 * Результат — не досье, а список подтверждений и несовпадений, который
 * редактор читает глазами. Ничего никуда не сохраняется.
 *
 * Запускать через `npm run proverka`: там выставлен NODE_USE_ENV_PROXY=1,
 * без которого fetch в Node не видит прокси.
 */

const UA = { 'User-Agent': 'Mozilla/5.0 (personoteka-editorial/1.0)' }
const PAUSE_MS = 1200

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface EgrulRow {
  /** Полное наименование юрлица либо ФИО предпринимателя. */
  n?: string
  /** Сокращённое наименование. */
  c?: string
  i?: string
  o?: string
  /** Руководитель с должностью — одной строкой. */
  g?: string
  /** Вид записи: `ul` — юрлицо, `fl` — предприниматель. */
  k?: string
  /** Дата регистрации. */
  r?: string
  /** Дата прекращения — если запись есть, деятельность прекращена. */
  e?: string
  /** Адрес. */
  a?: string
}

/**
 * Поиск в ЕГРЮЛ и ЕГРИП.
 *
 * Сервис ФНС работает в два шага: сначала выдаёт токен на запрос, потом по
 * токену отдаёт результат. Между шагами нужна пауза — иначе поиск ещё
 * не отработал и вернётся пустой список, неотличимый от «ничего не найдено».
 */
async function egrul(query: string, kind: 'ul' | 'ip'): Promise<EgrulRow[]> {
  const body = new URLSearchParams({ query, region: '', ...(kind === 'ip' ? { searchType: 'ip' } : {}) })
  const start = await fetch('https://egrul.nalog.ru/', {
    method: 'POST',
    headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
    body,
  })
  if (!start.ok) throw new Error(`ЕГРЮЛ: ${start.status}`)
  const { t, captchaRequired } = (await start.json()) as { t?: string; captchaRequired?: boolean }
  if (captchaRequired) throw new Error('ЕГРЮЛ требует капчу — запросов было слишком много')
  if (!t) return []

  await sleep(PAUSE_MS)
  const res = await fetch(`https://egrul.nalog.ru/search-result/${t}`, { headers: UA })
  if (!res.ok) throw new Error(`ЕГРЮЛ: ${res.status}`)
  const data = (await res.json()) as { rows?: EgrulRow[] }
  return data.rows ?? []
}

interface DisqRow {
  ФИО?: string
  ДатаРожд?: string
  МестоРожд?: string
  НаимОрг?: string
  Должность?: string
  КвалификацияТекст?: string
  ДатаНачДискв?: string
  ДатаКонДискв?: string
}

/**
 * Реестр дисквалифицированных лиц — тех, кому суд запретил занимать
 * руководящие должности. Единственный реестр, который прямо отвечает
 * на вопрос «может ли этот человек вообще руководить организацией».
 */
async function disqualified(fio: string): Promise<DisqRow[]> {
  const body = new URLSearchParams({ query: fio, page: '1', pageSize: '20' })
  const res = await fetch('https://service.nalog.ru/disqualified-proc.json', {
    method: 'POST',
    headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
    body,
  })
  if (!res.ok) throw new Error(`Реестр дисквалифицированных: ${res.status}`)
  const data = (await res.json()) as { data?: DisqRow[] }
  return data.data ?? []
}

/** Фамилия и имя из полного ФИО: отчество в реестрах пишут не всегда. */
function shortName(fio: string): string {
  return fio.trim().split(/\s+/).slice(0, 2).join(' ')
}

/**
 * Отсев однофамильцев по имени и отчеству.
 *
 * Искать приходится по фамилии и имени — с полным ФИО реестры часто не находят
 * ничего из-за разного написания и буквы «ё». Зато отсеять лишнее по отчеству
 * можно уже на своей стороне, и это снимает почти весь шум: на «Галицкого
 * Сергея» реестр дисквалифицированных выдаёт Викторовича, к нашему герою
 * отношения не имеющего.
 *
 * Если отчество не задано, не отсеиваем ничего: пусть лучше редактор увидит
 * лишнее, чем не увидит нужного.
 */
function byPatronymic(fio: string) {
  const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е')
  // Фамилию не проверяем — по ней и шёл поиск. Проверяем имя и отчество:
  // сервис ФНС отвечает нестрого и на «Галицкого Сергея» возвращает
  // в том числе Александра.
  const wanted = fio.trim().split(/\s+/).slice(1).map(norm)
  return (candidate: string | undefined): boolean => {
    if (wanted.length === 0) return true
    if (!candidate) return true
    const got = norm(candidate)
    return wanted.every((part) => got.includes(part))
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const fio = args.find((a) => !a.startsWith('--'))
  const company = args.find((a) => a.startsWith('--company='))?.slice('--company='.length)
  if (!fio) {
    console.error('Использование: npm run proverka -- "Фамилия Имя Отчество" [--company="Название"]')
    process.exit(1)
  }
  return { fio, company }
}

async function main() {
  const { fio, company } = parseArgs()
  console.log(`\nПроверка по открытым реестрам: ${fio}\n${'—'.repeat(60)}`)

  // 1. Дисквалификация. Идёт первой: это единственная проверка, отрицательный
  //    результат которой сам по себе является новостью для редактора.
  const matches = byPatronymic(fio)
  try {
    const all = await disqualified(shortName(fio))
    const rows = all.filter((r) => matches(r.ФИО))
    const dropped = all.length - rows.length
    if (rows.length === 0) {
      console.log('\nРеестр дисквалифицированных лиц: записей нет' + (dropped ? ` (${dropped} не совпавших по имени и отчеству отсеяно)` : ''))
    } else {
      console.log(`\nРеестр дисквалифицированных лиц: найдено ${rows.length}` + (dropped ? ` (ещё ${dropped} однофамильцев отсеяно)` : ''))
      for (const r of rows.slice(0, 5)) {
        console.log(`  ${r.ФИО} (род. ${(r.ДатаРожд ?? '').slice(0, 10)})`)
        console.log(`    ${r.Должность} в ${r.НаимОрг}; ${r.КвалификацияТекст}`)
        console.log(`    дисквалификация с ${(r.ДатаНачДискв ?? '').slice(0, 10)} по ${(r.ДатаКонДискв ?? '').slice(0, 10)}`)
      }
      console.log('  ВНИМАНИЕ: совпадение по фамилии и имени — не доказательство. Сверяйте дату и место рождения.')
    }
  } catch (err) {
    console.log(`\nРеестр дисквалифицированных лиц: недоступен — ${(err as Error).message}`)
  }

  await sleep(PAUSE_MS)

  // 2. Предпринимательство. «Занимается бизнесом» — проверяемое утверждение.
  try {
    const all = await egrul(fio, 'ip')
    const rows = all.filter((r) => matches(r.n))
    const dropped = all.length - rows.length
    const active = rows.filter((r) => !r.e)
    console.log(
      `\nЕГРИП (индивидуальные предприниматели): найдено ${rows.length}, из них действующих ${active.length}` +
        (dropped ? ` (${dropped} не совпавших по имени и отчеству отсеяно)` : ''),
    )
    for (const r of rows.slice(0, 8)) {
      const state = r.e ? `прекращена ${r.e}` : `действует с ${r.r}`
      console.log(`  ${r.n} · ИНН ${r.i} · ${state}`)
    }
    if (all.length >= 20) console.log('  (выдача сервиса ФНС обрезана двадцатью записями — возможно, найдено не всё)')
  } catch (err) {
    console.log(`\nЕГРИП: недоступен — ${(err as Error).message}`)
  }

  // 3. Компания, если редактор её назвал. Здесь проверяется главное:
  //    указан ли герой руководителем в реестре или это его собственные слова.
  if (company) {
    await sleep(PAUSE_MS)
    try {
      const rows = await egrul(company, 'ul')
      console.log(`\nЕГРЮЛ по запросу «${company}»: найдено ${rows.length}`)
      const family = fio.trim().split(/\s+/)[0].toLowerCase()
      for (const r of rows.slice(0, 5)) {
        const state = r.e ? `ликвидировано ${r.e}` : `действует с ${r.r}`
        console.log(`  ${r.c ?? r.n} · ИНН ${r.i} · ${state}`)
        if (r.g) {
          const match = r.g.toLowerCase().includes(family) ? '  ← фамилия совпадает' : ''
          console.log(`    ${r.g}${match}`)
        }
      }
    } catch (err) {
      console.log(`\nЕГРЮЛ: недоступен — ${(err as Error).message}`)
    }
  }

  console.log(`\n${'—'.repeat(60)}`)
  console.log('Источники: ЕГРЮЛ и ЕГРИП (ФНС), реестр дисквалифицированных лиц (ФНС).')
  console.log('Данные открытые, но однофамильцев в них много: ни одно совпадение')
  console.log('не считается подтверждённым без сверки по ИНН либо дате рождения.')
}

void main()
