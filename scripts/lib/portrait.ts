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
  /** Размер файла-исходника. */
  originalWidth: number
  originalHeight: number
  /** Что из него реально попало в кадр: при приближении меньше исходника. */
  sourceWidth: number
  sourceHeight: number
  upscaled: boolean
}

/**
 * Куда попадает лицо по вертикали в готовом кадре.
 *
 * 0.38 — чуть выше геометрического центра. При таком положении глаза
 * оказываются примерно на верхней трети, а под подбородком остаётся место
 * под плечи. Это правило третей в его портретном виде: сажать лицо ровно
 * в середину неправильно — кадр выглядит так, будто голову прижали к низу.
 */
const FACE_Y = 0.38

/** Насколько кадр можно увести от центра лица по горизонтали. */
const MAX_SHIFT = 0.5

/**
 * Находит область, которую sharp считает значимой. Для портрета это почти
 * всегда лицо: алгоритм ищет максимум «интересности» — контраст, детали,
 * глаза. Нам нужны не сами пиксели, а координаты — по ним строится кадр.
 */
async function findSubject(
  input: string | Buffer,
  width: number,
  height: number,
): Promise<{ x: number; y: number }> {
  // Пробный кадр квадратом: он не привязан к пропорции результата,
  // поэтому положение области не смещается заранее выбранной рамкой.
  const probe = Math.round(Math.min(width, height) * 0.6)
  const { info } = await sharp(input)
    .rotate()
    .resize(probe, probe, { fit: 'cover', position: sharp.strategy.attention })
    .toBuffer({ resolveWithObject: true })

  const left = (info as { cropOffsetLeft?: number }).cropOffsetLeft ?? 0
  const top = (info as { cropOffsetTop?: number }).cropOffsetTop ?? 0
  // cropOffset отрицательный: это сдвиг исходника относительно кадра.
  return { x: Math.abs(left) + probe / 2, y: Math.abs(top) + probe / 2 }
}

/**
 * Приближение кадра. 1 — самый большой прямоугольник 4:5, какой помещается
 * в исходник; 2 — вдвое меньший, то есть лицо вдвое крупнее.
 *
 * Нужно для съёмок в полный рост: там алгоритм честно находит человека,
 * но берёт его целиком, и в каталоге такая карточка выпадает из ряда —
 * у соседей крупный план, а тут фигура на общем плане. Значение задаёт
 * редактор в photo-sources.json, потому что «сколько тут лишнего воздуха»
 * машина не решает: это вопрос к тому, как снимок смотрится рядом с другими.
 */
const MAX_ZOOM = 3

export async function makePortrait(
  input: string | Buffer,
  slug: string,
  root: string,
  gravity?: string | number,
  zoom = 1,
): Promise<ProcessResult> {
  const meta = await sharp(input).rotate().metadata()
  if (!meta.width || !meta.height) throw new Error('не удалось прочитать размеры изображения')

  const mediaDir = path.join(root, 'public/media')
  fs.mkdirSync(mediaDir, { recursive: true })
  const outPath = path.join(mediaDir, `${slug}.jpg`)

  const pipeline = sharp(input).rotate() // EXIF-ориентация: иначе портрет ляжет набок
  // Что реально попадает в кадр: по этим размерам, а не по размерам файла,
  // видно, растянут ли портрет. При приближении вырезка меньше исходника.
  let takenW = meta.width
  let takenH = meta.height

  if (gravity !== undefined) {
    // Редактор указал сторону явно — автоматика не спорит.
    pipeline.resize(WIDTH, HEIGHT, { fit: 'cover', position: gravity })
  } else {
    const { width: w, height: h } = meta
    const k = Math.min(Math.max(zoom, 1), MAX_ZOOM)
    // Наибольший прямоугольник 4:5, помещающийся в исходник, — и он же, делённый
    // на приближение, если редактор просил взять лицо крупнее.
    const baseW = Math.min(w, Math.round((h * WIDTH) / HEIGHT))
    const baseH = Math.min(h, Math.round((w * HEIGHT) / WIDTH))
    const cropW = Math.round(baseW / k)
    const cropH = Math.round(baseH / k)

    const subject = await findSubject(input, w, h)

    // По горизонтали — центр по лицу, но не дальше половины кадра от него:
    // иначе на групповом снимке рамка уедет к соседу. Предел считается
    // от полного кадра, а не от приближенного: иначе зум сам себя запирает
    // у середины снимка и лицо сбоку в кадр уже не попадает.
    const wanted = subject.x - cropW / 2
    const centred = (w - cropW) / 2
    const limit = baseW * MAX_SHIFT
    const left = Math.round(
      Math.min(Math.max(wanted, centred - limit, 0), centred + limit, w - cropW),
    )
    // По вертикали — лицо на 38 % высоты кадра.
    const top = Math.round(Math.min(Math.max(subject.y - cropH * FACE_Y, 0), h - cropH))

    pipeline.extract({ left, top, width: cropW, height: cropH }).resize(WIDTH, HEIGHT)
    takenW = cropW
    takenH = cropH
  }

  await pipeline
    .modulate({ saturation: 0.94 }) // насыщенность −6 %
    .linear(1.04, -(128 * 0.04)) // контраст +4 %
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(outPath)

  return {
    outPath,
    originalWidth: meta.width,
    originalHeight: meta.height,
    sourceWidth: takenW,
    sourceHeight: takenH,
    upscaled: takenW < WIDTH || takenH < HEIGHT,
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
