// Renders a week's meal plan as share-friendly plain text — for pasting into
// a text/chat message, not a file. See exportMarkdown.js for the Markdown
// (file-download) equivalent used on the Profile page.
export function mealPlanToText({ weekStart, weekEnd, dayNames, days, recipeById, dateForIndex }) {
  const lines = [`Meal Plan — ${weekStart} – ${weekEnd}`, '']

  dayNames.forEach((name, i) => {
    lines.push(`${name}, ${dateForIndex(i)}`)
    const entries = days[i] || []
    if (entries.length === 0) {
      lines.push('  – nothing planned')
    } else {
      entries.forEach((entry) => {
        const label = typeof entry === 'string' ? recipeById[entry]?.title || 'Removed recipe' : entry.text
        lines.push(`  • ${label}`)
      })
    }
    lines.push('')
  })

  return lines.join('\n').trim()
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  // Fallback for browsers/contexts without the async Clipboard API (e.g. no
  // secure context) — a hidden textarea plus the legacy execCommand copy.
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    if (!document.execCommand('copy')) throw new Error('Copy was blocked by the browser')
  } finally {
    textarea.remove()
  }
}
