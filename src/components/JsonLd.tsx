/** Обёртка над JSON-LD: разметка всегда сериализуется одинаково (§10.2). */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}
