import type { MetadataRoute } from 'next'

import { SITE } from '@/lib/site'

/**
 * robots.txt — §10.1.
 *
 * Закрыты: личный кабинет, админка, выдача поиска, служебные API.
 * Параметрические URL каталога закрыты по маске: первые два уровня фильтров
 * имеют собственные статические страницы (`/sfera/…/`), а всё, что глубже, —
 * тонкий контент, которому в индексе делать нечего (§8.3).
 *
 * Полезные краулеры (в том числе нейропоисков) разрешены намеренно — §10.4.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/lk/', '/admin/', '/poisk/', '/api/', '/katalog/?', '/*?*sort=', '/*?*vid='],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  }
}
