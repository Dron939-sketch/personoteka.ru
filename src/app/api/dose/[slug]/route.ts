import { getCity, getPerson, getPersons, getRatingEntry, getSpheres } from '@/lib/content'
import { renderDossier } from '@/lib/dossier'

/**
 * PDF-досье персоны — §6.3 ТЗ.
 *
 * Клиент получает файл, который отправляет в СМИ и жюри премий, поэтому досье
 * генерируется из тех же данных, что и страница: разойтись они не могут.
 * Для платных тарифов документ идёт на фирменном бланке.
 */

export const dynamic = 'force-static'

export function generateStaticParams() {
  return getPersons().map((person) => ({ slug: person.slug }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const person = getPerson(slug)

  if (!person) {
    return new Response('Персона не найдена', { status: 404 })
  }

  const pdf = await renderDossier({
    person,
    spheres: getSpheres().filter((s) => person.spheres.includes(s.slug)),
    city: person.city ? getCity(person.city) : undefined,
    birthPlace: person.birth_place ? getCity(person.birth_place) : undefined,
    rating: getRatingEntry(person.slug),
  })

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="personoteka-${person.slug}.pdf"`,
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
