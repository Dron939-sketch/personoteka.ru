import Link from 'next/link'

import { SearchBar } from '@/components/SearchBar'

/**
 * 404. Для портала, где адрес персоны — это её имя, самая частая причина попадания
 * сюда — опечатка в имени. Поэтому на странице сразу поиск, а не извинения.
 */
export default function NotFound() {
  return (
    <div className="container" style={{ paddingBlock: 'var(--sp-24)', maxWidth: '34rem' }}>
      <p className="caption">Ошибка 404</p>
      <h1>Такой страницы нет</h1>
      <p className="lead">
        Возможно, в адресе опечатка или биография ещё не опубликована. Попробуйте найти
        человека по имени.
      </p>
      <div style={{ marginBlock: 'var(--sp-6)' }}>
        <SearchBar />
      </div>
      <p style={{ fontSize: 'var(--small)' }}>
        <Link href="/katalog/">Каталог персон</Link> ·{' '}
        <Link href="/rejting/">Индекс внимания</Link> ·{' '}
        <Link href="/razmestit/">Разместить биографию</Link>
      </p>
    </div>
  )
}
