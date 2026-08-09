// Pull a recipe out of a web page so an admin can review it before saving.
//
// Most recipe sites publish schema.org Recipe data as JSON-LD, which is what we
// read. When a page has none, we fall back to Open Graph tags and return
// warnings so the admin knows what still needs filling in.

// Block loopback/link-local/private ranges: this endpoint fetches URLs on behalf
// of an admin, and should not be usable to probe the host's own network.
const BLOCKED_HOST_RE =
  /^(localhost$|127\.|0\.0\.0\.0|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|.*\.local$|.*\.internal$)/i

function assertFetchableUrl(raw) {
  let url
  try {
    url = new URL(String(raw).trim())
  } catch {
    throw new Error('That does not look like a valid link')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https links can be imported')
  }
  if (BLOCKED_HOST_RE.test(url.hostname)) {
    throw new Error('That address is not allowed')
  }
  return url
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'" }

function decodeEntities(text) {
  return String(text).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code) => {
    const key = code.toLowerCase()
    if (ENTITIES[key]) return ENTITIES[key]
    if (key.startsWith('#x')) return String.fromCodePoint(parseInt(key.slice(2), 16))
    if (key.startsWith('#')) return String.fromCodePoint(parseInt(key.slice(1), 10))
    return match
  })
}

function clean(value) {
  return decodeEntities(String(value ?? '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

// "PT1H30M" -> 90
function isoDurationToMinutes(value) {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/.exec(String(value || '').trim())
  if (!match) return null
  const total = Number(match[1] || 0) * 1440 + Number(match[2] || 0) * 60 + Number(match[3] || 0)
  return total || null
}

function firstString(value) {
  if (!value) return null
  if (typeof value === 'string') return clean(value)
  if (Array.isArray(value)) return firstString(value.find(Boolean))
  if (typeof value === 'object') return firstString(value.url || value.name || value['@id'])
  return null
}

// Ingredient lists: split only on newlines, since commas carry meaning inside a
// line ("4 cloves garlic, minced").
function toList(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.flatMap(toList)
  if (typeof value === 'string') {
    return value
      .split(/\r?\n/)
      .map(clean)
      .filter(Boolean)
  }
  return [clean(value)].filter(Boolean)
}

// Keywords are conventionally one comma-separated string.
function toKeywords(value) {
  return toList(value)
    .flatMap((entry) => entry.split(','))
    .map(clean)
    .filter(Boolean)
}

function extractInstructions(value) {
  if (!value) return []
  if (typeof value === 'string') {
    return clean(value)
      .split(/(?:\r?\n)+|(?<=[.!?])\s+(?=[A-Z])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2)
  }
  if (Array.isArray(value)) return value.flatMap(extractInstructions)
  if (typeof value === 'object') {
    if (value.itemListElement) return extractInstructions(value.itemListElement)
    if (value.text) return [clean(value.text)].filter(Boolean)
    if (value.name) return [clean(value.name)].filter(Boolean)
  }
  return []
}

function typesOf(node) {
  const type = node?.['@type']
  return (Array.isArray(type) ? type : [type]).filter(Boolean).map((t) => String(t).toLowerCase())
}

// JSON-LD can be a bare object, an array, or wrapped in @graph — walk it all.
function findRecipeNode(node, depth = 0) {
  if (!node || depth > 6) return null
  if (Array.isArray(node)) {
    for (const entry of node) {
      const found = findRecipeNode(entry, depth + 1)
      if (found) return found
    }
    return null
  }
  if (typeof node !== 'object') return null
  if (typesOf(node).includes('recipe')) return node
  if (node['@graph']) return findRecipeNode(node['@graph'], depth + 1)
  return null
}

function collectJsonLd(html) {
  const blocks = []
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = re.exec(html))) {
    try {
      blocks.push(JSON.parse(match[1].trim().replace(/^﻿/, '')))
    } catch {
      // A malformed block on the page shouldn't abort the import.
    }
  }
  return blocks
}

function metaContent(html, property) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']|` +
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
    'i'
  )
  const match = re.exec(html)
  return match ? clean(match[1] || match[2]) : null
}

// Authors are often {name, url}; we want the name, not the profile link.
function authorName(value) {
  if (!value) return null
  if (typeof value === 'string') return clean(value)
  if (Array.isArray(value)) return authorName(value.find(Boolean))
  if (typeof value === 'object' && value.name) return clean(value.name)
  return null
}

function parseServings(value) {
  const text = firstString(value)
  if (!text) return null
  const match = /\d+/.exec(text)
  return match ? Number(match[0]) : null
}

// Exported separately from the fetch so it can be tested without a network call.
function parseRecipeHtml(html, sourceUrl) {
  const warnings = []
  const node = collectJsonLd(html).map(findRecipeNode).find(Boolean)

  if (!node) {
    const title = metaContent(html, 'og:title') || clean(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || '')
    if (!title) throw new Error('No recipe data found on that page — try pasting the recipe in by hand')
    warnings.push('This page has no structured recipe data, so only the title, description, and image were found.')
    warnings.push('Add the ingredients and steps before saving.')
    return {
      recipe: {
        title,
        description: metaContent(html, 'og:description') || '',
        image: metaContent(html, 'og:image') || null,
        ingredients: [],
        steps: [],
        source: { name: new URL(sourceUrl).hostname.replace(/^www\./, ''), url: sourceUrl },
      },
      warnings,
    }
  }

  const ingredients = toList(node.recipeIngredient || node.ingredients)
  const steps = extractInstructions(node.recipeInstructions)
  const prep = isoDurationToMinutes(node.prepTime)
  const cook = isoDurationToMinutes(node.cookTime)
  const total = isoDurationToMinutes(node.totalTime)
  // Sites often publish several categories in one string ("Dinner, Main course").
  // The first becomes the meal type; all of them become tags.
  const categories = toKeywords(node.recipeCategory)
  const category = categories[0] || null
  const tags = [...new Set([...toKeywords(node.keywords), ...categories].map((t) => t.toLowerCase()))]

  if (!ingredients.length) warnings.push('No ingredients were found — add them before saving.')
  if (!steps.length) warnings.push('No steps were found — add them before saving.')
  if (!prep && !cook && !total) warnings.push('No timings were found — fill in prep and cook time if you want them.')

  return {
    recipe: {
      title: firstString(node.name) || 'Untitled recipe',
      description: clean(node.description || ''),
      image: firstString(node.image),
      servings: parseServings(node.recipeYield),
      prepTimeMinutes: prep,
      // Sites often publish only totalTime; treat the remainder as cook time.
      cookTimeMinutes: cook || (total && prep ? Math.max(total - prep, 0) : total),
      cuisine: firstString(node.recipeCuisine),
      mealType: category,
      tags: tags.slice(0, 12),
      ingredients,
      steps,
      source: {
        name: authorName(node.author) || new URL(sourceUrl).hostname.replace(/^www\./, ''),
        url: firstString(node.url) || sourceUrl,
      },
    },
    warnings,
  }
}

async function fetchRecipeFromUrl(rawUrl) {
  const url = assertFetchableUrl(rawUrl)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  let response
  try {
    response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // Some sites serve a stub page to unknown agents.
        'User-Agent': 'Mozilla/5.0 (compatible; POVCooking/1.0; recipe import)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
  } catch (err) {
    throw new Error(err.name === 'AbortError' ? 'That page took too long to respond' : 'Could not reach that link')
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) throw new Error(`That page returned an error (${response.status})`)
  const finalUrl = response.url || url.toString()
  assertFetchableUrl(finalUrl)

  const html = await response.text()
  const parsed = parseRecipeHtml(html, finalUrl)
  return { ...parsed, sourceUrl: finalUrl }
}

module.exports = { fetchRecipeFromUrl, parseRecipeHtml, assertFetchableUrl, isoDurationToMinutes }
