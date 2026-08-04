import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AdDisclosure, AdSlot } from '@/components/AdSlot'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { CTAStrip } from '@/components/CTAStrip'
import { FactCards } from '@/components/FactCards'
import { ForeignAgentNotice } from '@/components/ForeignAgentNotice'
import { Gallery } from '@/components/Gallery'
import { JsonLd } from '@/components/JsonLd'
import { MetaList } from '@/components/MetaList'
import { PersonCard } from '@/components/PersonCard'
import { PhotoCredit } from '@/components/PhotoCredit'
import { Portrait } from '@/components/Portrait'
import { AchievementList, PublicationList } from '@/components/PublicationList'
import { QuoteBlock } from '@/components/QuoteBlock'
import { SourceList } from '@/components/SourceList'
import { Timeline } from '@/components/Timeline'
import { Toc, type TocItem } from '@/components/Toc'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { VideoEmbed } from '@/components/VideoEmbed'
import {
  getCity,
  getEditor,
  getPerson,
  getPersons,
  getRatingEntry,
  getRelatedPersons,
  getSpheres,
} from '@/lib/content'
import { calcAge, formatDate, truncateForMeta } from '@/lib/format'
import { personJsonLd } from '@/lib/jsonld'
import { SITE } from '@/lib/site'
import { slugify } from '@/lib/translit'
import type { Person } from '@/lib/types'

import styles from './page.module.css'

/**
 * Страница персоны — главный экран продукта (§8.1).
 * Слаг живёт в корне (`/andrej-mejster/`) — сильнейший вариант под запрос по имени (§4.1).
 * Статические маршруты (`/katalog/`, `/rejting/`…) имеют приоритет над этим динамическим,
 * а реестр зарезервированных слов (§4.1) не даёт создать персону с таким слагом.
 */

// Неизвестный параметр рендерится по запросу и упирается в notFound() ниже — это
// честная 404. С `false` Next вместо неё пишет в лог NoFallbackError на каждый
// битый адрес: страница всё равно отдаётся, но лог засоряется, а причину не видно.
export const dynamicParams = true

export function generateStaticParams() {
  return getPersons().map((person) => ({ slug: person.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const person = getPerson(slug)
  if (!person) return {}

  const url = `${SITE.url}/${person.slug}/`
  const description = truncateForMeta(person.lead)

  return {
    // §10.1: «Иван Иванов — врач-кардиолог: биография, карьера, достижения»
    title: `${person.display_name} — ${person.tagline.toLowerCase()}: биография, карьера, достижения`,
    description,
    alternates: { canonical: url },
    robots: person.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'profile',
      url,
      title: `${person.display_name} — ${person.tagline}`,
      description,
      images: [{ url: `/${person.slug}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image' },
  }
}

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const person = getPerson(slug)
  if (!person) notFound()

  const spheres = getSpheres().filter((s) => person.spheres.includes(s.slug))
  const city = person.city ? getCity(person.city) : undefined
  const birthPlace = person.birth_place ? getCity(person.birth_place) : undefined
  const editor = getEditor(person.editor)
  const rating = getRatingEntry(person.slug)
  const related = getRelatedPersons(person)
  const primarySphere = spheres[0]

  const sections = buildSections(person)
  const toc: TocItem[] = sections.map((s) => ({ id: s.id, label: s.label }))
  const hasPublications =
    (person.publications?.length ?? 0) + (person.media_mentions?.length ?? 0) > 0

  const age = person.birth_date && person.birth_date_public !== false
    ? calcAge(person.birth_date)
    : null

  return (
    <>
      <JsonLd data={personJsonLd(person)} />

      <div className="container">
        <Breadcrumbs
          items={[
            ...(primarySphere
              ? [{ href: `/sfera/${primarySphere.slug}/`, label: primarySphere.name }]
              : []),
            { label: person.display_name },
          ]}
        />

        <article>
          {/* ---------- Герой-блок ---------- */}
          <header className={styles.hero}>
            <div className={styles.portraitCol}>
              <Portrait
                person={person}
                width={420}
                priority
                sizes="(min-width: 1024px) 340px, (min-width: 768px) 40vw, 100vw"
                className={styles.portrait}
              />
              <PhotoCredit photo={person.photos?.find((p) => p.portrait) ?? person.photos?.[0]} />
            </div>

            <div className={styles.heroBody}>
              {/* Обе маркировки идут перед содержанием материала — этого требует закон. */}
              <ForeignAgentNotice person={person} />
              <AdDisclosure erid={person.erid} advertiser={person.advertiser} />

              <div className={styles.nameRow}>
                {/* §8.1: H1 — имя и только имя. */}
                <h1 className={styles.name}>{person.display_name}</h1>
                <VerifiedBadge person={person} />
              </div>

              <p className={styles.tagline}>{person.tagline}</p>

              <MetaList
                items={[
                  {
                    label: 'Родился',
                    value: person.birth_date && person.birth_date_public !== false && (
                      <>
                        <time dateTime={person.birth_date}>
                          {formatDate(person.birth_date, {
                            withYear: person.birth_year_public !== false,
                          })}
                        </time>
                        {age !== null && person.birth_year_public !== false ? ` · ${age} лет` : ''}
                        {birthPlace ? `, ${birthPlace.name}` : ''}
                      </>
                    ),
                  },
                  {
                    label: 'Сфера',
                    value: spheres.length ? (
                      <>
                        {spheres.map((s, i) => (
                          <span key={s.slug}>
                            {i > 0 && ' · '}
                            <Link href={`/sfera/${s.slug}/`}>{s.name}</Link>
                          </span>
                        ))}
                      </>
                    ) : null,
                  },
                  {
                    label: 'Город',
                    value: city ? <Link href={`/gorod/${city.slug}/`}>{city.name}</Link> : null,
                  },
                  {
                    label: 'Занятия',
                    value: person.occupations.join(', '),
                  },
                  {
                    label: 'Индекс внимания',
                    // Моноширинными идут только цифры: кириллица в JetBrains Mono
                    // выбивается из набора.
                    value: rating ? (
                      <Link href="/rejting/" className="link-data">
                        <span className="tabular">{Math.round(rating.attention_index)}</span> ·{' '}
                        <span className="tabular">{rating.rank_in_sphere}</span>-е место
                        {primarySphere ? ` в сфере «${primarySphere.name}»` : ''}
                      </Link>
                    ) : null,
                  },
                ]}
              />

              <div className={styles.actions}>
                {/* §6.3: досье уходит в СМИ и жюри премий — генерация вёрстанного PDF. */}
                <a className={styles.primaryAction} href={`/api/dose/${person.slug}`} download>
                  Скачать досье (PDF)
                </a>
                {/* Подстраница генерируется только при наличии материалов —
                    ссылка на неё появляется по тому же условию, иначе это 404. */}
                {hasPublications && (
                  <Link className={styles.secondaryAction} href={`/${person.slug}/publikacii/`}>
                    Публикации и упоминания
                  </Link>
                )}
              </div>
            </div>
          </header>

          <p className={`lead ${styles.lead}`}>{person.lead}</p>

          {/* ---------- Тело: оглавление + разделы ---------- */}
          <div className={styles.layout}>
            <div className={styles.tocCol}>
              <Toc items={toc} />
            </div>

            <div className={styles.contentCol}>
              {sections.map((section, i) => (
                <section
                  key={section.id}
                  id={section.id}
                  className={i > 2 ? `${styles.section} deferred` : styles.section}
                >
                  <h2 className="ruled">{section.label}</h2>
                  {section.content}
                </section>
              ))}

              <AdSlot plan={person.plan} />

              {/* ---------- Подпись редакции (§3.2, §10.3) ---------- */}
              <footer className={styles.colophon}>
                <p>
                  Обновлено{' '}
                  <time dateTime={person.updated_at}>{formatDate(person.updated_at)}</time>
                  {editor ? (
                    <>
                      {' · Редактор: '}
                      <Link href="/redakciya/">{editor.name}</Link>
                    </>
                  ) : null}
                  {' · Опубликовано '}
                  <time dateTime={person.published_at}>{formatDate(person.published_at)}</time>
                </p>
                <p className={styles.colophonLinks}>
                  <Link href={`/udalenie-dannyh/?page=/${person.slug}/`}>Сообщить об ошибке</Link>
                  {' · '}
                  <Link href={`/udalenie-dannyh/?page=/${person.slug}/`}>
                    Запросить изменение данных
                  </Link>
                </p>
              </footer>
            </div>
          </div>
        </article>
      </div>

      {/* ---------- Похожие персоны ---------- */}
      {related.length > 0 && (
        <section className="section section-alt deferred">
          <div className="container">
            <h2 className="ruled">Похожие персоны</h2>
            <div className={styles.relatedGrid}>
              {related.map((p) => (
                <PersonCard key={p.slug} person={p} size="m" />
              ))}
            </div>
            {primarySphere && (
              <p className={styles.relatedMore}>
                <Link href={`/sfera/${primarySphere.slug}/`}>
                  Все персоны в сфере «{primarySphere.name}»
                </Link>
              </p>
            )}
          </div>
        </section>
      )}

      <div className="container section">
        <CTAStrip />
      </div>
    </>
  )
}

interface Section {
  id: string
  label: string
  content: React.ReactNode
}

/**
 * Порядок разделов задан §8.1 и §5.3: биография → хронология → факты → цитата →
 * достижения → публикации → источники. Пустые разделы не попадают ни на страницу,
 * ни в оглавление.
 */
function buildSections(person: Person): Section[] {
  const sections: Section[] = []

  for (const block of person.body) {
    sections.push({
      id: sectionId(block.heading),
      label: block.heading,
      content: (
        <div className="prose">
          {block.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {block.subsections?.map((sub) => (
            <div key={sub.heading}>
              <h3>{sub.heading}</h3>
              {sub.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ))}
        </div>
      ),
    })
  }

  if (person.timeline?.length) {
    sections.push({
      id: 'hronologiya',
      label: 'Хронология',
      content: <Timeline events={person.timeline} />,
    })
  }

  if (person.facts?.length) {
    sections.push({
      id: 'fakty',
      label: 'Факты',
      content: <FactCards facts={person.facts} />,
    })
  }

  if (person.quotes?.length) {
    sections.push({
      id: 'citaty',
      label: 'Прямая речь',
      content: (
        <>
          {person.quotes.map((q, i) => (
            <QuoteBlock key={i} quote={q} />
          ))}
        </>
      ),
    })
  }

  if (person.achievements?.length) {
    sections.push({
      id: 'dostizheniya',
      label: 'Достижения и награды',
      content: <AchievementList items={person.achievements} />,
    })
  }

  const publications = [...(person.publications ?? []), ...(person.media_mentions ?? [])]
  if (publications.length) {
    sections.push({
      id: 'publikacii',
      label: 'Публикации и СМИ',
      content: <PublicationList items={publications} />,
    })
  }

  // Портрет уже показан в герое — в галерею идут остальные снимки (§8.1).
  const galleryPhotos = person.photos.filter((photo) => !photo.portrait).slice(0, 12)
  if (galleryPhotos.length || person.video?.length) {
    sections.push({
      id: 'galereya',
      label: person.video?.length && !galleryPhotos.length ? 'Видео' : 'Галерея и видео',
      content: (
        <>
          {galleryPhotos.length > 0 && (
            <Gallery photos={galleryPhotos} personName={person.display_name} />
          )}
          {person.video?.map((video) => (
            <div key={video.id} style={{ marginTop: 'var(--sp-6)' }}>
              <VideoEmbed video={video} />
            </div>
          ))}
        </>
      ),
    })
  }

  if (person.sources?.length) {
    sections.push({
      id: 'istochniki',
      label: 'Источники',
      content: <SourceList sources={person.sources} />,
    })
  }

  return sections
}

/**
 * Якорь раздела — транслитерация его заголовка. Значит, ссылка вида
 * `/ivan-ivanov/#karera` не зависит от порядка разделов и переживает их перестановку.
 */
function sectionId(heading: string): string {
  return slugify(heading) || 'razdel'
}
