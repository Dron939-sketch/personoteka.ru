import Link from 'next/link'

import { getPerson } from '@/lib/content'
import type { Article } from '@/lib/types'

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
            <p key={i}>{withLinks(p)}</p>
          ))}
          {section.subsections?.map((sub) => (
            <div key={sub.heading}>
              <h3>{sub.heading}</h3>
              {sub.paragraphs.map((p, i) => (
                <p key={i}>{withLinks(p)}</p>
              ))}
            </div>
          ))}
        </section>
      ))}
    </>
  )
}

/**
 * Ссылки в тексте материала. В JSON абзац — обычная строка, поэтому ссылка
 * пишется как `[текст](адрес)` и разворачивается здесь. Без этого обзор
 * площадок или разбор с отсылкой к документу выходит без единой ссылки —
 * читателю нечем проверить, а нам нечем подтвердить.
 *
 * Внутренние адреса (`/…`) идут через `Link`, внешние — обычной ссылкой
 * с `nofollow`: портал не торгует ссылочным весом (см. `SourceList`).
 */
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g

export function withLinks(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let last = 0

  for (const m of text.matchAll(LINK)) {
    const [full, label, href] = m
    const start = m.index
    if (start > last) parts.push(text.slice(last, start))
    parts.push(
      href.startsWith('/') ? (
        <Link key={start} href={href}>
          {label}
        </Link>
      ) : (
        <a key={start} href={href} rel="nofollow noopener" target="_blank">
          {label}
        </a>
      ),
    )
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
