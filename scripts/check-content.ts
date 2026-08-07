/**
 * Проверка целостности контента.
 *
 *   npm run check:content
 *
 * Закрывает те критерии приёмки §15, которые касаются данных, а не вёрстки:
 * реестр зарезервированных слов, уникальность слагов, корректность 301-редиректов,
 * ссылочная целостность справочников. Падает с ненулевым кодом — годится для CI.
 */
import fs from 'node:fs'
import path from 'node:path'

import { RESERVED_SLUGS } from '../src/lib/site'
import { slugify } from '../src/lib/translit'
import type { City, Editor, Person, Sphere } from '../src/lib/types'

const root = process.cwd()
const read = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')) as T

const persons = fs
  .readdirSync(path.join(root, 'content/persons'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ file: f, data: read<Person>(`content/persons/${f}`) }))

const spheres = new Set(read<Sphere[]>('content/spheres.json').map((s) => s.slug))
const cities = new Set(read<City[]>('content/cities.json').map((c) => c.slug))
const editors = new Set(read<Editor[]>('content/editors.json').map((e) => e.slug))
const redirects = read<{ from: string; to: string }[]>('content/redirects.json')

const errors: string[] = []
const warnings: string[] = []

const seen = new Map<string, string>()

for (const { file, data: person } of persons) {
  const where = `content/persons/${file}`

  if (path.basename(file, '.json') !== person.slug) {
    errors.push(`${where}: имя файла не совпадает со слагом «${person.slug}»`)
  }

  // §4.1: персона не может занять адрес системного раздела — слаги живут в корне.
  if (RESERVED_SLUGS.has(person.slug)) {
    errors.push(`${where}: слаг «${person.slug}» зарезервирован за системным разделом`)
  }

  if (slugify(person.slug) !== person.slug) {
    errors.push(`${where}: слаг «${person.slug}» не соответствует правилам транслитерации`)
  }

  const duplicate = seen.get(person.slug)
  if (duplicate) {
    errors.push(`${where}: слаг «${person.slug}» уже занят файлом ${duplicate}`)
  }
  seen.set(person.slug, file)

  for (const sphere of person.spheres) {
    if (!spheres.has(sphere)) errors.push(`${where}: неизвестная сфера «${sphere}»`)
  }
  if (person.spheres.length < 1 || person.spheres.length > 3) {
    errors.push(`${where}: должно быть от 1 до 3 сфер, сейчас ${person.spheres.length}`)
  }
  if (person.city && !cities.has(person.city)) {
    errors.push(`${where}: неизвестный город «${person.city}»`)
  }
  if (person.birth_place && !cities.has(person.birth_place)) {
    errors.push(`${where}: неизвестное место рождения «${person.birth_place}»`)
  }
  if (!editors.has(person.editor)) {
    errors.push(`${where}: неизвестный редактор «${person.editor}»`)
  }

  if (person.tagline.length > 120) {
    errors.push(`${where}: tagline длиннее 120 знаков (${person.tagline.length})`)
  }
  if (person.lead.length > 600) {
    errors.push(`${where}: лид длиннее 600 знаков (${person.lead.length})`)
  }

  if (person.status !== 'published') continue

  // Дальше — требования к опубликованному материалу (§5.1, §5.3).
  if (!person.photos?.length) {
    warnings.push(`${where}: нет портрета — на странице показывается монограмма`)
  }
  // Без основания снимок публиковать нельзя: права на фотографию у фотографа.
  for (const photo of person.photos ?? []) {
    if (!photo.license) {
      errors.push(`${where}: у фотографии ${photo.src} не указана лицензия или основание`)
    }
  }
  if (person.verified && !person.verified_scope?.length) {
    errors.push(`${where}: значок «Проверено» без указания, что именно проверялось (§6.4)`)
  }
  if (person.erid && !person.advertiser) {
    errors.push(`${where}: указан erid без рекламодателя — маркировка неполная (§11.4)`)
  }

  // Сверка с реестром иностранных агентов (255-ФЗ) обязательна перед публикацией:
  // без записи о проверке неизвестно, нужна маркировка или нет.
  if (!person.foreign_agent) {
    warnings.push(`${where}: нет отметки о сверке с реестром иностранных агентов`)
  } else if (person.foreign_agent.listed) {
    if (!person.foreign_agent.registry_url) {
      errors.push(`${where}: пометка об иностранном агенте без ссылки на запись реестра`)
    }
    // Дата включения — часть записи реестра. Без неё нельзя проверить, что сверяли
    // именно этого человека и что запись не была снята: реестр меняется.
    if (!person.foreign_agent.listed_at) {
      errors.push(`${where}: пометка об иностранном агенте без даты включения в реестр`)
    }
  }

  const bodyLength = person.body.reduce(
    (sum, section) =>
      sum +
      section.paragraphs.join(' ').length +
      (section.subsections?.reduce((s, sub) => s + sub.paragraphs.join(' ').length, 0) ?? 0),
    0,
  )
  // Границы объёма из §5.3 — это обязательства перед плательщиком. У редакционных
  // материалов свой, более широкий коридор: там объём диктует материал, а не тариф.
  const limits: Record<string, [number, number]> = {
    editorial: [1200, 12000],
    free: [0, 600],
    base: [2500, 4000],
    extended: [6000, 10000],
    dossier: [6000, 20000],
  }
  const [min, max] = limits[person.plan] ?? [0, Infinity]
  if (bodyLength > max) {
    warnings.push(
      `${where}: объём биографии ${bodyLength} знаков превышает лимит тарифа «${person.plan}» (${max})`,
    )
  } else if (bodyLength < min) {
    warnings.push(
      `${where}: объём биографии ${bodyLength} знаков меньше нормы тарифа «${person.plan}» (${min})`,
    )
  }

  if (person.plan === 'extended' && !person.sources?.length) {
    errors.push(`${where}: расширенный тариф без блока «Источники» (§5.3)`)
  }
}

// §4.1 и критерий приёмки: смена слага создаёт 301, старый URL не отдаёт 404.
for (const redirect of redirects) {
  if (!seen.has(redirect.to)) {
    errors.push(
      `content/redirects.json: редирект «${redirect.from}» ведёт на несуществующий слаг «${redirect.to}»`,
    )
  }
  if (seen.has(redirect.from)) {
    errors.push(
      `content/redirects.json: слаг «${redirect.from}» одновременно занят персоной и перенаправляется`,
    )
  }
  if (RESERVED_SLUGS.has(redirect.from)) {
    errors.push(`content/redirects.json: «${redirect.from}» — зарезервированный слаг`)
  }
}

for (const warning of warnings) console.warn(`  предупреждение: ${warning}`)
for (const error of errors) console.error(`  ошибка: ${error}`)

console.log(
  `\nПроверено персон: ${persons.length}. Ошибок: ${errors.length}, предупреждений: ${warnings.length}.`,
)

if (errors.length) process.exit(1)
