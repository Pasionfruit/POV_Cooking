import React, { useState } from 'react'

export default function Admin() {
  const [recipes, setRecipes] = useState([
    {
      id: 1,
      title: "Classic Spaghetti Carbonara",
      ingredients: ["200g spaghetti", "100g pancetta", "2 eggs", "50g parmesan", "Black pepper"],
      instructions: "Cook pasta. Fry pancetta. Mix eggs and cheese. Combine everything.",
      time: 15,
      duration: 20,
      equipment: ["pot", "pan", "bowl"],
      visibility: true,
      user_id: 1
    },
    {
      id: 2,
      title: "Chicken Stir Fry",
      ingredients: ["300g chicken breast", "2 bell peppers", "1 onion", "Soy sauce", "Ginger"],
      instructions: "Slice chicken and veggies. Stir fry chicken first, then add veggies. Season with soy sauce.",
      time: 10,
      duration: 15,
      equipment: ["wok", "knife"],
      visibility: false,
      user_id: 2
    }
  ])

  const [draft, setDraft] = useState({ title: '', ingredients: '', instructions: '', time: '', duration: '', equipment: '', visibility: false })
  const [editing, setEditing] = useState(null)

  const handleCreate = () => {
    const newRecipe = {
      id: Date.now(),
      title: draft.title,
      ingredients: draft.ingredients.split(',').map(s => s.trim()).filter(Boolean),
      instructions: draft.instructions,
      time: parseInt(draft.time) || 0,
      duration: parseInt(draft.duration) || 0,
      equipment: draft.equipment.split(',').map(s => s.trim()).filter(Boolean),
      visibility: draft.visibility,
      user_id: 1
    }
    setRecipes(prev => [...prev, newRecipe])
    setDraft({ title: '', ingredients: '', instructions: '', time: '', duration: '', equipment: '', visibility: false })
    alert('Recipe created! (simulated)')
  }

  const handleUpdate = (id) => {
    const updatedRecipe = {
      ...recipes.find(r => r.id === id),
      title: draft.title,
      ingredients: draft.ingredients.split(',').map(s => s.trim()).filter(Boolean),
      instructions: draft.instructions,
      time: parseInt(draft.time) || 0,
      duration: parseInt(draft.duration) || 0,
      equipment: draft.equipment.split(',').map(s => s.trim()).filter(Boolean),
      visibility: draft.visibility
    }
    setRecipes(prev => prev.map(r => r.id === id ? updatedRecipe : r))
    setEditing(null)
    setDraft({ title: '', ingredients: '', instructions: '', time: '', duration: '', equipment: '', visibility: false })
    alert('Recipe updated! (simulated)')
  }

  const handleDelete = (id) => {
    setRecipes(prev => prev.filter(r => r.id !== id))
    alert('Recipe deleted! (simulated)')
  }

  const startEdit = (recipe) => {
    setEditing(recipe.id)
    setDraft({
      title: recipe.title,
      ingredients: (recipe.ingredients || []).join(', '),
      instructions: recipe.instructions,
      time: recipe.time ?? '',
      duration: recipe.duration ?? '',
      equipment: (recipe.equipment || []).join(', '),
      visibility: recipe.visibility ?? false
    })
  }

  return (
    <div className="admin-page">
      <section className="panel">
        <h2>Admin Dashboard</h2>
        <p>Manage all recipes and user content.</p>
      </section>

      <section className="panel">
        <h3>{editing ? 'Edit Recipe' : 'Create New Recipe'}</h3>
        <div className="form-row">
          <input
            placeholder="Title"
            value={draft.title}
            onChange={e => setDraft({ ...draft, title: e.target.value })}
          />
          <input
            placeholder="Time (min)"
            value={draft.time}
            onChange={e => setDraft({ ...draft, time: e.target.value })}
          />
          <input
            placeholder="Duration (min)"
            value={draft.duration}
            onChange={e => setDraft({ ...draft, duration: e.target.value })}
          />
        </div>
        <div className="form-row">
          <input
            placeholder="Ingredients (comma separated)"
            value={draft.ingredients}
            onChange={e => setDraft({ ...draft, ingredients: e.target.value })}
          />
        </div>
        <div className="form-row">
          <input
            placeholder="Equipment (comma separated)"
            value={draft.equipment}
            onChange={e => setDraft({ ...draft, equipment: e.target.value })}
          />
        </div>
        <div className="form-row">
          <textarea
            placeholder="Instructions"
            value={draft.instructions}
            onChange={e => setDraft({ ...draft, instructions: e.target.value })}
          />
        </div>
        <div className="checkbox-row">
          <label>
            <input
              type="checkbox"
              checked={draft.visibility}
              onChange={e => setDraft({ ...draft, visibility: e.target.checked })}
            />
            Public visibility
          </label>
        </div>
        <div className="row">
          <button onClick={() => editing ? handleUpdate(editing) : handleCreate()}>
            {editing ? 'Update Recipe' : 'Create Recipe'}
          </button>
          {editing && (
            <button onClick={() => { setEditing(null); setDraft({ title: '', ingredients: '', instructions: '', time: '', duration: '', equipment: '', visibility: false }) }}>
              Cancel
            </button>
          )}
        </div>
      </section>

      <section className="panel">
        <h3>All Recipes</h3>
        <div className="grid">
          {recipes.map(recipe => (
            <div key={recipe.id} className="card">
              <div className="card-title">{recipe.title}</div>
              <div className="card-meta">
                Time: {recipe.time ?? '-'}m • Owner: {recipe.user_id} • {recipe.visibility ? 'Public' : 'Private'}
              </div>
              <div className="card-actions">
                <button onClick={() => startEdit(recipe)}>Edit</button>
                <button onClick={() => handleDelete(recipe.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}