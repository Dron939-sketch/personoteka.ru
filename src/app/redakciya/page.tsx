import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PageHeader } from '@/components/PageHeader'
import { getEditors, getPersons } from '@/lib/content'
import { personsCount } from '@/lib/format'
import { SITE } from '@/lib/site'

import styles from './page.module.css'

/**
 * Страницы авторов (§10.3, E-E-A-T). Для биографического портала это не косметика:
 * от наличия реальной редакции с именами напрямую зависит ранжирование.
 */

export const metadata: Metadata = {
  title: 'Редакция',
  description:
    'Кто готовит биографии «Персонотеки»: состав редакции, зоны ответственности, порядок фактчекинга.',
  alternates: { canonical: `${SITE.url}/redakciya/` },
}

export default function EditorialTeamPage() {
  const editors = getEditors()
  const persons = getPersons()

  return (
    <div className="container">
      <Breadcrumbs items={[{ label: 'Редакция' }]} />

      <PageHeader
        title="Редакция"
        lead="Биографии пишут и проверяют люди с именами. Под каждой страницей стоит подпись редактора и дата обновления."
      />

      <ul className={styles.list}>
        {editors.map((editor) => {
          const count = persons.filter((p) => p.editor === editor.slug).length
          return (
            <li key={editor.slug} className={styles.item}>
              <h2 className={styles.name}>{editor.name}</h2>
              <p className={`caption ${styles.role}`}>{editor.role}</p>
              {editor.bio && <p className={styles.bio}>{editor.bio}</p>}
              <p className={styles.count}>
                Подготовлено материалов: <span className="tabular">{count}</span>
              </p>
            </li>
          )
        })}
      </ul>

      <section className="section">
        <h2 className="ruled">Как мы проверяем факты</h2>
        <div className="prose">
          <p>
            Текст пишет один редактор, проверяет другой. Учёные степени, звания и статусы
            сверяются с открытыми реестрами; должности — с документами, которые
            предоставляет герой. То, что подтвердить нельзя, публикуется с пометкой «со
            слов героя» либо не публикуется вовсе.
          </p>
          <p>
            История правок сохраняется: видно, кто и что менял в биографии. Это нужно,
            когда возникает спор о содержании страницы.
          </p>
          <p>
            Правила отбора и основания для отказа описаны в{' '}
            <Link href="/redpolitika/">редакционной политике</Link>.
          </p>
        </div>
      </section>
    </div>
  )
}
