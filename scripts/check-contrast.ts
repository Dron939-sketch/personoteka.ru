/**
 * Автотест контрастов — критерий приёмки §15:
 * «Контраст всех текстовых пар ≥ 4.5:1 в обеих темах (отчёт автотеста)».
 *
 *   npm run check:contrast
 *
 * Значения читаются из src/styles/tokens.css, а не дублируются здесь: иначе тест
 * проверял бы собственную копию палитры, а не ту, что уходит в браузер.
 */
import fs from 'node:fs'
import path from 'node:path'

const cssPath = path.join(process.cwd(), 'src/styles/tokens.css')
const css = fs.readFileSync(cssPath, 'utf8')

/** Токены светлой темы — из блока `:root`, тёмной — из `[data-theme='dark']`. */
function parseBlock(selector: string): Record<string, string> {
  const start = css.indexOf(selector)
  if (start === -1) throw new Error(`Не найден блок ${selector} в tokens.css`)
  const open = css.indexOf('{', start)
  const close = css.indexOf('}', open)
  const body = css.slice(open + 1, close)

  const tokens: Record<string, string> = {}
  for (const match of body.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    tokens[match[1]] = match[2]
  }
  return tokens
}

const light = parseBlock(':root')
const dark = { ...light, ...parseBlock("[data-theme='dark']") }

function srgbToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value.slice(0, 6)
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

interface Pair {
  fg: string
  bg: string
  purpose: string
  /** Минимум по WCAG: 4.5 для основного текста, 3 — для крупного и нетекстовых элементов. */
  min: number
}

/**
 * Пары из §7.2. `--accent-500` проверяется по порогу 3:1 сознательно:
 * дизайн-система разрешает его только как декор и запрещает текстом.
 */
const PAIRS: Pair[] = [
  { fg: '--ink', bg: '--paper', purpose: 'основной текст', min: 4.5 },
  { fg: '--ink-2', bg: '--paper', purpose: 'лид, вторичный текст', min: 4.5 },
  { fg: '--ink-3', bg: '--paper', purpose: 'метаданные, подписи', min: 4.5 },
  { fg: '--ink', bg: '--surface', purpose: 'текст на карточке', min: 4.5 },
  { fg: '--ink-2', bg: '--surface', purpose: 'вторичный текст на карточке', min: 4.5 },
  { fg: '--ink-3', bg: '--surface', purpose: 'подписи на карточке', min: 4.5 },
  { fg: '--ink', bg: '--surface-alt', purpose: 'текст в чередующейся секции', min: 4.5 },
  { fg: '--ink-3', bg: '--surface-alt', purpose: 'подписи в чередующейся секции', min: 4.5 },
  { fg: '--accent-700', bg: '--paper', purpose: 'ссылки в тексте', min: 4.5 },
  { fg: '--accent-700', bg: '--surface', purpose: 'ссылки на карточке', min: 4.5 },
  { fg: '--cool-600', bg: '--paper', purpose: 'служебные ссылки, фокус', min: 4.5 },
  { fg: '--success', bg: '--paper', purpose: 'значок «Проверено»', min: 4.5 },
  { fg: '--success', bg: '--surface', purpose: 'значок «Проверено» на карточке', min: 4.5 },
  { fg: '--success', bg: '--surface-alt', purpose: 'значок «Проверено» в секции', min: 4.5 },
  { fg: '--danger', bg: '--paper', purpose: 'ошибки форм', min: 4.5 },
  { fg: '--danger', bg: '--surface', purpose: 'ошибки форм на карточке', min: 4.5 },
  { fg: '--warning', bg: '--paper', purpose: 'предупреждения', min: 4.5 },
  { fg: '--warning', bg: '--surface-alt', purpose: 'предупреждения в секции', min: 4.5 },
  { fg: '--accent-700', bg: '--surface-alt', purpose: 'ссылки в подвале', min: 4.5 },
  { fg: '--accent-700', bg: '--accent-100', purpose: 'ссылки на латунной подложке', min: 4.5 },
  { fg: '--ink', bg: '--accent-100', purpose: 'текст на латунной подложке', min: 4.5 },
  { fg: '--ink-2', bg: '--accent-100', purpose: 'описание в CTA', min: 4.5 },
  { fg: '--accent-500', bg: '--paper', purpose: 'декоративная линейка (не текст)', min: 3 },
  { fg: '--line-strong', bg: '--paper', purpose: 'границы контролов', min: 1.5 },
]

/** Кнопки: белый текст на латуни в светлой теме, графитовый — в тёмной. */
const BUTTON_TEXT = { light: '#FFFFFF', dark: '#14181E' }

let failures = 0

function check(theme: 'light' | 'dark', tokens: Record<string, string>) {
  console.log(`\n${theme === 'light' ? 'Светлая тема' : 'Тёмная тема'}`)
  console.log('-'.repeat(78))

  for (const pair of PAIRS) {
    const fg = tokens[pair.fg]
    const bg = tokens[pair.bg]
    if (!fg || !bg) {
      console.error(`  ОШИБКА  нет токена ${!fg ? pair.fg : pair.bg}`)
      failures += 1
      continue
    }
    const ratio = contrast(fg, bg)
    const ok = ratio >= pair.min
    if (!ok) failures += 1
    console.log(
      `  ${ok ? ' ok ' : 'ПЛОХО'}  ${ratio.toFixed(2).padStart(6)}:1  (мин. ${pair.min})  ` +
        `${pair.fg} на ${pair.bg} — ${pair.purpose}`,
    )
  }

  const buttonBg = tokens['--accent-600']
  const buttonFg = BUTTON_TEXT[theme]
  const buttonRatio = contrast(buttonFg, buttonBg)
  const buttonOk = buttonRatio >= 4.5
  if (!buttonOk) failures += 1
  console.log(
    `  ${buttonOk ? ' ok ' : 'ПЛОХО'}  ${buttonRatio.toFixed(2).padStart(6)}:1  (мин. 4.5)  ` +
      `${buttonFg} на --accent-600 — текст первичной кнопки`,
  )
}

check('light', light)
check('dark', dark)

console.log(
  `\nИтог: ${failures === 0 ? 'все пары проходят WCAG' : `не проходят пар: ${failures}`}.`,
)

if (failures > 0) process.exit(1)
