import { currentAgency } from '@/lib/lk-session'
import { MAX_UPLOAD_BYTES, savePortrait } from '@/lib/portrait-runtime'
import { clientIp, rateLimit } from '@/lib/request'
import { slugify } from '@/lib/translit'

/**
 * Загрузка портрета из кабинета агентства.
 *
 * Файл принимается до публикации, потому что кадр нужно показать в форме: снимок
 * обрезается по правилам портала (4:5), и увидеть результат агентство должно
 * раньше, чем нажмёт «опубликовать». Побочный эффект — если публикация потом не
 * состоится, портрет останется лежать в каталоге. Это дешевле, чем заставлять
 * человека грузить фото вслепую; чистка неиспользованных файлов — забота
 * редакции, а не условие публикации.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const agency = await currentAgency()
  if (!agency) return Response.json({ error: 'Нужен вход в кабинет агентства' }, { status: 401 })

  if (!rateLimit(`foto:${clientIp(request)}`, 30, 10 * 60 * 1000)) {
    return Response.json({ error: 'Слишком много загрузок подряд' }, { status: 429 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const file = form.get('file')
  const name = String(form.get('name') ?? '')
  const slug = slugify(name)

  if (!(file instanceof File)) return Response.json({ error: 'Файл не передан' }, { status: 400 })
  if (!slug) {
    return Response.json({ error: 'Сначала укажите имя героя — по нему называется файл' }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: `Файл больше ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} МБ` },
      { status: 400 },
    )
  }
  if (!/^image\/(jpeg|png|webp|avif|tiff)$/.test(file.type)) {
    return Response.json({ error: 'Нужен файл изображения: JPEG, PNG, WebP или AVIF' }, { status: 400 })
  }

  try {
    const photo = await savePortrait(Buffer.from(await file.arrayBuffer()), slug)
    return Response.json({ ok: true, photo })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'не удалось обработать снимок'
    return Response.json({ error: `Портрет не принят: ${message}` }, { status: 400 })
  }
}
