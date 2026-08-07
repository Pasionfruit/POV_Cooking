// Light/dark theme, stored per device. The <html data-theme> attribute is the
// single source of truth; styles.css swaps CSS variables on it.
const KEY = 'pov_theme'

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
}

export function initTheme() {
  const stored = localStorage.getItem(KEY)
  const theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  applyTheme(theme)
  return theme
}

export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  localStorage.setItem(KEY, next)
  applyTheme(next)
  return next
}
