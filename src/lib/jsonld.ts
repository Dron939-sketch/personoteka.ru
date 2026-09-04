import { getCity, getEditor, getSpheres } from './content'
import { SITE } from './site'
import type { Article, Person } from './types'

/**
 * Микроразметка (§10.2). На странице персоны — `ProfilePage` с вложенным `Person`.
 * Пустые поля не выводим: неполные узлы валидатор помечает предупреждениями.
 */
/** «Фамилия Имя Отчество» → части; undefined, если имя не трёхчастное кириллическое. */
function nameParts(person: Person) {
  const parts = person.full_name.trim().split(/\s+/)
  if (parts.length !== 3 || !parts.every((p) => /^[А-ЯЁа-яё][А-ЯЁа-яё-]*$/.test(p))) return undefined
  const [last, first, middle] = parts
  return { last, first, middle }
}

/**
 * Формы имени, по которым человека ищут и цитируют. Запрос «Мейстер А. Ю.»
 * или «Мейстер Андрей Юрьевич» без этих форм для поисковика — другой
 * человек, и страница с фото не показывается. Латиница — из name_latin,
 * остальное выводится из full_name механически, ничего не придумывается.
 */
function nameForms(person: Person): string[] {
  const forms = new Set<string>([person.name_latin, person.full_name])
  const p = nameParts(person)
  if (p) {
    forms.add(`${p.first} ${p.middle} ${p.last}`)
    forms.add(`${p.last} ${p.first[0]}. ${p.middle[0]}.`)
    forms.add(`${p.last} ${p.first[0]}.${p.middle[0]}.`)
  }
  forms.delete(person.display_name)
  return [...forms].filter(Boolean)
}

export function personJsonLd(person: Person) {
  const url = `${SITE.url}/${person.slug}/`
  const spheres = getSpheres().filter((s) => person.spheres.includes(s.slug))
  const city = person.city ? getCity(person.city) : undefined
  const birthPlace = person.birth_place ? getCity(person.birth_place) : undefined
  const portrait = person.photos?.find((p) => p.portrait) ?? person.photos?.[0]

  const node: Record<string, unknown> = {
    '@type': 'Person',
    '@id': `${url}#person`,
    name: person.display_name,
    alternateName: nameForms(person),
    description: person.tagline,
    jobTitle: capitalize(person.occupations[0]),
    url,
  }

  // Части имени — поисковику, чтобы склеить «Мейстер А. Ю.» и «Андрей Мейстер»
  // в одного человека. Только для трёхчастных кириллических имён: у «1.Kla$»
  // и у иностранцев отчества нет, и раскладывать их по полям — врать.
  const parts = nameParts(person)
  if (parts) {
    node.familyName = parts.last
    node.givenName = parts.first
    node.additionalName = parts.middle
  }

  if (person.birth_date && person.birth_date_public !== false) {
    node.birthDate = person.birth_date
  }
  if (person.death_date) {
    node.deathDate = person.death_date
  }
  if (birthPlace) {
    node.birthPlace = { '@type': 'Place', name: birthPlace.name }
  }
  if (city) {
    node.homeLocation = { '@type': 'Place', name: city.name }
  }
  if (portrait) {
    node.image = new URL(portrait.src, SITE.url).toString()
  }
  if (person.education?.length) {
    node.alumniOf = person.education.map((e) => ({
      '@type': 'EducationalOrganization',
      name: e.institution,
    }))
  }
  if (person.career?.length) {
    const current = person.career[person.career.length - 1]
    node.worksFor = { '@type': 'Organization', name: current.organization }
  }
  if (person.achievements?.length) {
    node.award = person.achievements.map((a) => a.title)
  }
  if (spheres.length || person.occupations.length) {
    node.knowsAbout = [...new Set([...person.occupations, ...spheres.map((s) => s.name)])]
  }
  // sameAs — адреса, по которым поисковик опознаёт того же человека.
  //
  // Два источника, и они разной природы. Первый — подтверждённые ссылки самой
  // персоны (§2.1.1): их даёт герой, и ручаемся за них мы. Второй —
  // энциклопедические статьи из списка источников биографии: Википедия
  // и Викиданные для поисковых систем работают как удостоверение личности,
  // и без такой ссылки страница про однофамильца и страница про известного
  // человека для робота выглядят одинаково. Ссылку на статью мы и так уже
  // проверили — по ней писался текст.
  const encyclopedic = (person.sources ?? [])
    .map((s) => s.url)
    .filter(
      (url): url is string =>
        !!url && /^https:\/\/(ru\.|www\.)?(wikipedia\.org|wikidata\.org)/.test(url),
    )

  const sameAs = [...new Set([...(person.links ?? []).map((l) => l.url), ...encyclopedic])]
  if (sameAs.length) {
    node.sameAs = sameAs
  }

  // Источники биографии — в `citation`. Для поисковика это подтверждение того,
  // что страница написана по проверяемым материалам, а для ИИ-ассистента —
  // готовая цепочка «утверждение → откуда взято», которую он может показать
  // вместе с ответом.
  const citation = (person.sources ?? [])
    .filter((s) => s.url)
    .map((s) => ({ '@type': 'CreativeWork', name: s.title, url: s.url }))

  const page: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': url,
    url,
    name: `${person.display_name} — ${person.tagline}`,
    description: person.tagline,
    inLanguage: 'ru-RU',
    dateCreated: person.published_at,
    dateModified: person.updated_at,
    isAccessibleForFree: true,
    // Условия использования, в том числе ИИ-системами (§10.4). `usageInfo` —
    // именно то поле, в котором schema.org ждёт ссылку на правила
    // переиспользования; без него разрешение существует только в тексте.
    usageInfo: `${SITE.url}/ispolzovanie-ii/`,
    publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
    mainEntity: node,
  }

  if (citation.length) {
    page.citation = citation
  }

  // Подпись редактора. Ассистент, отвечающий про человека, охотнее ссылается
  // на материал, у которого есть названный автор и дата, чем на анонимный текст.
  const editor = getEditor(person.editor)
  if (editor) {
    page.author = {
      '@type': 'Person',
      name: editor.name,
      jobTitle: editor.role,
      url: `${SITE.url}/redakciya/`,
    }
  }

  return page
}

/** В карточке занятия пишутся строчными, а в `jobTitle` уходят с заглавной. */
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** `Organization` + `WebSite` с `SearchAction` — на главной (§10.2). */
export function siteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE.url}/#organization`,
        name: SITE.name,
        url: SITE.url,
        email: SITE.email,
        // Логотип нужен, чтобы поисковик мог показать значок издания рядом
        // с выдачей и в карточке организации. Требование к файлу — растр
        // не меньше 112 px по короткой стороне; берём готовую иконку 512×512.
        logo: {
          '@type': 'ImageObject',
          url: `${SITE.url}/icon-512.png`,
          width: 512,
          height: 512,
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE.url}/#website`,
        name: SITE.name,
        url: SITE.url,
        inLanguage: 'ru-RU',
        publisher: { '@id': `${SITE.url}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE.url}/poisk/?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }
}

/** `ItemList` для рейтинга и рубрик (§10.2). */
export function itemListJsonLd(persons: Person[], name: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: persons.length,
    itemListElement: persons.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE.url}/${p.slug}/`,
      name: p.display_name,
    })),
  }
}

/**
 * `Article` для редакционных материалов (§10.2).
 *
 * `mentions` перечисляет персон, о которых текст: это связывает статью с
 * карточками каталога в глазах поисковика — те же сущности, что и в
 * `personJsonLd`, только с другой стороны.
 */
export function articleJsonLd(article: Article, url: string, authorName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: article.title,
    description: article.lead,
    inLanguage: 'ru-RU',
    datePublished: article.published_at,
    dateModified: article.updated_at,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Person', name: authorName },
    publisher: { '@id': `${SITE.url}/#organization` },
    ...(article.cover ? { image: `${SITE.url}${article.cover.src}` } : {}),
    ...(article.mentions.length
      ? {
          mentions: article.mentions.map((slug) => ({
            '@type': 'Person',
            '@id': `${SITE.url}/${slug}/#person`,
          })),
        }
      : {}),
  }
}
