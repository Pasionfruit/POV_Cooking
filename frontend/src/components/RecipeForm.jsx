import React, { useState } from 'react'
import { MEAL_TYPES, ingredientToText } from '../lib/recipeUtils'

// Shared recipe editor: used for admin CRUD, reviewing an imported link, and
// user suggestions. "Form" mode covers the common fields; "JSON" mode exposes
// the full semi-structured document for anything else.
export default function RecipeForm({ initial, onSubmit, onCancel, busy, submitLabel, cancelLabel }) {
  const [mode, setMode] = useState('form')
  const [error, setError] = useState(null)
  const [fields, setFields] = useState(() => ({
    title: initial?.title || '',
    description: initial?.description || '',
    image: initial?.image || '',
    cuisine: initial?.cuisine || '',
    mealType: initial?.mealType || '',
    servings: initial?.servings ?? '',
    prepTimeMinutes: initial?.prepTimeMinutes ?? '',
    cookTimeMinutes: initial?.cookTimeMinutes ?? '',
    tags: (initial?.tags || []).join(', '),
    ingredients: (initial?.ingredients || []).map(ingredientToText).join('\n'),
    steps: (initial?.steps || []).join('\n'),
    notes: initial?.notes || '',
  }))
  const [jsonText, setJsonText] = useState(() => JSON.stringify(buildRecipe(fields, initial), null, 2))

  function set(name, value) {
    setFields((f) => ({ ...f, [name]: value }))
  }

  function buildRecipe(f, base) {
    const lines = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean)
    const num = (v) => (v === '' || v === null ? null : Number(v))
    return {
      ...(base || {}),
      title: f.title.trim(),
      description: f.description.trim(),
      image: f.image.trim() || null,
      cuisine: f.cuisine.trim() || null,
      mealType: f.mealType || null,
      servings: num(f.servings),
      prepTimeMinutes: num(f.prepTimeMinutes),
      cookTimeMinutes: num(f.cookTimeMinutes),
      tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
      ingredients: lines(f.ingredients),
      steps: lines(f.steps),
      notes: f.notes.trim() || undefined,
    }
  }

  function switchMode(next) {
    setError(null)
    if (next === 'json') setJsonText(JSON.stringify(buildRecipe(fields, initial), null, 2))
    setMode(next)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    let recipe
    if (mode === 'json') {
      try {
        recipe = JSON.parse(jsonText)
      } catch {
        setError('Invalid JSON — fix the syntax and try again')
        return
      }
    } else {
      recipe = buildRecipe(fields, initial)
    }
    if (!recipe.title) {
      setError('Title is required')
      return
    }
    try {
      await onSubmit(recipe)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form className="recipe-form" onSubmit={handleSubmit}>
      <div className="form-mode-row">
        <button type="button" className={mode === 'form' ? 'chip active' : 'chip'} onClick={() => switchMode('form')}>
          Form
        </button>
        <button type="button" className={mode === 'json' ? 'chip active' : 'chip'} onClick={() => switchMode('json')}>
          Edit as JSON
        </button>
      </div>

      {mode === 'form' ? (
        <>
          <label>
            Title *
            <input value={fields.title} onChange={(e) => set('title', e.target.value)} required />
          </label>
          <label>
            Description
            <textarea rows={2} value={fields.description} onChange={(e) => set('description', e.target.value)} />
          </label>
          <label>
            Image URL
            <input value={fields.image} onChange={(e) => set('image', e.target.value)} placeholder="https://…" />
          </label>
          <div className="field-grid">
            <label>
              Meal type
              <select value={fields.mealType} onChange={(e) => set('mealType', e.target.value)}>
                <option value="">None</option>
                {MEAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cuisine
              <input value={fields.cuisine} onChange={(e) => set('cuisine', e.target.value)} />
            </label>
            <label>
              Servings
              <input type="number" min="0" value={fields.servings} onChange={(e) => set('servings', e.target.value)} />
            </label>
            <label>
              Prep (min)
              <input type="number" min="0" value={fields.prepTimeMinutes} onChange={(e) => set('prepTimeMinutes', e.target.value)} />
            </label>
            <label>
              Cook (min)
              <input type="number" min="0" value={fields.cookTimeMinutes} onChange={(e) => set('cookTimeMinutes', e.target.value)} />
            </label>
          </div>
          <label>
            Tags (comma separated)
            <input value={fields.tags} onChange={(e) => set('tags', e.target.value)} placeholder="dinner, vegetarian" />
          </label>
          <label>
            Ingredients (one per line)
            <textarea rows={6} value={fields.ingredients} onChange={(e) => set('ingredients', e.target.value)} />
          </label>
          <label>
            Steps (one per line)
            <textarea rows={6} value={fields.steps} onChange={(e) => set('steps', e.target.value)} />
          </label>
          <label>
            Notes
            <textarea rows={2} value={fields.notes} onChange={(e) => set('notes', e.target.value)} />
          </label>
        </>
      ) : (
        <label>
          Recipe JSON
          <textarea className="json-editor" rows={18} value={jsonText} onChange={(e) => setJsonText(e.target.value)} spellCheck={false} />
        </label>
      )}

      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel || (initial ? 'Save changes' : 'Add recipe')}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            {cancelLabel || 'Cancel'}
          </button>
        )}
      </div>
    </form>
  )
}
