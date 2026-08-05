import { getPerson } from '@/lib/content'
import { clientIp } from '@/lib/request'
import { recordView } from '@/lib/views'

/**
 * Приём просмотра страницы персоны.
 *
 * Считается только по существующему слагу: иначе счётчик станет свалкой из
 * чужих строк. Ответ всегда 204 и всегда пустой — это маяк, а не запрос данных,
 * и ошибки счётчика не должны попадать в консоль читателя.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { slug } = (await request.json()) as { slug?: unknown }
    if (typeof slug === 'string' && getPerson(slug)) {
      recordView(slug, clientIp(request))
    }
  } catch {
    // Счётчик молчит: сломанный маяк не повод показывать ошибку читателю.
  }
  return new Response(null, { status: 204 })
}
