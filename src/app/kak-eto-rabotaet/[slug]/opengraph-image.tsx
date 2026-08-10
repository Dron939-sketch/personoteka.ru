import fs from 'node:fs'
import path from 'node:path'

import { ImageResponse } from 'next/og'

import { getArticle, getArticles } from '@/lib/content'
import { SITE } from '@/lib/site'

/**
 * Картинка для соцсетей у разборов раздела «Как это работает».
 *
 * Своя нужна по двум причинам. Первая: у статьи в `generateMetadata` задан
 * явный блок `openGraph`, и он перекрывает картинку, унаследованную от корня, —
 * до этого все восемь разборов расходились по мессенджерам без превью вообще.
 * Вторая: разборы и есть то, чем делятся, поэтому на превью должен стоять
 * заголовок статьи, а не общий слоган портала.
 *
 * Кегль подбирается по длине: «Прецедент: как сделать, чтобы вас начали искать»
 * вдвое длиннее «Как делают звёзд» и в один размер с ним не помещается.
 */

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Разбор в «Персонотеке»'

export function generateStaticParams() {
  return getArticles('guide').map((article) => ({ slug: article.slug }))
}

const fontDir = path.join(process.cwd(), 'src/assets/fonts')

function titleSize(length: number): number {
  if (length > 52) return 62
  if (length > 34) return 74
  return 88
}

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticle(slug)

  const literata = fs.readFileSync(path.join(fontDir, 'Literata-SemiBold.ttf'))
  const inter = fs.readFileSync(path.join(fontDir, 'Inter-Regular.ttf'))
  const title = article?.title ?? SITE.name

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

        <div
          style={{
            fontFamily: 'Literata',
            fontSize: titleSize(title.length),
            lineHeight: 1.1,
            color: '#14181E',
          }}
        >
          {title}
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
          <div>Как это работает</div>
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
