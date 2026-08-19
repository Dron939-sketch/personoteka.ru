import { indexNowKey } from '@/lib/indexnow'

/**
 * Файл-подтверждение ключа IndexNow (§10.1). Поисковик забирает его по адресу
 * из `keyLocation` и сверяет содержимое с ключом в запросе.
 *
 * Ключ лежит в `lib/site` и берётся отсюда через `indexNowKey()` — из того же
 * места, откуда его берёт отправка. Два независимых источника разошлись бы, и
 * заявки стали бы отбиваться с 422, причём молча: сайт при этом работает.
 *
 * Маршрут остаётся динамическим: переопределение через переменную окружения
 * сохранено, а заданная только в рантайме переменная в статическом файле
 * застыла бы со значением времени сборки — и дала бы то самое расхождение.
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
