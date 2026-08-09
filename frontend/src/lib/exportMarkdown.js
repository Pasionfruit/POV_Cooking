import { ingredientToText, totalTimeText } from './recipeUtils'

function recipeToMarkdown(recipe) {
  const lines = [`## ${recipe.title}`, '']

  const meta = [
    recipe.mealType,
    recipe.cuisine,
    totalTimeText(recipe),
    recipe.servings ? `Serves ${recipe.servings}` : null,
  ].filter(Boolean)
  if (meta.length) lines.push(`*${meta.join(' · ')}*`, '')

  if (recipe.description) lines.push(recipe.description, '')

  if (recipe.ingredients?.length) {
    lines.push('### Ingredients', '')
    recipe.ingredients.forEach((i) => lines.push(`- ${ingredientToText(i)}`))
    lines.push('')
  }

  if (recipe.steps?.length) {
    lines.push('### Steps', '')
    recipe.steps.forEach((step, i) => lines.push(`${i + 1}. ${step}`))
    lines.push('')
  }

  if (typeof recipe.notes === 'string' && recipe.notes) lines.push(`> ${recipe.notes}`, '')
  if (recipe.tags?.length) lines.push(`Tags: ${recipe.tags.map((t) => `\`${t}\``).join(', ')}`, '')
  if (recipe.sourceUrl) lines.push(`Source: <${recipe.sourceUrl}>`, '')

  return lines.join('\n')
}

// One Markdown document holding every saved recipe, newest export first.
export function savedRecipesToMarkdown(recipes, exportedAt = new Date()) {
  const header = [
    '# Saved Recipes',
    '',
    `*${recipes.length} recipe${recipes.length === 1 ? '' : 's'} exported from POV Cooking on ${exportedAt.toLocaleDateString()}.*`,
    '',
  ]
  if (recipes.length === 0) return `${header.join('\n')}Nothing saved yet.\n`
  return `${header.join('\n')}${recipes.map(recipeToMarkdown).join('\n---\n\n')}`
}

export function downloadMarkdown(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
