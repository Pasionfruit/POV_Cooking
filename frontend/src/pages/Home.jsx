import React, { useState } from 'react'

export default function Home() {
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
      visibility: true,
      user_id: 2
    }
  ])

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
      user_id: 1
    }
    setRecipes(prev => [...prev, newRecipe])
    setDraft({ title: '', ingredients: '', instructions: '', time: '', duration: '', equipment: '', visibility: false })
    alert('Recipe created! (simulated)')
  }

  async function handleSave(recipeId) {
    const recipe = recipes.find(r => r.id === recipeId)
    if (recipe) {
      setSaved(prev => [...prev, recipe])
      alert('Recipe saved! (simulated)')
    }
  }

  return (
    <div className="home-page">
      <section className="panel">
        <h2>Create a Recipe</h2>
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
          {recipes.map(r => (
            <div key={r.id} className="card">
              <div className="card-title">{r.title}</div>
              <div className="card-meta">Time: {r.time ?? '-'}m • Owner: {r.user_id}</div>
              <div className="card-actions">
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
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}