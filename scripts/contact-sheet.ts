/**
 * Контактный лист из портретов: собирает несколько снимков в одну картинку,
 * чтобы просмотреть их рядом. Рядом друг с другом сразу видно и чужое лицо,
 * и кадр, выпавший из ряда, — на одиночных превью это ловится хуже.
 *
 *   npx tsx scripts/contact-sheet.ts out.jpg slug1 slug2 …
 */
import path from 'node:path'
import sharp from 'sharp'

const CELL_W = 240
const CELL_H = 300
const COLS = 5

async function main() {
  const [out, ...slugs] = process.argv.slice(2)
  if (!out || slugs.length === 0) {
    console.error('usage: contact-sheet.ts <out.jpg> <slug> [slug…]')
    process.exit(1)
  }

  const root = process.cwd()
  const rows = Math.ceil(slugs.length / COLS)

  const cells = await Promise.all(
    slugs.map(async (slug, i) => ({
      input: await sharp(path.join(root, 'public/media', `${slug}.jpg`))
        .resize(CELL_W, CELL_H, { fit: 'cover' })
        .toBuffer(),
      left: (i % COLS) * CELL_W,
      top: Math.floor(i / COLS) * CELL_H,
    })),
  )

  await sharp({
    create: {
      width: COLS * CELL_W,
      height: rows * CELL_H,
      channels: 3,
      background: { r: 20, g: 20, b: 20 },
    },
  })
    .composite(cells)
    .jpeg({ quality: 88 })
    .toFile(path.resolve(root, out))

  console.log(`${out}: ${slugs.length} портретов`)
}

main()
