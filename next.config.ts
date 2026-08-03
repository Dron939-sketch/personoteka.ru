import fs from 'node:fs'
import path from 'node:path'

import type { NextConfig } from 'next'

/**
 * Страницы персон статические (SSG) с ревалидацией по вебхуку из CMS — см. §9.1 ТЗ.
 * Пока источник контента — файлы в `content/`, ревалидация не нужна;
 * при переезде на headless CMS достаточно заменить слой `src/lib/content.ts`.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Все адреса из §4.1 записаны со слешом на конце (`/imya-familiya/`, `/katalog/`).
  // Без этого флага Next редиректит их на вариант без слеша, и канонический адрес
  // в разметке расходится с тем, что реально отдаёт сервер.
  trailingSlash: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    // §7.5: srcset на 4 ширины для портретов 4:5
    imageSizes: [240, 320, 480, 640],
    deviceSizes: [640, 768, 1024, 1280, 1440],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
  async redirects() {
    // 301 для изменённых слагов персон (§4.1: старый слаг остаётся навсегда и не отдаёт 404).
    // Реестр читается из файла, а не импортируется: конфиг Next компилируется отдельным
    // файлом, и относительный импорт из него не резолвится.
    const file = path.join(process.cwd(), 'content/redirects.json')
    const registry = JSON.parse(fs.readFileSync(file, 'utf8')) as { from: string; to: string }[]
    // Слеши на обоих концах: иначе к 301 добавляется ещё пара нормализующих
    // редиректов, и старый адрес приходит к новому цепочкой из трёх переходов.
    return registry.map((r) => ({
      source: `/${r.from}/`,
      destination: `/${r.to}/`,
      permanent: true,
    }))
  },
}

export default nextConfig
