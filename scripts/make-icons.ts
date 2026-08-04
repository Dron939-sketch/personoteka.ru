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

  console.log('\nГотово. Ссылки в <head> Next проставит сам.')
}

void main()
