/**
 * Применяет сохранённую тему до первой отрисовки — иначе при выбранной тёмной теме
 * страница успевает мигнуть светлой. Скрипт крошечный и синхронный намеренно.
 *
 * Инлайн-скрипт разрешён через nonce в CSP (§9.4); в Next он проставляется автоматически,
 * когда middleware отдаёт заголовок Content-Security-Policy с nonce.
 */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('personoteka-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})()`
  return <script dangerouslySetInnerHTML={{ __html: code }} />
}
