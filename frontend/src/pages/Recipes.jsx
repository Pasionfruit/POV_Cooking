import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Recipes() {
  const { user } = useAuth()
  const [saved, setSaved] = useState([])
  const [draft, setDraft] = useState({ title: '', ingredients: '', instructions: '', time: '', duration: '', equipment: '', visibility: false })
  const [selectedRecipe, setSelectedRecipe] = useState(null)

  const availableRecipes = [
    {
      id: 101,
      title: 'Garlic Chicken Stir Fry',
      ingredients: ['Chicken breast', 'Garlic', 'Soy sauce', 'Broccoli', 'Carrots'],
      instructions: '1. Chop the vegetables. 2. Sauté the garlic. 3. Add chicken and cook. 4. Add vegetables and sauce; simmer 8–10 mins. 5. Serve over rice.',
      time: 20,
      duration: 25,
      equipment: ['Wok', 'Spatula', 'Knife'],
      notes: 'Make extra for meal prep. Add chili flakes if you like heat.'
    },
    {
      id: 102,
      title: 'Veggie Quinoa Bowl',
      ingredients: ['Quinoa', 'Avocado', 'Cherry tomatoes', 'Cucumbers', 'Feta', 'Lemon'],
      instructions: '1. Cook quinoa. 2. Chop veggies. 3. Toss everything with lemon dressing. 4. Sprinkle feta on top.',
      time: 15,
      duration: 30,
      equipment: ['Saucepan', 'Bowl'],
      notes: 'Use chickpeas for extra protein.'
    }
  ]

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
    const recipe = availableRecipes.find(r => r.id === recipeId)
    if (!recipe) return

    setSaved(prev => {
      if (prev.some(r => r.id === recipe.id)) return prev
      return [...prev, { ...recipe, user_id: user?.id || 1 }]
    })
    alert('Recipe saved! (simulated)')
  }

  const handleOpenDetails = (recipe) => setSelectedRecipe(recipe)
  const handleCloseDetails = () => setSelectedRecipe(null)


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
        <h3>Available Recipes</h3>
        <div className="grid">
          {availableRecipes.map(r => (
            <div key={r.id} className="card">
              <div className="card-title">{r.title}</div>
              <div className="card-meta">Time: {r.time}m • Duration: {r.duration}m</div>
              <div className="card-actions">
                <button onClick={() => handleOpenDetails(r)}>View Details</button>
                <button onClick={() => handleSave(r.id)}>Save</button>
              </div>
            </div>
          ))}
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
                <button onClick={() => handleOpenDetails(r)}>View Details</button>
              </div>
            </div>
          ))}
          {saved.length === 0 && <p>No saved recipes yet. Save some recipes to see them here!</p>}
        </div>
      </section>

      {selectedRecipe && (
        <div className="modal-overlay" onClick={handleCloseDetails}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedRecipe.title}</h3>
              <button onClick={handleCloseDetails}>Close</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <p><strong>Time:</strong> {selectedRecipe.time} min</p>
              <p><strong>Duration:</strong> {selectedRecipe.duration} min</p>
              <p><strong>Ingredients:</strong></p>
              <ul>
                {selectedRecipe.ingredients.map((ing, idx) => <li key={idx}>{ing}</li>)}
              </ul>
              <p><strong>Equipment:</strong></p>
              <ul>
                {selectedRecipe.equipment.map((eq, idx) => <li key={idx}>{eq}</li>)}
              </ul>
              <p><strong>Instructions:</strong></p>
              <p style={{ whiteSpace: 'pre-wrap' }}>{selectedRecipe.instructions}</p>
              {selectedRecipe.notes && <p><strong>Notes:</strong> {selectedRecipe.notes}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}