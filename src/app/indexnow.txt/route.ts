import { indexNowKey } from '@/lib/indexnow'

/**
 * Файл-подтверждение ключа IndexNow (§10.1). Поисковик забирает его по адресу
 * из `keyLocation` и сверяет содержимое с ключом в запросе.
 *
 * Динамический, а не статический: ключ живёт в переменной окружения, и класть
 * его в репозиторий нельзя — тогда чужой человек сможет слать заявки на
 * переобход от имени домена.
 */
export const dynamic = 'force-dynamic'

export function GET() {
  const key = indexNowKey()
  if (!key) return new Response('IndexNow не настроен', { status: 404 })

  return new Response(key, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
