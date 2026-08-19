import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getPersonsBySphere, getSphere, getSpheres } from '@/lib/content'
import { PAGE_SIZE, pageParams, parsePage } from '@/lib/pagination'
import { SITE } from '@/lib/site'

import { SphereView } from '../../page'

/**
 * Вторая и дальше страницы раздела. Первая живёт на самом разделе — отдельного
 * `stranica/1/` нет, иначе одно содержимое получило бы два адреса.
 *
 * Нумерация в пути, а не в параметре запроса: параметры у списков закрыты
 * в `robots.txt`, и `?page=2` увёл бы хвост раздела из индекса.
 */
export function generateStaticParams() {
  const out: { sfera: string; page: string }[] = []
  for (const sphere of getSpheres()) {
    for (const { page } of pageParams(getPersonsBySphere(sphere.slug).length)) {
      out.push({ sfera: sphere.slug, page })
    }
  }
  return out
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sfera: string } & { page: string }>
}): Promise<Metadata> {
  const p = await params
  const n = parsePage(p.page)
  const sphere = getSphere(p.sfera)
  if (!sphere) notFound()

  const pages = Math.ceil(getPersonsBySphere(sphere.slug).length / PAGE_SIZE)

  return {
    // Номер в заголовке: без него страницы списка выглядят дублями друг друга.
    title: `${sphere.name}: биографии — страница ${n} из ${pages}`,
    description: `Персоны сферы «${sphere.name}» с проверяемыми фактами и ссылками на источники.`,
    alternates: { canonical: `${SITE.url}/sfera/${sphere.slug}/stranica/${n}/` },
  }
}

export default async function SpherePagedPage({
  params,
}: {
  params: Promise<{ sfera: string } & { page: string }>
}) {
  const p = await params
  const n = parsePage(p.page)
  if (n <= 1) notFound()

  return <SphereView params={Promise.resolve(p)} page={n} />
}
