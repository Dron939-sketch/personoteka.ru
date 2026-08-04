'use client'

import styles from './LkLogout.module.css'

export function LkLogout() {
  async function logout() {
    await fetch('/api/lk/vhod/', { method: 'DELETE' })
    window.location.href = '/lk/vhod/'
  }

  return (
    <button type="button" className={styles.button} onClick={logout}>
      Выйти
    </button>
  )
}
