import fs from 'node:fs'
import path from 'node:path'

import { mediaDir } from '@/lib/portrait-runtime'

/**
 * Отдача портретов, загруженных агентствами.
 *
 * Редакционные снимки лежат в `public/media` и раздаются сервером статики;
 * агентские живут на постоянном томе вне проекта, поэтому им нужен свой
 * обработчик. Имя проверяется по строгому шаблону: любой путь с точками
 * или слешами — это попытка выйти из каталога, а не опечатка.
 */

export const dynamic = 'force-dynamic'

const NAME = /^[a-z0-9-]{1,120}\.jpg$/

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params

  if (!NAME.test(name)) return new Response('Not found', { status: 404 })

  const file = path.join(mediaDir(), name)
  if (!fs.existsSync(file)) return new Response('Not found', { status: 404 })

  const body = fs.readFileSync(file)
  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(body.length),
      // Имя файла = слаг персоны, содержимое меняется при перезаливке портрета,
      // поэтому «навсегда» здесь нельзя: сутки с фоновым обновлением.
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}
