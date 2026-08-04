import 'server-only'

import fs from 'node:fs'
import path from 'node:path'

import { getAllPersonsRaw, getEditors, getSpheres } from './content'
import type { Person } from './types'

/**
 * Данные для кабинета редакции.
 *
 * Здесь нет выдуманных цифр: показывается только то, что действительно есть
 * в репозитории — очередь публикаций и состояние карточек. Просмотры, поисковые
 * запросы и динамика индекса появятся, когда будет подключён сбор событий (§13);
 * до тех пор кабинет честно говорит, что этих данных нет.
 */

export interface QueueEntry {
  slug: string
  source_name: string
  full_name: string
  display_name: string
  sphere: string
  status: 'queued' | 'drafting' | 'published' | 'blocked'
  basis?: string
  note?: string
}

export function getQueue(): QueueEntry[] {
  const file = path.join(process.cwd(), 'content/queue.json')
  if (!fs.existsSync(file)) return []
  return JSON.parse(fs.readFileSync(file, 'utf8')) as QueueEntry[]
}

export interface QueueStats {
  total: number
  byStatus: Record<string, number>
  bySphere: { slug: string; name: string; done: number; total: number }[]
}

export function getQueueStats(): QueueStats {
  const queue = getQueue()
  const spheres = getSpheres()

  const byStatus: Record<string, number> = {}
  for (const entry of queue) {
    byStatus[entry.status] = (byStatus[entry.status] ?? 0) + 1
  }

  const bySphere = spheres
    .map((sphere) => {
      const inSphere = queue.filter((e) => e.sphere === sphere.slug)
      return {
        slug: sphere.slug,
        name: sphere.name,
        done: inSphere.filter((e) => e.status === 'published').length,
        total: inSphere.length,
      }
    })
    .filter((s) => s.total > 0)

  return { total: queue.length, byStatus, bySphere }
}

/** Чего не хватает карточке до полноты — по требованиям §5.1, §5.3 и §11. */
export interface PersonGap {
  slug: string
  display_name: string
  status: Person['status']
  editor: string
  editorName: string
  updated_at: string
  gaps: string[]
}

export function getPersonGaps(): PersonGap[] {
  const editors = new Map(getEditors().map((e) => [e.slug, e.name]))

  return getAllPersonsRaw()
    .map((person) => {
      const gaps: string[] = []
      if (!person.photos?.length) gaps.push('нет портрета')
      if (person.photos?.some((p) => !p.license)) gaps.push('фото без лицензии')
      if (!person.links?.length) gaps.push('нет ссылок (пустой sameAs)')
      if (!person.sources?.length) gaps.push('нет источников')
      if (!person.timeline?.length) gaps.push('нет хронологии')
      if (!person.facts?.length) gaps.push('нет фактов')
      if (!person.quotes?.length) gaps.push('нет прямой речи')
      if (!person.foreign_agent) gaps.push('нет сверки с реестром иноагентов')
      if (!person.verified) gaps.push('не проверено по документам')

      return {
        slug: person.slug,
        display_name: person.display_name,
        status: person.status,
        editor: person.editor,
        editorName: editors.get(person.editor) ?? person.editor,
        updated_at: person.updated_at,
        gaps,
      }
    })
    .sort((a, b) => b.gaps.length - a.gaps.length || a.display_name.localeCompare(b.display_name, 'ru'))
}
