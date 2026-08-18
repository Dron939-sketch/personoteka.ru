import Link from 'next/link'

import { SITE } from '@/lib/site'

/**
 * Абзац со ссылками внутри.
 *
 * Абзацы контента — обычные строки, и до появления редакционных разборов этого
 * хватало: в биографии ссылки живут в отдельном блоке «Источники». В статье так
 * не выходит — ссылка нужна там, где о ней речь.
 *
 * Разметка нарочно минимальная: `[текст](адрес)` и ничего больше. Полноценный
 * markdown сюда не нужен, а `dangerouslySetInnerHTML` в поле, которое заполняет
 * редактор, — это открытая дверь: содержимое становится исполняемым кодом.
 * Здесь строка разбирается на части и собирается в элементы React, поэтому
 * вставить в неё разметку невозможно в принципе.
 */

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g

function isInternal(href: string): boolean {
  return href.startsWith('/') || href.startsWith(SITE.url)
}

export function RichText({ text }: { text: string }): React.ReactNode {
  const parts: React.ReactNode[] = []
  let last = 0

  for (const match of text.matchAll(LINK)) {
    const [full, label, href] = match
    const at = match.index ?? 0
    if (at > last) parts.push(text.slice(last, at))

    parts.push(
      isInternal(href) ? (
        <Link href={href} key={`${href}-${at}`}>
          {label}
        </Link>
      ) : (
        // Внешние ссылки открываются в новой вкладке; noopener обязателен —
        // без него открытая страница получает доступ к окну-источнику.
        <a href={href} key={`${href}-${at}`} rel="noopener" target="_blank">
          {label}
        </a>
      ),
    )
    last = at + full.length
  }

  if (last < text.length) parts.push(text.slice(last))
  return parts
}
