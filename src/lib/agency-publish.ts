import 'server-only'

import fs from 'node:fs'
import path from 'node:path'

import type { Agency } from './agencies'
import { getAllPersonsRaw, getCities, getEditors, getSpheres, runtimePersonsDir } from './content'
import { isReservedSlug } from './site'
import { nameToLatin, slugify } from './translit'
import type { BodySection, Person, PersonStatus } from './types'

/**
 * Публикация биографии агентством — тариф «Доступ для агентств».
 *
 * Страница появляется на сайте сразу, редакция проверяет её постфактум. Отсюда
 * состав проверок: всё, что можно проверить машиной, проверяется ДО публикации,
 * потому что после неё текст уже видят читатели и поисковики.
 *
 * Машина проверяет форму (объём, слаг, справочники, обязательность источников);
 * человек — содержание. Смешивать нельзя: проверка объёма не заменяет чтения,
 * а чтение не заменяет проверки на занятый слаг.
 */

/** Границы объёма для тарифа `agency` — те же, что в `scripts/check-content.ts`. */
export const BODY_MIN = 2500
export const BODY_MAX = 10000

export interface BiographyInput {
  full_name: string
  display_name?: string
  tagline: string
  lead: string
  birth_date?: string
  city?: string
  spheres: string[]
  occupations: string[]
  body: BodySection[]
  facts?: string[]
  sources: { title: string; url?: string }[]
  links?: { url: string; label?: string }[]
  photo?: { src: string; width: number; height: number; author?: string; license?: string }
  /** Подтверждения агентства, без которых публиковать нельзя (§11.2, 255-ФЗ). */
  consent_hero: boolean
  foreign_agent_checked: boolean
}

export interface PublishResult {
  ok: boolean
  slug?: string
  errors?: string[]
}

export function bodyLength(body: BodySection[]): number {
  return body.reduce(
    (sum, section) =>
      sum +
      section.paragraphs.join(' ').length +
      (section.subsections?.reduce((s, sub) => s + sub.paragraphs.join(' ').length, 0) ?? 0),
    0,
  )
}

/** Начало текущего месяца в UTC — по нему считается лимит подписки. */
function monthStart(now = new Date()): string {
  return `${now.toISOString().slice(0, 7)}-01`
}

/** Страницы агентства: и опубликованные, и снятые редакцией. */
export function agencyPersons(agencySlug: string): Person[] {
  return getAllPersonsRaw().filter((p) => p.agency?.slug === agencySlug)
}

/** Сколько биографий агентство опубликовало в этом месяце. */
export function publishedThisMonth(agencySlug: string, now = new Date()): number {
  const border = monthStart(now)
  // Считаются и снятые редакцией: место возвращает только снятие по редполитике,
  // и возвращает его редактор — руками, отдельным действием.
  return agencyPersons(agencySlug).filter((p) => p.published_at >= border).length
}

export function validate(input: BiographyInput, agency: Agency, now = new Date()): string[] {
  const errors: string[] = []
  const spheres = new Set(getSpheres().map((s) => s.slug))
  const cities = new Set(getCities().map((c) => c.slug))

  if (!input.full_name?.trim()) errors.push('Не указано полное имя героя')
  if (!input.tagline?.trim()) errors.push('Не указан подзаголовок')
  if (input.tagline && input.tagline.length > 120) {
    errors.push(`Подзаголовок длиннее 120 знаков (${input.tagline.length})`)
  }
  if (!input.lead?.trim()) errors.push('Не указан лид')
  if (input.lead && input.lead.length > 600) {
    errors.push(`Лид длиннее 600 знаков (${input.lead.length})`)
  }

  if (!input.spheres?.length || input.spheres.length > 3) {
    errors.push('Нужно от одной до трёх рубрик')
  }
  for (const sphere of input.spheres ?? []) {
    if (!spheres.has(sphere)) errors.push(`Неизвестная рубрика «${sphere}»`)
  }
  if (input.city && !cities.has(input.city)) {
    errors.push(`Города «${input.city}» нет в справочнике — напишите редакции, добавим`)
  }
  if (!input.occupations?.filter(Boolean).length) errors.push('Не указан род занятий')

  const sections = (input.body ?? []).filter((s) => s.heading?.trim() && s.paragraphs?.length)
  if (!sections.length) errors.push('Биография пустая')
  const length = bodyLength(sections)
  if (sections.length && length < BODY_MIN) {
    errors.push(`Объём биографии ${length} знаков — меньше нормы тарифа (${BODY_MIN})`)
  }
  if (length > BODY_MAX) {
    errors.push(`Объём биографии ${length} знаков — больше лимита тарифа (${BODY_MAX})`)
  }

  // §5.3: без источников проверять текст постфактум не по чему.
  if (!input.sources?.filter((s) => s.title?.trim()).length) {
    errors.push('Нужен хотя бы один источник — по нему редакция проверяет факты')
  }

  if (!input.consent_hero) {
    errors.push('Нужно подтверждение согласия героя на публикацию (§11.2)')
  }
  if (!input.foreign_agent_checked) {
    errors.push('Нужна отметка о сверке с реестром иностранных агентов')
  }

  const slug = slugify(input.display_name?.trim() || input.full_name || '')
  if (!slug) {
    errors.push('Из имени не получается адрес страницы — проверьте написание')
  } else if (isReservedSlug(slug)) {
    errors.push(`Адрес «/${slug}/» занят разделом портала — добавьте к имени уточнение`)
  } else if (getAllPersonsRaw().some((p) => p.slug === slug)) {
    errors.push(
      `Адрес «/${slug}/» уже занят другой персоной — добавьте уточнение, например сферу деятельности`,
    )
  }

  if (agency.disabled) {
    errors.push('Подписка приостановлена — публикация недоступна')
  } else {
    const used = publishedThisMonth(agency.slug, now)
    if (used >= agency.limit_per_month) {
      errors.push(
        `Лимит месяца исчерпан: ${used} из ${agency.limit_per_month}. Следующие биографии — по цене базового размещения, напишите менеджеру.`,
      )
    }
  }

  return errors
}

/** Собирает карточку персоны из формы. Вызывается только после `validate`. */
export function buildPerson(input: BiographyInput, agency: Agency, now = new Date()): Person {
  const display = input.display_name?.trim() || input.full_name.trim()
  const stamp = now.toISOString().slice(0, 10)

  return {
    slug: slugify(display),
    full_name: input.full_name.trim(),
    display_name: display,
    name_latin: nameToLatin(display),
    tagline: input.tagline.trim(),
    lead: input.lead.trim(),
    birth_date: input.birth_date || undefined,
    city: input.city || undefined,
    spheres: input.spheres,
    occupations: input.occupations.filter(Boolean),
    body: input.body.filter((s) => s.heading?.trim() && s.paragraphs?.length),
    facts: input.facts?.filter(Boolean),
    links: input.links
      ?.filter((l) => l.url?.trim())
      .map((l) => ({ kind: 'other' as const, url: l.url.trim(), label: l.label || undefined })),
    photos: input.photo
      ? [
          {
            src: input.photo.src,
            portrait: true,
            width: input.photo.width,
            height: input.photo.height,
            alt: display,
            author: input.photo.author || undefined,
            // Основание обязательно: без него страница не пройдёт проверку прав.
            license: input.photo.license || 'предоставлено героем',
          },
        ]
      : [],
    sources: input.sources
      .filter((s) => s.title?.trim())
      .map((s) => ({ title: s.title.trim(), url: s.url?.trim() || undefined })),
    // Значок «Проверено» ставится только редакцией после сверки документов (§6.4).
    verified: false,
    plan: 'agency',
    agency: { slug: agency.slug, name: agency.name },
    status: 'published',
    // Ответственность за материал остаётся на редакции, поэтому у страницы есть
    // дежурный редактор — тот, кто проверяет агентские публикации постфактум.
    editor: dutyEditor(),
    published_at: stamp,
    updated_at: stamp,
    foreign_agent: { checked_at: stamp, listed: false },
  }
}

/**
 * Дежурный редактор по агентским материалам. Берётся из `AGENCY_EDITOR`, иначе
 * первый в `content/editors.json`: страница без подписи редактора невозможна,
 * а выдумывать имя нельзя.
 */
function dutyEditor(): string {
  const editors = getEditors().map((e) => e.slug)
  const wanted = process.env.AGENCY_EDITOR
  if (wanted && editors.includes(wanted)) return wanted
  return editors[0]
}

export function writePerson(person: Person): void {
  const dir = runtimePersonsDir()
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  fs.writeFileSync(path.join(dir, `${person.slug}.json`), `${JSON.stringify(person, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  })
  // Каталог персон читается по времени изменения — трогаем его явно, иначе
  // правка существующего файла осталась бы незамеченной.
  fs.utimesSync(dir, new Date(), new Date())
}

export function readRuntimePerson(slug: string): Person | undefined {
  const file = path.join(runtimePersonsDir(), `${slug}.json`)
  if (!fs.existsSync(file)) return undefined
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Person
  } catch {
    return undefined
  }
}

/** Снятие и возврат страницы редакцией. Файл не удаляется: история важнее места. */
export function setRuntimeStatus(slug: string, status: PersonStatus, now = new Date()): boolean {
  const person = readRuntimePerson(slug)
  if (!person) return false
  writePerson({ ...person, status, updated_at: now.toISOString().slice(0, 10) })
  return true
}
