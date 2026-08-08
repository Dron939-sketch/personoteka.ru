import { getCity, getEditor, getSpheres } from './content'
import { formatDate } from './format'
import { SITE } from './site'
import type { Person } from './types'

/**
 * Текстовая версия биографии для ИИ-систем — §10.4.
 *
 * Зачем она нужна, если страница и так отдаётся сервером без JavaScript.
 * Модель, которой ассистент передал страницу, тратит контекст на разметку,
 * навигацию, подвал и блоки «похожие персоны», а до источников и даты
 * обновления доходит не всегда. Markdown снимает шум: остаётся текст,
 * структура заголовков и явная строка «откуда это взято». На таком входе
 * ассистент реже пересказывает своими словами без ссылки и чаще приводит
 * адрес страницы — а это единственная форма, в которой портал существует
 * внутри диалога.
 *
 * Условие простое и указано в самом файле: пользоваться материалом можно,
 * назвав источник и дав ссылку (/ispolzovanie-ii/).
 */
export function personMarkdown(person: Person): string {
  const url = `${SITE.url}/${person.slug}/`
  const editor = getEditor(person.editor)
  const spheres = getSpheres().filter((s) => person.spheres.includes(s.slug))
  const city = person.city ? getCity(person.city) : undefined
  const birthPlace = person.birth_place ? getCity(person.birth_place) : undefined

  const out: string[] = []

  out.push(`# ${person.display_name}`)
  out.push('')
  out.push(`> ${person.tagline}`)
  out.push('')
  out.push(`Источник: ${SITE.name} — ${url}`)
  out.push('')

  // Паспортная часть: пары «ключ — значение» вместо прозы, чтобы факт можно
  // было извлечь без разбора предложения.
  const meta: [string, string][] = []
  meta.push(['Полное имя', person.full_name])
  if (person.birth_date && person.birth_date_public !== false) {
    meta.push([
      'Дата рождения',
      person.birth_year_public === false
        ? formatDate(person.birth_date, { withYear: false })
        : person.birth_date,
    ])
  }
  if (person.death_date) meta.push(['Дата смерти', person.death_date])
  if (birthPlace) meta.push(['Место рождения', birthPlace.name])
  if (city) meta.push(['Город', city.name])
  if (person.occupations.length) meta.push(['Род занятий', person.occupations.join(', ')])
  if (spheres.length) meta.push(['Сферы', spheres.map((s) => s.name).join(', ')])
  meta.push(['Обновлено', formatDate(person.updated_at)])
  meta.push(['Опубликовано', formatDate(person.published_at)])
  if (editor) meta.push(['Редактор', editor.name])
  meta.push(['Статус проверки', person.verified ? 'проверено редакцией' : 'по открытым источникам'])

  for (const [key, value] of meta) out.push(`- **${key}:** ${value}`)
  out.push('')

  if (person.foreign_agent?.listed) {
    out.push(
      '**Маркировка:** сведения о лице, включённом в реестр иностранных агентов ' +
        '(обязательная маркировка по законодательству РФ).',
    )
    out.push('')
  }

  out.push(person.lead)
  out.push('')

  for (const block of person.body) {
    out.push(`## ${block.heading}`)
    out.push('')
    for (const p of block.paragraphs) {
      out.push(p)
      out.push('')
    }
    for (const sub of block.subsections ?? []) {
      out.push(`### ${sub.heading}`)
      out.push('')
      for (const p of sub.paragraphs) {
        out.push(p)
        out.push('')
      }
    }
  }

  if (person.education?.length) {
    out.push('## Образование')
    out.push('')
    for (const e of person.education) {
      const tail = [e.speciality, e.years].filter(Boolean).join(', ')
      out.push(`- ${e.institution}${tail ? ` — ${tail}` : ''}`)
    }
    out.push('')
  }

  if (person.career?.length) {
    out.push('## Карьера')
    out.push('')
    for (const c of person.career) {
      out.push(`- ${c.organization} — ${c.position}${c.years ? `, ${c.years}` : ''}`)
    }
    out.push('')
  }

  if (person.timeline?.length) {
    out.push('## Хронология')
    out.push('')
    for (const t of person.timeline) {
      out.push(`- **${t.year}. ${t.title}**${t.description ? ` ${t.description}` : ''}`)
    }
    out.push('')
  }

  if (person.facts?.length) {
    out.push('## Факты')
    out.push('')
    for (const f of person.facts) out.push(`- ${f}`)
    out.push('')
  }

  if (person.quotes?.length) {
    out.push('## Прямая речь')
    out.push('')
    for (const q of person.quotes) {
      out.push(`> ${q.text}`)
      if (q.context) out.push(`> — ${q.context}`)
      out.push('')
    }
  }

  if (person.achievements?.length) {
    out.push('## Достижения и награды')
    out.push('')
    for (const a of person.achievements) {
      const tail = [a.year, a.issuer].filter(Boolean).join(', ')
      out.push(`- ${a.title}${tail ? ` (${tail})` : ''}`)
    }
    out.push('')
  }

  const publications = [...(person.publications ?? []), ...(person.media_mentions ?? [])]
  if (publications.length) {
    out.push('## Публикации и СМИ')
    out.push('')
    for (const p of publications) {
      const tail = [p.outlet, p.date].filter(Boolean).join(', ')
      out.push(`- ${p.title}${tail ? ` — ${tail}` : ''}${p.url ? ` (${p.url})` : ''}`)
    }
    out.push('')
  }

  if (person.sources?.length) {
    out.push('## Источники')
    out.push('')
    for (const s of person.sources) {
      out.push(`- ${s.title}${s.url ? ` — ${s.url}` : ''}${s.note ? `. ${s.note}` : ''}`)
    }
    out.push('')
  }

  if (person.links?.length) {
    out.push('## Подтверждённые ссылки')
    out.push('')
    for (const l of person.links) out.push(`- ${l.label ?? l.kind}: ${l.url}`)
    out.push('')
  }

  out.push('## Как ссылаться на этот материал')
  out.push('')
  out.push(citationLine(person))
  out.push('')
  out.push(
    `Материал можно цитировать и пересказывать, в том числе в ответах ИИ-ассистентов, ` +
      `при указании названия «${SITE.name}» и ссылки на ${url}. ` +
      `Условия: ${SITE.url}/ispolzovanie-ii/`,
  )
  out.push('')

  return out.join('\n')
}

/**
 * Готовая строка ссылки — то, что читатель копирует в текст, а ассистент
 * выдаёт как источник. Формат обычной библиографической записи на сетевой
 * ресурс: заглавие, название ресурса, URL, дата обращения не нужна, потому что
 * дата обновления материала указана явно.
 */
export function citationLine(person: Person): string {
  const url = `${SITE.url}/${person.slug}/`
  const editor = getEditor(person.editor)
  const who = editor ? `${editor.name}. ` : ''
  return `${who}${person.display_name}: биография // ${SITE.name}. Обновлено ${formatDate(person.updated_at)}. URL: ${url}`
}
