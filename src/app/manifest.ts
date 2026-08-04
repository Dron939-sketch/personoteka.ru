import type { MetadataRoute } from 'next'

import { SITE } from '@/lib/site'

/**
 * Веб-манифест: имя и иконки для установки на домашний экран.
 *
 * `theme_color` — цвет бумаги из палитры (§7.2): именно им браузер красит
 * системную строку, и тёплый оттенок продолжает страницу, а не спорит с ней.
 * Иконки собираются скриптом `scripts/make-icons.ts` из одного исходника.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — ${SITE.tagline.toLowerCase()}`,
    short_name: SITE.name,
    description: SITE.promise,
    start_url: '/',
    display: 'standalone',
    lang: 'ru',
    background_color: '#fbfaf7',
    theme_color: '#fbfaf7',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      // Маскируемая — с полями, иначе Android срежет края под форму темы.
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
