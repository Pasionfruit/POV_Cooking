// US <-> metric display for recipe text. Recipes are stored as written ("2 cups flour", "450 g beef",
// "bake at 350°F"); this converts only what is in the OTHER system than the one the reader chose, so the
// numbers a recipe was written with are never rounded when they already match. Teaspoons and tablespoons
// are used in both systems and are left alone.
//
//   convertUnits('2 cups flour', 'metric')            -> '480 ml flour'
//   convertUnits('1 lb beef', 'metric')               -> '450 g beef'
//   convertUnits('450 g beef', 'us')                  -> '1 lb beef'
//   convertUnits('Bake at 350°F', 'metric')           -> 'Bake at 175°C'
//   convertUnits('1 cup (240 ml) milk', 'metric')     -> '240 ml milk'   (a line that gives both keeps one)

export const UNIT_SYSTEMS = ['us', 'metric']

const FRACTIONS = { '½': ' 1/2', '¼': ' 1/4', '¾': ' 3/4', '⅓': ' 1/3', '⅔': ' 2/3', '⅛': ' 1/8', '⅜': ' 3/8', '⅝': ' 5/8', '⅞': ' 7/8' }
const CUP_ML = 240

// unit spellings -> [canonical unit, kind, size in ml / g / cm, system]
const UNIT_TABLE = {
  tsp: ['tsp', 'volume', 5, 'both'],
  tsps: ['tsp', 'volume', 5, 'both'],
  teaspoon: ['tsp', 'volume', 5, 'both'],
  teaspoons: ['tsp', 'volume', 5, 'both'],
  tbsp: ['tbsp', 'volume', 15, 'both'],
  tbsps: ['tbsp', 'volume', 15, 'both'],
  tablespoon: ['tbsp', 'volume', 15, 'both'],
  tablespoons: ['tbsp', 'volume', 15, 'both'],
  cup: ['cup', 'volume', CUP_ML, 'us'],
  cups: ['cup', 'volume', CUP_ML, 'us'],
  'fl oz': ['fl oz', 'volume', 30, 'us'],
  'fluid ounce': ['fl oz', 'volume', 30, 'us'],
  'fluid ounces': ['fl oz', 'volume', 30, 'us'],
  oz: ['oz', 'weight', 28.3495, 'us'],
  ounce: ['oz', 'weight', 28.3495, 'us'],
  ounces: ['oz', 'weight', 28.3495, 'us'],
  lb: ['lb', 'weight', 453.592, 'us'],
  lbs: ['lb', 'weight', 453.592, 'us'],
  pound: ['lb', 'weight', 453.592, 'us'],
  pounds: ['lb', 'weight', 453.592, 'us'],
  inch: ['in', 'length', 2.54, 'us'],
  inches: ['in', 'length', 2.54, 'us'],
  g: ['g', 'weight', 1, 'metric'],
  gram: ['g', 'weight', 1, 'metric'],
  grams: ['g', 'weight', 1, 'metric'],
  kg: ['kg', 'weight', 1000, 'metric'],
  kilogram: ['kg', 'weight', 1000, 'metric'],
  kilograms: ['kg', 'weight', 1000, 'metric'],
  ml: ['ml', 'volume', 1, 'metric'],
  milliliter: ['ml', 'volume', 1, 'metric'],
  milliliters: ['ml', 'volume', 1, 'metric'],
  millilitre: ['ml', 'volume', 1, 'metric'],
  millilitres: ['ml', 'volume', 1, 'metric'],
  l: ['l', 'volume', 1000, 'metric'],
  liter: ['l', 'volume', 1000, 'metric'],
  liters: ['l', 'volume', 1000, 'metric'],
  litre: ['l', 'volume', 1000, 'metric'],
  litres: ['l', 'volume', 1000, 'metric'],
  cm: ['cm', 'length', 1, 'metric'],
  centimeter: ['cm', 'length', 1, 'metric'],
  centimeters: ['cm', 'length', 1, 'metric'],
  centimetre: ['cm', 'length', 1, 'metric'],
  centimetres: ['cm', 'length', 1, 'metric'],
}

const NUMBER = '\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?'
const UNIT_WORDS = Object.keys(UNIT_TABLE)
  .sort((a, b) => b.length - a.length)
  .map((u) => u.replace(' ', '\\s+'))
  .join('|')
// 1 cup / 1/2 cup / 1 1/2 cups / 2-3 cups / 1-inch / 1 inch
const QUANTITY = new RegExp(`(?<![\\w/.])(${NUMBER})(?:\\s*-?\\s*(?:to|[-–])\\s*(${NUMBER}))?(?:\\s*-\\s*|\\s*)(${UNIT_WORDS})\\b(?![-\\w])`, 'gi')
// "1 cup (240 ml)" - both systems on one line
const DUAL = new RegExp(`(${QUANTITY.source})\\s*\\(\\s*(?:about\\s+|approx\\.?\\s+|around\\s+)?(${QUANTITY.source})\\s*\\)`, 'gi')

function parseNumber(text) {
  let t = String(text).trim()
  for (const [ch, v] of Object.entries(FRACTIONS)) t = t.replace(ch, v)
  t = t.trim()
  if (t.includes(' ')) {
    const [whole, rest] = t.split(/\s+/, 2)
    return Number(whole) + parseNumber(rest)
  }
  if (t.includes('/')) {
    const [n, d] = t.split('/')
    return Number(n) / Number(d)
  }
  return Number(t)
}

// The nearest "kitchen fraction" of x: 1/4 steps, plus thirds. Returns text such as "1 1/2" or "2/3".
function kitchenFraction(x, { eighths = false } = {}) {
  const steps = eighths ? [0, 1 / 8, 1 / 4, 1 / 3, 3 / 8, 1 / 2, 5 / 8, 2 / 3, 3 / 4, 7 / 8, 1] : [0, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 1]
  const labels = { 0: '', 0.125: '1/8', 0.25: '1/4', 0.375: '3/8', 0.5: '1/2', 0.625: '5/8', 0.75: '3/4', 0.875: '7/8' }
  let whole = Math.floor(x)
  const part = x - whole
  const best = steps.reduce((a, b) => (Math.abs(b - part) < Math.abs(a - part) ? b : a))
  if (best === 1) {
    whole += 1
    return String(whole)
  }
  const label = Math.abs(best - 1 / 3) < 1e-9 ? '1/3' : Math.abs(best - 2 / 3) < 1e-9 ? '2/3' : labels[best]
  if (!label) return String(whole)
  return whole ? `${whole} ${label}` : label
}

function roundTo(x, step) {
  return Math.round(x / step) * step
}

function trimNumber(x) {
  return String(Number(x.toFixed(1)))
}

function pluralCup(amountText, value) {
  return value > 1 ? `${amountText} cups` : `${amountText} cup`
}

// ml -> a US measure
function usVolume(ml) {
  if (ml >= 60) {
    const cups = ml / CUP_ML
    const text = kitchenFraction(cups)
    return pluralCup(text, parseNumber(text))
  }
  if (ml >= 14) return `${kitchenFraction(roundTo(ml / 15, 0.5))} tbsp`
  return `${kitchenFraction(ml / 5)} tsp`
}

// g -> a US weight, or null when it is too small to be useful in ounces (kept as grams)
function usWeight(g) {
  if (g < 14) return null
  const oz = g / 28.3495
  if (oz < 16 - 0.5) return `${kitchenFraction(oz < 8 ? roundTo(oz, 0.5) : Math.round(oz))} oz`
  const lb = roundTo(g / 453.592, 0.25)
  return `${kitchenFraction(lb)} lb`
}

function metricVolume(ml) {
  if (ml >= 1000) return `${trimNumber(ml / 1000)} l`
  return `${ml < 100 ? roundTo(ml, 5) : roundTo(ml, 10)} ml`
}

function metricWeight(g) {
  if (g >= 1000) return `${trimNumber(roundTo(g / 1000, 0.1))} kg`
  if (g >= 600) return `${roundTo(g, 25)} g`
  if (Math.abs(g - 453.6) < 5) return '450 g' // 1 lb
  if (g >= 50) return `${roundTo(g, 5)} g`
  return `${Math.round(g)} g`
}

function lengthText(cm, system) {
  if (system === 'metric') return `${trimNumber(cm < 3 ? roundTo(cm, 0.1) : roundTo(cm, 0.5))} cm`
  const inches = cm / 2.54
  return `${kitchenFraction(inches < 4 ? roundTo(inches, 0.25) : roundTo(inches, 0.5))} in`
}

// One matched quantity -> text in `system`, or null to leave it as written.
function convertQuantity(low, high, unitWord, system) {
  const entry = UNIT_TABLE[unitWord.toLowerCase().replace(/\s+/g, ' ')]
  if (!entry) return null
  const [, kind, size, from] = entry
  if (from === system || from === 'both') return null
  const convert = (n) => {
    const base = n * size // ml, g or cm
    if (kind === 'volume') return system === 'metric' ? metricVolume(base) : usVolume(base)
    if (kind === 'weight') return system === 'metric' ? metricWeight(base) : usWeight(base)
    return lengthText(base, system)
  }
  const a = convert(parseNumber(low))
  if (a == null) return null
  if (high == null) return a
  const b = convert(parseNumber(high))
  if (b == null) return null
  // "1-2 cups" -> "1/2 cup-1 cup" would be ugly; give "240-480 ml" style when both share the unit
  const unitA = a.replace(/^[\d./\s]+/, '')
  const unitB = b.replace(/^[\d./\s]+/, '')
  if (unitA === unitB) return `${a.slice(0, a.length - unitA.length).trim()}-${b}`
  return `${a} to ${b}`
}

const DEGREES = /(\d{2,3})(\s*(?:°|º|˚)\s*|\s+degrees\s+)(F|C|fahrenheit|celsius)\b/gi

// 350-375°F
const DEGREE_RANGE = /(\d{2,3})\s*(?:-|–|to)\s*(\d{2,3})(\s*(?:°|º|˚)\s*|\s+degrees\s+)(F|C|fahrenheit|celsius)\b/gi
// 9x13 inch pan, 9x13-inch pan
const PAN = /(?<![\w/.])(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*-\s*|\s*)(inch|inches)\b/gi

function convertPans(text, system) {
  if (system !== 'metric') return text
  return text.replace(PAN, (_m, a, b) => `${Math.round(a * 2.54)}x${Math.round(b * 2.54)} cm`)
}

function convertTemperatures(text, system) {
  const one = (isF, value) => {
    if (isF) return roundTo((value - 32) * (5 / 9), 5)
    const f = value * (9 / 5) + 32
    return f >= 250 ? roundTo(f, 25) : roundTo(f, 5)
  }
  text = text.replace(DEGREE_RANGE, (match, low, high, _sep, scale) => {
    const isF = /^f/i.test(scale)
    if ((isF && system === 'us') || (!isF && system === 'metric')) return match
    return `${one(isF, Number(low))}-${one(isF, Number(high))}${isF ? '°C' : '°F'}`
  })
  return text.replace(DEGREES, (match, number, _sep, scale) => {
    const isF = /^f/i.test(scale)
    if ((isF && system === 'us') || (!isF && system === 'metric')) return match
    return `${one(isF, Number(number))}${isF ? '°C' : '°F'}`
  })
}

export function convertUnits(text, system) {
  if (typeof text !== 'string' || !text || !UNIT_SYSTEMS.includes(system)) return text
  let out = text
  for (const [ch, v] of Object.entries(FRACTIONS)) out = out.split(ch).join(v)
  // 1. "1 cup (240 ml) milk": show the quantity that is already in the chosen system, or convert the first
  out = out.replace(DUAL, (match, first, ...rest) => {
    const parts = [...rest]
    // the groups of the two QUANTITY patterns: [low, high, unit] each, after the outer groups
    const firstGroups = [parts[0], parts[1], parts[2]]
    const secondStart = 3 + 1 // skip the second pattern's outer group
    const secondGroups = [parts[secondStart], parts[secondStart + 1], parts[secondStart + 2]]
    const unitOf = (g) => UNIT_TABLE[(g[2] || '').toLowerCase().replace(/\s+/g, ' ')]
    const e1 = unitOf(firstGroups)
    const e2 = unitOf(secondGroups)
    if (!e1 || !e2 || e1[1] !== e2[1]) return match
    // keep the one already in the chosen system, else the one used in both systems, else the first
    const pick = [firstGroups, secondGroups].find((g) => unitOf(g)[3] === system) || [firstGroups, secondGroups].find((g) => unitOf(g)[3] === 'both') || firstGroups
    const converted = convertQuantity(pick[0], pick[1], pick[2], system)
    return converted ?? `${pick[0]}${pick[1] ? `-${pick[1]}` : ''} ${pick[2]}`
  })
  // 2. pan sizes (9x13 inch), then every other quantity
  out = convertPans(out, system)
  out = out.replace(QUANTITY, (match, low, high, unitWord) => convertQuantity(low, high, unitWord, system) ?? match)
  // 3. oven temperatures
  return convertTemperatures(out, system)
}
