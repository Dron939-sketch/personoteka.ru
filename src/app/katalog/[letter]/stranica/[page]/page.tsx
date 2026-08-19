import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { RU_ALPHABET, getPersons, getPersonsByLetter, personLetter } from '@/lib/content'
import { translit } from '@/lib/translit'
import { PAGE_SIZE, pageParams, parsePage } from '@/lib/pagination'
import { SITE } from '@/lib/site'

import { LetterView, letterFromSlug } from '../../page'

/**
 * Вторая и дальше страницы раздела. Первая живёт на самом разделе — отдельного
 * `stranica/1/` нет, иначе одно содержимое получило бы два адреса.
 *
 * Нумерация в пути, а не в параметре запроса: параметры у списков закрыты
 * в `robots.txt`, и `?page=2` увёл бы хвост раздела из индекса.
 */
export function generateStaticParams() {
  const used = new Set(getPersons().map(personLetter))
  const out: { letter: string; page: string }[] = []
  for (const letter of RU_ALPHABET.filter((l) => used.has(l))) {
    for (const { page } of pageParams(getPersonsByLetter(letter).length)) {
      out.push({ letter: translit(letter), page })
    }
  }
  return out
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ letter: string } & { page: string }>
}): Promise<Metadata> {
  const p = await params
  const n = parsePage(p.page)
  const letter = letterFromSlug(p.letter)
  if (!letter) notFound()

  const pages = Math.ceil(getPersonsByLetter(letter).length / PAGE_SIZE)

  return {
    // Номер в заголовке: без него страницы списка выглядят дублями друг друга.
    title: `Персоны на букву «${letter}» — страница ${n} из ${pages}`,
    description: `Биографии, фамилии которых начинаются на «${letter}».`,
    alternates: { canonical: `${SITE.url}/katalog/${p.letter}/stranica/${n}/` },
  }
}

export default async function LetterPagedPage({
  params,
}: {
  params: Promise<{ letter: string } & { page: string }>
}) {
  const p = await params
  const n = parsePage(p.page)
  if (n <= 1) notFound()

  return <LetterView params={Promise.resolve(p)} page={n} />
}
