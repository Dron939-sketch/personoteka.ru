/**
 * Транслитерация по ГОСТ 7.79-2000 (система Б), упрощённая — §4.1 ТЗ:
 * ё→e, й→j, х→h, ц→c, ч→ch, ш→sh, щ→sch, ъ→«», ы→y, ь→«», э→e, ю→yu, я→ya.
 *
 * Используется для генерации слага персоны и поля `name_latin`.
 */

const MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'j',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

export function translit(input: string): string {
  let out = ''
  for (const char of input.toLowerCase()) {
    const mapped = MAP[char]
    out += mapped === undefined ? char : mapped
  }
  return out
}

/** Слаг персоны: «Андрей Мейстер» → `andrej-mejster`. */
export function slugify(input: string): string {
  return translit(input)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Латинское написание имени для `alternateName` и OG — с заглавных букв,
 * пробелы сохраняются: «Андрей Мейстер» → «Andrej Mejster».
 */
export function nameToLatin(input: string): string {
  return translit(input)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
