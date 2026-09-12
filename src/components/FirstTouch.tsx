'use client'

import { useEffect } from 'react'

/**
 * Первое касание для заявок (12.09.2026).
 *
 * Заявка 12.09 пришла, а откуда — узнать было нельзя: Метрика включается
 * только после согласия с cookie-баннером (две трети визитов невидимы), а
 * форма отправляла только имя, почту и сферу. Здесь при первом заходе
 * запоминаются адрес первой страницы (с utm) и реферер — в localStorage,
 * без cookie и без запросов наружу; читает их только форма заявки при
 * отправке, чтобы редактор видел в письме, откуда человек пришёл.
 */
export const FIRST_TOUCH_KEY = 'pt_first_touch'
const TTL_MS = 30 * 24 * 60 * 60 * 1000

export function FirstTouch() {
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FIRST_TOUCH_KEY)
      if (raw) {
        const prev = JSON.parse(raw) as { ts?: number }
        if (prev && typeof prev.ts === 'number' && Date.now() - prev.ts < TTL_MS) return
      }
      window.localStorage.setItem(
        FIRST_TOUCH_KEY,
        JSON.stringify({
          url: window.location.href.slice(0, 500),
          referrer: document.referrer.slice(0, 500),
          ts: Date.now(),
        }),
      )
    } catch {
      /* приватный режим или запрет хранилища — заявка уйдёт без источника */
    }
  }, [])
  return null
}
