import fs from 'node:fs'
import path from 'node:path'

import { ImageResponse } from 'next/og'

import { SITE } from '@/lib/site'

/**
 * Картинка для соцсетей по умолчанию (§10.1).
 *
 * У страниц персон есть своя — с именем и должностью (`[slug]/opengraph-image`).
 * Эта нужна всему остальному: главной, каталогу, рубрикам, городам, служебным
 * страницам. Без неё ссылка на любую из них разворачивалась в мессенджере
 * голым текстом без превью, а таких страниц на сайте больше сотни.
 *
 * Next берёт ближайшую картинку вверх по дереву сегментов, поэтому один файл
 * в корне закрывает все страницы разом, а страницы персон продолжают
 * использовать свою.
 */

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = `${SITE.name} — ${SITE.tagline.toLowerCase()}`

const fontDir = path.join(process.cwd(), 'src/assets/fonts')

export default async function OpengraphImage() {
  const literata = fs.readFileSync(path.join(fontDir, 'Literata-SemiBold.ttf'))
  const inter = fs.readFileSync(path.join(fontDir, 'Inter-Regular.ttf'))

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#FBFAF7',
          fontFamily: 'Inter',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 4, background: '#B8862B' }} />
          <div style={{ fontSize: 26, color: '#6B7480', letterSpacing: 2 }}>
            {SITE.name.toUpperCase()}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'Literata', fontSize: 92, lineHeight: 1.05, color: '#14181E' }}>
            {SITE.tagline}
          </div>
          <div style={{ marginTop: 24, fontSize: 34, color: '#3C444F' }}>{SITE.promise}</div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 28,
            borderTop: '1px solid #E2DED6',
            fontSize: 24,
            color: '#6B7480',
          }}
        >
          <div>personoteka.ru</div>
          <div>Биографический справочник</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Literata', data: literata, style: 'normal', weight: 600 },
        { name: 'Inter', data: inter, style: 'normal', weight: 400 },
      ],
    },
  )
}
