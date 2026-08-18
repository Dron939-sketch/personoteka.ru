/**
 * Сборка иконок сайта из одного исходника.
 *
 *   npx tsx scripts/make-icons.ts design/icon-source.png
 *
 * Исходник — квадратный PNG не меньше 512×512, лучше 1024×1024.
 * Скрипт режет из него весь набор:
 *
 *   src/app/icon.png          32×32   вкладка браузера
 *   src/app/apple-icon.png    180×180 экран «Домой» в iOS
 *   public/icon-192.png       192×192 манифест
 *   public/icon-512.png       512×512 манифест
 *   public/icon-maskable.png  512×512 маскируемая, с полями под обрезку Android
 *
 * Next подхватывает icon.png и apple-icon.png из app/ автоматически и сам
 * проставляет ссылки в <head> — руками ничего прописывать не нужно.
 *
 * Маскируемая версия делается с полями: Android обрезает иконку под форму темы
 * (круг, капля, скруглённый квадрат), и без запаса по краям срезается рисунок.
 * Безопасная зона по спецификации — центральные 80 % ширины.
 */
import fs from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

/** Графит из палитры — подложка для маскируемой иконки (§7.2, --ink). */
const BACKGROUND = { r: 0x14, g: 0x18, b: 0x1e, alpha: 1 }

/**
 * Размеры внутри favicon.ico. Шестнадцать — вкладка браузера и выдача
 * поисковика, тридцать два — панель закладок и экран с высокой плотностью,
 * сорок восемь — ярлык на рабочем столе Windows.
 */
const ICO_SIZES = [16, 32, 48]

/**
 * Сборка ICO из готовых PNG.
 *
 * Формат старый и простой: шапка на шесть байт, потом по шестнадцать байт
 * описания на каждый размер, потом сами картинки подряд. Внутрь можно класть
 * либо BMP, либо PNG — второе понимают все браузеры начиная с Vista и все
 * поисковые роботы, а весит оно втрое меньше.
 *
 * Отдельная тонкость: размер стороны записан одним байтом, поэтому 256
 * обозначается нулём. Нам это не нужно — больше 48 в ICO класть незачем, —
 * но правило соблюдаем, чтобы файл не оказался битым, если размеры поменяют.
 */
function buildIco(images: Buffer[], sizes: number[]): Buffer {
  const HEADER = 6
  const ENTRY = 16
  const header = Buffer.alloc(HEADER)
  header.writeUInt16LE(0, 0) // зарезервировано
  header.writeUInt16LE(1, 2) // тип: 1 — иконка
  header.writeUInt16LE(images.length, 4)

  const entries = Buffer.alloc(ENTRY * images.length)
  let offset = HEADER + ENTRY * images.length
  images.forEach((png, i) => {
    const at = i * ENTRY
    entries.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], at)
    entries.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], at + 1)
    entries.writeUInt8(0, at + 2) // палитра не используется
    entries.writeUInt8(0, at + 3) // зарезервировано
    entries.writeUInt16LE(1, at + 4) // цветовых плоскостей
    entries.writeUInt16LE(32, at + 6) // бит на пиксель
    entries.writeUInt32LE(png.length, at + 8)
    entries.writeUInt32LE(offset, at + 12)
    offset += png.length
  })

  return Buffer.concat([header, entries, ...images])
}

const TARGETS = [
  { file: 'src/app/icon.png', size: 32 },
  { file: 'src/app/apple-icon.png', size: 180 },
  { file: 'public/icon-192.png', size: 192 },
  { file: 'public/icon-512.png', size: 512 },
]

async function main() {
  const source = process.argv[2] ?? 'design/icon-source.png'
  const root = process.cwd()
  const srcPath = path.resolve(root, source)

  if (!fs.existsSync(srcPath)) {
    console.error(`Исходник не найден: ${source}`)
    console.error('Положите квадратный PNG (лучше 1024×1024) и укажите путь к нему.')
    process.exit(1)
  }

  const meta = await sharp(srcPath).metadata()
  if (!meta.width || !meta.height) {
    console.error('Не удалось прочитать размеры изображения')
    process.exit(1)
  }
  if (meta.width !== meta.height) {
    console.warn(
      `  внимание: исходник ${meta.width}×${meta.height} не квадратный — ` +
        'края будут обрезаны по центру',
    )
  }
  if (meta.width < 512) {
    console.warn(`  внимание: исходник ${meta.width} px, для 512×512 его придётся растягивать`)
  }

  for (const target of TARGETS) {
    const out = path.join(root, target.file)
    fs.mkdirSync(path.dirname(out), { recursive: true })
    await sharp(srcPath)
      .resize(target.size, target.size, { fit: 'cover', position: 'centre' })
      .png({ compressionLevel: 9 })
      .toFile(out)
    console.log(`  ${target.file} — ${target.size}×${target.size}`)
  }

  // Маскируемая: рисунок ужимается до 80 % и ставится на сплошную подложку,
  // чтобы обрезка под форму темы Android не съела края.
  const maskable = path.join(root, 'public/icon-maskable.png')
  const inner = await sharp(srcPath)
    .resize(410, 410, { fit: 'cover', position: 'centre' })
    .toBuffer()
  await sharp({ create: { width: 512, height: 512, channels: 4, background: BACKGROUND } })
    .composite([{ input: inner, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile(maskable)
  console.log('  public/icon-maskable.png — 512×512, безопасная зона 80 %')

  // Классический favicon.ico. Next сам его не делает, а он нужен: поисковые
  // роботы — в том числе яндексовский, который рисует иконку в выдаче, —
  // запрашивают `/favicon.ico` напрямую, не читая <link rel="icon"> в разметке.
  // Пока файла не было, сайт в выдаче стоял с пустым серым значком.
  const favicon = path.join(root, 'src/app/favicon.ico')
  await sharp(srcPath).metadata()
  // ensureAlpha и palette: false — не украшательство. sharp по умолчанию
  // выбрасывает пустой альфа-канал и переводит мелкие картинки в палитру,
  // а сборщик Next разбирает ICO строго и отказывается от всего, что внутри
  // не восьмибитная RGBA: «The PNG is not in RGBA format».
  const pngs = await Promise.all(
    ICO_SIZES.map((size) =>
      sharp(srcPath)
        .resize(size, size, { fit: 'cover', position: 'centre' })
        .ensureAlpha()
        .png({ compressionLevel: 9, palette: false })
        .toBuffer(),
    ),
  )
  fs.writeFileSync(favicon, buildIco(pngs, ICO_SIZES))
  console.log(`  src/app/favicon.ico — ${ICO_SIZES.join(', ')} px в одном файле`)

  console.log('\nГотово. Ссылки в <head> Next проставит сам.')
}

void main()
