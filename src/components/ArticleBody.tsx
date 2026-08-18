import { Fragment } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { getPerson } from '@/lib/content'
import { SITE } from '@/lib/site'
import type { Article, SectionFigure } from '@/lib/types'

import styles from './ArticleBody.module.css'

/**
 * Тело редакционного материала: секции с H2 и подзаголовками — та же структура
 * `BodySection`, что у биографии, чтобы верстка и оглавление были общими (§5.2).
 */
export function ArticleBody({ body }: { body: Article['body'] }) {
  return (
    <>
      {body.map((section) => (
        <section key={section.heading} className={styles.section}>
          <h2 id={anchor(section.heading)}>{section.heading}</h2>
          {section.paragraphs.map((p, i) => (
            <Fragment key={i}>
              <p>{withLinks(p)}</p>
              {section.pullquotes
                ?.filter((q) => q.after === i)
                .map((q, j) => (
                  <aside key={j} className={styles.pullquote}>
                    {withLinks(q.text)}
                  </aside>
                ))}
            </Fragment>
          ))}
          {section.subsections?.map((sub) => (
            <div key={sub.heading}>
              <h3>{sub.heading}</h3>
              {sub.paragraphs.map((p, i) => (
                <p key={i}>{withLinks(p)}</p>
              ))}
            </div>
          ))}
          {section.figures?.map((figure, i) => (
            <Figure key={i} figure={figure} />
          ))}
        </section>
      ))}
    </>
  )
}

/**
 * Иллюстрация раздела. Схема идёт инлайновым SVG — она часть страницы, а не
 * внешний файл, поэтому не даёт лишнего запроса и печатается вместе с текстом.
 * У снимка рядом с подписью обязательно стоят автор и лицензия: без основания
 * публиковать чужой кадр нельзя, а свободные лицензии требуют указания автора.
 */
function Figure({ figure }: { figure: SectionFigure }) {
  const { svg, photo, caption, alt } = figure

  return (
    <figure className={styles.figure}>
      {svg ? (
        <div role="img" aria-label={alt ?? caption} dangerouslySetInnerHTML={{ __html: svg }} />
      ) : photo ? (
        <Image
          src={photo.src}
          alt={photo.alt ?? alt ?? caption}
          width={photo.width}
          height={photo.height}
          sizes="(max-width: 720px) 100vw, 720px"
        />
      ) : null}
      <figcaption className={styles.figcaption}>
        {withLinks(caption)}
        {photo?.license && (
          <span className={styles.credit}>
            {photo.author ? `${photo.author} · ` : ''}
            {photo.source_url ? (
              <a href={photo.source_url} rel="nofollow noopener" target="_blank">
                {photo.license}
              </a>
            ) : (
              photo.license
            )}
          </span>
        )}
      </figcaption>
    </figure>
  )
}

/**
 * Разметка внутри абзаца материала. В JSON абзац — обычная строка, а React
 * экранирует HTML, поэтому теги в тексте вышли бы на страницу видимыми
 * угловыми скобками. Значит, размечать можно только тем, что разворачивается
 * здесь: `[текст](адрес)` для ссылки и `**текст**` для выделения.
 *
 * Ссылки нужны, чтобы разбор с отсылкой к документу не выходил без единой
 * ссылки — читателю нечем проверить, а нам нечем подтвердить. Выделение —
 * чтобы в длинном разборе были видны опорные утверждения.
 *
 * Внутренние адреса (`/…`) идут через `Link`, внешние — обычной ссылкой
 * с `nofollow`: портал не торгует ссылочным весом (см. `SourceList`).
 * Исключение — свои же площадки из `SITE.ownDomains`: ссылка на собственный
 * первоисточник ничего не продаёт, и закрывать её от поисковика значит
 * прятать авторство.
 */
/** Свои площадки — без `nofollow`, чужие — с ним. */
function externalRel(href: string): string {
  const own = SITE.ownDomains.some(
    (domain) => href.includes(`//${domain}`) || href.includes(`//www.${domain}`),
  )
  return own ? 'noopener' : 'nofollow noopener'
}

const MARKUP = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g

export function withLinks(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let last = 0

  for (const m of text.matchAll(MARKUP)) {
    const [full, label, href, bold] = m
    const start = m.index
    if (start > last) parts.push(text.slice(last, start))

    if (bold !== undefined) {
      parts.push(<strong key={start}>{bold}</strong>)
    } else {
      parts.push(
        href.startsWith('/') ? (
          <Link key={start} href={href}>
            {label}
          </Link>
        ) : (
          <a key={start} href={href} rel={externalRel(href)} target="_blank">
            {label}
          </a>
        ),
      )
    }
    last = start + full.length
  }

  if (last === 0) return text
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

/**
 * Персоны, о которых материал. Это не украшение: ссылка из статьи в каталог —
 * половина смысла раздела, она передаёт биографиям вес по теме, которой у
 * страницы с одним именем нет (см. `content/KONTENT-STRATEGIYA.md`).
 */
export function ArticleMentions({ slugs }: { slugs: string[] }) {
  const persons = slugs.map((slug) => getPerson(slug)).filter((p) => p !== undefined)
  if (!persons.length) return null

  return (
    <section className={styles.mentions}>
      <h2>Герои этого материала</h2>
      <ul>
        {persons.map((person) => (
          <li key={person.slug}>
            <Link href={`/${person.slug}/`}>{person.display_name}</Link>
            {person.tagline && <span className={styles.tagline}> — {lowerFirst(person.tagline)}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1)
}

/** Якорь заголовка: тот же приём, что в оглавлении биографии. */
export function anchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
}
