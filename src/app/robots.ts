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

/** Служебные разделы: не для читателя, не для робота, не для модели. */
const DISALLOW = ['/lk/', '/admin/', '/poisk/', '/api/', '/katalog/?', '/*?*sort=', '/*?*vid=']

/**
 * Роботы ИИ-систем — перечислены поимённо и разрешены явно.
 *
 * Зачем отдельные правила, если `User-agent: *` и так разрешает всё. Часть этих
 * роботов трактует умолчание не в пользу сайта: `Google-Extended` и
 * `Applebot-Extended` описаны как согласие владельца на использование материалов
 * в обучении и ответах ассистентов, и издатели обычно перечисляют их явно, чтобы
 * снять двусмысленность. Плюс операторы читают файл роботом, а конфликты правил
 * («*» разрешает, именованный агент не упомянут) разные краулеры разбирают
 * по-разному.
 *
 * Ответ ассистента со ссылкой на источник — это трафик и узнаваемость, а закрыть
 * доступ означает, что модель перескажет ту же биографию по чужой перепечатке
 * и сошлётся на неё. Условие использования — атрибуция — изложено
 * на /ispolzovanie-ii/ и продублировано в llms.txt.
 */
const AI_AGENTS = [
  // OpenAI: обучение, поисковый индекс SearchGPT, переходы по ссылке в диалоге
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  // Anthropic
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  // Google и Apple: согласие на использование в Gemini и Apple Intelligence
  'Google-Extended',
  'Applebot-Extended',
  // Яндекс: отдельный агент для нейросетевых сервисов
  'YandexAdditional',
  'YandexAdditionalBot',
  // Остальные нейропоиски и ассистенты
  'PerplexityBot',
  'Perplexity-User',
  'DuckAssistBot',
  'MistralAI-User',
  'meta-externalagent',
  'Amazonbot',
  'Bytespider',
  'CCBot',
  'cohere-ai',
  'Diffbot',
  'Timpibot',
  'AI2Bot',
  'omgili',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      { userAgent: AI_AGENTS, allow: '/', disallow: DISALLOW },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  }
}
