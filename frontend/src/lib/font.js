// Reading font, stored per device alongside the theme. The <html data-font>
// attribute is the single source of truth; styles.css swaps --font-family on it.
const KEY = 'pov_font'

export const FONTS = [
  { value: 'system', label: 'System', hint: 'Default interface font' },
  { value: 'serif', label: 'Serif', hint: 'Bookish, higher contrast' },
  { value: 'rounded', label: 'Rounded', hint: 'Soft, friendly sans' },
  { value: 'mono', label: 'Mono', hint: 'Fixed width, easy to scan' },
]

export function applyFont(font) {
  document.documentElement.dataset.font = font
}

export function getFont() {
  const stored = localStorage.getItem(KEY)
  return FONTS.some((f) => f.value === stored) ? stored : 'system'
}

export function initFont() {
  const font = getFont()
  applyFont(font)
  return font
}

export function setFont(font) {
  const next = FONTS.some((f) => f.value === font) ? font : 'system'
  localStorage.setItem(KEY, next)
  applyFont(next)
  return next
}
