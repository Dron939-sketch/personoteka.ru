import fs from 'node:fs'
import path from 'node:path'

import { ImageResponse } from 'next/og'

import { getPerson, getPersons } from '@/lib/content'
import { SITE } from '@/lib/site'

/**
 * Картинка для соцсетей (§10.1): 1200×630, генерируется на лету —
 * имя, должность и логотип на бумажном фоне. Никаких фотографий: портрет
 * в OG обрезается непредсказуемо, а имя читается всегда.
 */

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Страница персоны в «Персонотеке»'

export function generateStaticParams() {
  return getPersons().map((person) => ({ slug: person.slug }))
}

const fontDir = path.join(process.cwd(), 'src/assets/fonts')

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const person = getPerson(slug)

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
          <div
            style={{
              fontFamily: 'Literata',
              fontSize: person && person.display_name.length > 22 ? 76 : 92,
              lineHeight: 1.05,
              color: '#14181E',
            }}
          >
            {person?.display_name ?? SITE.name}
          </div>
          <div style={{ marginTop: 24, fontSize: 34, color: '#3C444F' }}>
            {person?.tagline ?? SITE.promise}
          </div>
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
          <div>{person?.verified ? 'Проверено редакцией' : 'Биография'}</div>
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
