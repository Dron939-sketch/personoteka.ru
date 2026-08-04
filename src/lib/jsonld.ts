import { getCity, getSpheres } from './content'
import { SITE } from './site'
import type { Person } from './types'

/**
 * Микроразметка (§10.2). На странице персоны — `ProfilePage` с вложенным `Person`.
 * Пустые поля не выводим: неполные узлы валидатор помечает предупреждениями.
 */
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
    alternateName: person.name_latin,
    description: person.tagline,
    jobTitle: capitalize(person.occupations[0]),
    url,
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
  // sameAs — только подтверждённые ссылки самой персоны (§2.1.1).
  if (person.links?.length) {
    node.sameAs = person.links.map((l) => l.url)
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    dateCreated: person.published_at,
    dateModified: person.updated_at,
    mainEntity: node,
  }
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
