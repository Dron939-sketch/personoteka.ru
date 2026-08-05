import 'server-only'

import path from 'node:path'

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer'

import { formatDate } from './format'
import { SITE } from './site'
import type { City, Person, RatingEntry, Sphere } from './types'

/**
 * Вёрстка PDF-досье (§6.3): портрет — монограмма, лид, ключевые факты, хронология,
 * контакты, адрес страницы. Оформление следует дизайн-системе (§7.2): бумага,
 * графит, латунная линейка.
 *
 * Шрифты те же, что на сайте, и подключаются из файлов — без них кириллица в PDF
 * не отрисуется вовсе.
 */

const fontDir = path.join(process.cwd(), 'src/assets/fonts')

Font.register({ family: 'Literata', src: path.join(fontDir, 'Literata-SemiBold.ttf') })
Font.register({ family: 'Inter', src: path.join(fontDir, 'Inter-Regular.ttf') })
// Переносы по слогам библиотека делает грубо; для русского текста лучше без них.
Font.registerHyphenationCallback((word) => [word])

const COLORS = {
  paper: '#FBFAF7',
  ink: '#14181E',
  ink2: '#3C444F',
  ink3: '#666F7A',
  line: '#E2DED6',
  accent: '#B8862B',
  accentText: '#6E4E12',
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.paper,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: 'Inter',
    fontSize: 10,
    color: COLORS.ink,
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  headerRule: { width: 28, height: 2, backgroundColor: COLORS.accent, marginRight: 8 },
  headerText: { fontSize: 8, letterSpacing: 1.6, color: COLORS.ink3 },
  hero: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  monogram: {
    width: 96,
    height: 120,
    backgroundColor: '#F3F1EC',
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontFamily: 'Literata', fontSize: 34, color: COLORS.ink3 },
  heroBody: { flex: 1 },
  // lineHeight задаём явно: без него засечный Literata налезает на следующую строку.
  name: { fontFamily: 'Literata', fontSize: 24, lineHeight: 1.2, color: COLORS.ink, marginBottom: 4 },
  tagline: { fontSize: 11, lineHeight: 1.4, color: COLORS.ink2, marginBottom: 10 },
  verified: { fontSize: 8, color: '#2D7C56', marginBottom: 8 },
  metaRow: { flexDirection: 'row', marginBottom: 2 },
  // Ширина рассчитана на самую длинную подпись — «Индекс внимания».
  metaLabel: { width: 92, paddingRight: 6, fontSize: 9, color: COLORS.ink3 },
  metaValue: { flex: 1, fontSize: 9, color: COLORS.ink },
  lead: { fontSize: 10, color: COLORS.ink2, marginBottom: 22, lineHeight: 1.6 },
  sectionTitle: {
    fontFamily: 'Literata',
    fontSize: 13,
    lineHeight: 1.3,
    color: COLORS.ink,
    marginBottom: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  factRow: { flexDirection: 'row', marginBottom: 5 },
  bullet: { width: 10, color: COLORS.accent },
  factText: { flex: 1, fontSize: 9.5, color: COLORS.ink2 },
  timelineRow: { flexDirection: 'row', marginBottom: 7 },
  timelineYear: { width: 42, fontSize: 9, color: COLORS.ink3 },
  timelineBody: { flex: 1 },
  timelineTitle: { fontSize: 9.5, color: COLORS.ink },
  timelineText: { fontSize: 9, color: COLORS.ink3 },
  footer: {
    position: 'absolute',
    left: 48,
    right: 48,
    bottom: 28,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: COLORS.ink3,
  },
})

/**
 * Заголовок раздела. `minPresenceAhead` не даёт заголовку остаться внизу страницы
 * в отрыве от своего содержимого.
 */
function SectionTitle({ children }: { children: string }) {
  return (
    <View minPresenceAhead={90}>
      <Text style={styles.sectionTitle}>{children}</Text>
    </View>
  )
}

export interface DossierInput {
  person: Person
  spheres: Sphere[]
  city?: City
  birthPlace?: City
  rating?: RatingEntry
}

export async function renderDossier(input: DossierInput): Promise<Buffer> {
  const { person, spheres, city, birthPlace, rating } = input
  const url = `${SITE.url}/${person.slug}/`

  const initials = person.display_name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')

  const meta: [string, string][] = []
  if (person.birth_date && person.birth_date_public !== false) {
    meta.push([
      'Дата рождения',
      formatDate(person.birth_date, { withYear: person.birth_year_public !== false }) +
        (birthPlace ? `, ${birthPlace.name}` : ''),
    ])
  }
  if (spheres.length) meta.push(['Сфера', spheres.map((s) => s.name).join(' · ')])
  if (city) meta.push(['Город', city.name])
  if (person.occupations.length) meta.push(['Занятия', person.occupations.join(', ')])
  if (rating) {
    meta.push([
      'Индекс внимания',
      `${Math.round(rating.attention_index)} · ${rating.rank_in_sphere}-е место в сфере`,
    ])
  }
  meta.push(['Страница', url])
  for (const link of person.links ?? []) {
    meta.push([link.label ?? 'Ссылка', link.url])
  }

  const document = (
    <Document
      title={`${person.display_name} — досье`}
      author={SITE.name}
      subject={person.tagline}
      creator={SITE.name}
    >
      <Page size="A4" style={styles.page}>
        {/* Фирменный бланк — на всех досье: бесплатного тарифа больше нет (§6.3). */}
        <View style={styles.header}>
          <View style={styles.headerRule} />
          <Text style={styles.headerText}>{SITE.name.toUpperCase()}</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.monogram}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.name}>{person.display_name}</Text>
            <Text style={styles.tagline}>{person.tagline}</Text>
            {person.verified && (
              <Text style={styles.verified}>
                Проверено редакцией
                {person.verified_at ? ` · ${formatDate(person.verified_at)}` : ''}
              </Text>
            )}
            {meta.map(([label, value]) => (
              <View style={styles.metaRow} key={`${label}-${value}`}>
                <Text style={styles.metaLabel}>{label}</Text>
                <Text style={styles.metaValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.lead}>{person.lead}</Text>

        {person.facts && person.facts.length > 0 && (
          <View>
            <SectionTitle>Ключевые факты</SectionTitle>
            {person.facts.map((fact) => (
              <View style={styles.factRow} key={fact}>
                <Text style={styles.bullet}>—</Text>
                <Text style={styles.factText}>{fact}</Text>
              </View>
            ))}
          </View>
        )}

        {person.timeline && person.timeline.length > 0 && (
          <View>
            <SectionTitle>Хронология</SectionTitle>
            {person.timeline.map((event, i) => (
              <View style={styles.timelineRow} key={`${event.year}-${i}`} wrap={false}>
                <Text style={styles.timelineYear}>{event.year}</Text>
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineTitle}>{event.title}</Text>
                  {event.description && (
                    <Text style={styles.timelineText}>{event.description}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {person.achievements && person.achievements.length > 0 && (
          <View>
            <SectionTitle>Достижения и награды</SectionTitle>
            {person.achievements.map((item, i) => (
              <View style={styles.timelineRow} key={`${item.title}-${i}`} wrap={false}>
                <Text style={styles.timelineYear}>{item.year ?? '—'}</Text>
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineTitle}>{item.title}</Text>
                  {item.issuer && <Text style={styles.timelineText}>{item.issuer}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>
            {SITE.name} · {url}
          </Text>
          <Text>Обновлено {formatDate(person.updated_at)}</Text>
        </View>
      </Page>
    </Document>
  )

  return renderToBuffer(document)
}
