import type { Photo } from '@/lib/types'

import styles from './PhotoCredit.module.css'

/**
 * Подпись о происхождении снимка.
 *
 * Права на фотографию принадлежат фотографу, а свободные лицензии семейства
 * Creative Commons прямо требуют указывать автора рядом с изображением —
 * поэтому подпись не украшение, а условие правомерного использования.
 */
export function PhotoCredit({ photo }: { photo?: Photo }) {
  if (!photo || (!photo.author && !photo.license)) return null

  const label = [photo.author, photo.license].filter(Boolean).join(' · ')

  return (
    <p className={styles.credit}>
      {photo.source_url ? (
        <a href={photo.source_url} rel="nofollow noopener" target="_blank">
          {label}
        </a>
      ) : (
        label
      )}
    </p>
  )
}
