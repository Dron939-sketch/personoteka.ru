import fs from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

import type { Person, Photo } from '../../src/lib/types'

/**
 * Общий конвейер обработки портрета — §7.5 ТЗ.
 * Используется и при ручной загрузке (`add-photo.ts`), и при автоматическом
 * скачивании по списку источников (`fetch-photos.ts`): правила кадрирования
 * и коррекции должны быть одни, иначе каталог перестанет выглядеть цельным.
 */

export const WIDTH = 1200
export const HEIGHT = 1500

export interface Rights {
  author?: string
  license: string
  source_url?: string
}

export interface ProcessResult {
  outPath: string
  sourceWidth: number
  sourceHeight: number
  upscaled: boolean
}

export async function makePortrait(
  input: string | Buffer,
  slug: string,
  root: string,
  gravity: string | number = sharp.strategy.attention,
): Promise<ProcessResult> {
  const meta = await sharp(input).metadata()
  if (!meta.width || !meta.height) throw new Error('не удалось прочитать размеры изображения')

  const mediaDir = path.join(root, 'public/media')
  fs.mkdirSync(mediaDir, { recursive: true })
  const outPath = path.join(mediaDir, `${slug}.jpg`)

  await sharp(input)
    .rotate() // EXIF-ориентация: иначе портрет может лечь набок
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: gravity })
    .modulate({ saturation: 0.94 }) // насыщенность −6 %
    .linear(1.04, -(128 * 0.04)) // контраст +4 %
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(outPath)

  return {
    outPath,
    sourceWidth: meta.width,
    sourceHeight: meta.height,
    upscaled: meta.width < WIDTH || meta.height < HEIGHT,
  }
}

/** Записывает портрет в карточку персоны первым — страница и PDF берут именно его. */
export function attachPortrait(
  personPath: string,
  slug: string,
  rights: Rights,
  caption?: string,
): Person {
  const person = JSON.parse(fs.readFileSync(personPath, 'utf8')) as Person

  const photo: Photo = {
    src: `/media/${slug}.jpg`,
    portrait: true,
    width: WIDTH,
    height: HEIGHT,
    alt: `Портрет: ${person.display_name}, ${person.tagline.toLowerCase()}`,
    ...(caption ? { caption } : {}),
    ...(rights.author ? { author: rights.author } : {}),
    license: rights.license,
    ...(rights.source_url ? { source_url: rights.source_url } : {}),
  }

  person.photos = [photo, ...(person.photos ?? []).filter((p) => !p.portrait)]
  person.updated_at = new Date().toISOString()

  fs.writeFileSync(personPath, `${JSON.stringify(person, null, 2)}\n`, 'utf8')
  return person
}

/**
 * Лицензии, при которых снимок можно публиковать без отдельного договора.
 * Всё остальное скрипт отклоняет: «нашлось в интернете» основанием не является,
 * а для портала, который продаёт размещение, чужой снимок — прямой риск.
 */
const FREE_LICENSE = /^(cc0|cc[ -]by([ -]sa)?([ -]\d(\.\d)?)?|public domain|pd-)/i

export function isFreeLicense(license: string): boolean {
  return FREE_LICENSE.test(license.trim())
}
