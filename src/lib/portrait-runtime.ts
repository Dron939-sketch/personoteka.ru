import 'server-only'

import fs from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

import { dataDir } from './data-dir'

/**
 * Обработка портрета, загруженного агентством из кабинета.
 *
 * Правила кадра те же, что и у редакционного конвейера (`scripts/lib/portrait.ts`):
 * 4:5, 1200×1500, лёгкое приглушение насыщенности и добавка контраста — иначе
 * каталог перестанет выглядеть цельным. Отличие одно: кадрирование здесь
 * автоматическое (`attention`), без ручного зума и выбора стороны. Редактор,
 * которому кадр не понравится, перезаливает портрет своим конвейером —
 * агентству же нужен предсказуемый результат без параметров.
 *
 * Файлы лежат в `DATA_DIR/media`, а не в `public/`: каталог приложения на
 * платформе пересоздаётся при каждом деплое, и загруженные портреты исчезли бы
 * вместе с ним.
 */

export const WIDTH = 1200
export const HEIGHT = 1500

/** Больше в портрет не нужно, а принимать десятки мегабайт незачем. */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024

export function mediaDir(): string {
  return path.join(dataDir(), 'media')
}

export interface SavedPortrait {
  src: string
  width: number
  height: number
}

export async function savePortrait(input: Buffer, slug: string): Promise<SavedPortrait> {
  const meta = await sharp(input).metadata()
  if (!meta.width || !meta.height) throw new Error('не удалось прочитать изображение')
  if (meta.width < 600 || meta.height < 750) {
    throw new Error(
      `снимок слишком мал: ${meta.width}×${meta.height}, нужно хотя бы 600×750 (лучше 1200×1500)`,
    )
  }

  const dir = mediaDir()
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  const out = path.join(dir, `${slug}.jpg`)

  await sharp(input)
    .rotate() // EXIF-ориентация: иначе портрет ляжет набок
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: sharp.strategy.attention })
    .modulate({ saturation: 0.94 })
    .linear(1.04, -(128 * 0.04))
    .jpeg({ quality: 82, progressive: true, mozjpeg: true })
    .toFile(out)

  // Без слеша на конце: `trailingSlash: true` не применяется к путям, последний
  // сегмент которых похож на файл, и адрес со слешом уехал бы в 308-редирект.
  return { src: `/api/foto/${slug}.jpg`, width: WIDTH, height: HEIGHT }
}

/** Есть ли уже загруженный портрет для слага. */
export function portraitExists(slug: string): boolean {
  return fs.existsSync(path.join(mediaDir(), `${slug}.jpg`))
}
