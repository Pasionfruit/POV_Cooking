import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Recipes() {
  const { user } = useAuth()
  const [saved, setSaved] = useState([])
  const [draft, setDraft] = useState({ title: '', ingredients: '', instructions: '', time: '', duration: '', equipment: '', visibility: false })

  async function handleCreate() {
    const newRecipe = {
      id: Date.now(),
      title: draft.title,
      ingredients: draft.ingredients.split(',').map(s => s.trim()).filter(Boolean),
      instructions: draft.instructions,
      time: parseInt(draft.time) || 0,
      duration: parseInt(draft.duration) || 0,
      equipment: draft.equipment.split(',').map(s => s.trim()).filter(Boolean),
      visibility: draft.visibility,
      user_id: user?.id || 1
    }
    // For now, just log the recipe (simulated creation)
    console.log('Recipe created:', newRecipe)
    setDraft({ title: '', ingredients: '', instructions: '', time: '', duration: '', equipment: '', visibility: false })
    alert('Recipe created! (simulated)')
  }

  async function handleSave(recipeId) {
    // This would normally save from available recipes
    const mockRecipe = {
      id: recipeId,
      title: `Saved Recipe ${recipeId}`,
      ingredients: ['ingredient 1', 'ingredient 2'],
      instructions: 'Mix and cook',
      time: 15,
      duration: 20,
      equipment: ['pot', 'pan'],
      visibility: true,
      user_id: user?.id || 1
    }
    setSaved(prev => [...prev, mockRecipe])
    alert('Recipe saved! (simulated)')
  }

  return (
    <div className="recipes-page">
      <section className="panel">
        <h2>My Recipes</h2>
        <p>Create and manage your personal recipe collection.</p>
      </section>

      <section className="panel">
        <h3>Create a Recipe</h3>
        <div className="form-row">
          <input placeholder="Title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
          <input placeholder="Time (min)" value={draft.time} onChange={e => setDraft({ ...draft, time: e.target.value })} />
          <input placeholder="Duration (min)" value={draft.duration} onChange={e => setDraft({ ...draft, duration: e.target.value })} />
        </div>
        <div className="form-row">
          <input placeholder="Ingredients (comma separated)" value={draft.ingredients} onChange={e => setDraft({ ...draft, ingredients: e.target.value })} />
        </div>
        <div className="form-row">
          <input placeholder="Equipment (comma separated)" value={draft.equipment} onChange={e => setDraft({ ...draft, equipment: e.target.value })} />
        </div>
        <div className="form-row">
          <textarea placeholder="Instructions" value={draft.instructions} onChange={e => setDraft({ ...draft, instructions: e.target.value })} />
        </div>
        <div className="row">
          <button onClick={() => handleCreate()}>Create Recipe</button>
        </div>
      </section>

      <section className="panel">
        <h3>Saved Recipes</h3>
        <div className="grid">
          {saved.map(r => (
            <div key={r.id} className="card">
              <div className="card-title">{r.title}</div>
              <div className="card-meta">Time: {r.time ?? '-'}m • Duration: {r.duration ?? '-'}m</div>
              <div className="card-actions">
                <button>View Details</button>
              </div>
            </div>
          ))}
          {saved.length === 0 && <p>No saved recipes yet. Save some recipes to see them here!</p>}
        </div>
      </section>
    </div>
  )
}