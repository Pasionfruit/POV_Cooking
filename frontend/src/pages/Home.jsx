import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Home() {
  const { user } = useAuth()
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

  const [editingRecipe, setEditingRecipe] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', ingredients: '', instructions: '', time: '', duration: '', equipment: '' })
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [isRandomizerExpanded, setIsRandomizerExpanded] = useState(false)

  const handleOpenDetails = (recipe) => setSelectedRecipe(recipe)
  const handleCloseDetails = () => setSelectedRecipe(null)

  const handleSpin = () => {
    if (isSpinning || recipes.length === 0) return

    setIsSpinning(true)
    setSelectedRecipe(null)

    // Select random recipe immediately
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * recipes.length)
      setSelectedRecipe(recipes[randomIndex])
      setIsSpinning(false)
    }, 1000) // Short delay for effect
  }

  const handleEdit = (recipe) => {
    setEditingRecipe(recipe.id)
    setEditForm({
      title: recipe.title,
      ingredients: recipe.ingredients.join(', '),
      instructions: recipe.instructions,
      time: recipe.time?.toString() || '',
      duration: recipe.duration?.toString() || '',
      equipment: recipe.equipment.join(', ')
    })
  }

  const handleSaveEdit = () => {
    setRecipes(prev => prev.map(recipe =>
      recipe.id === editingRecipe
        ? {
            ...recipe,
            title: editForm.title,
            ingredients: editForm.ingredients.split(',').map(s => s.trim()).filter(Boolean),
            instructions: editForm.instructions,
            time: parseInt(editForm.time) || 0,
            duration: parseInt(editForm.duration) || 0,
            equipment: editForm.equipment.split(',').map(s => s.trim()).filter(Boolean)
          }
        : recipe
    ))
    setEditingRecipe(null)
    setEditForm({ title: '', ingredients: '', instructions: '', time: '', duration: '', equipment: '' })
    alert('Recipe updated! (simulated)')
  }

  const handleCancelEdit = () => {
    setEditingRecipe(null)
    setEditForm({ title: '', ingredients: '', instructions: '', time: '', duration: '', equipment: '' })
  }

  const handleDelete = (recipeId) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      setRecipes(prev => prev.filter(recipe => recipe.id !== recipeId))
      alert('Recipe deleted! (simulated)')
    }
  }

  return (
    <div className="home-page">
      <section className="panel">
        <h2>Recipe Explorer</h2>
        <p>Discover and explore recipes from our community.</p>
      </section>

      <section className="panel">
        <div className="panel-header" onClick={() => setIsRandomizerExpanded(!isRandomizerExpanded)}>
          <h3>Randomize Meal</h3>
          <button className="collapse-btn">
            {isRandomizerExpanded ? '−' : '+'}
          </button>
        </div>
        {isRandomizerExpanded && (
          <>
            <p>Can't decide what to cook? Let us pick a random recipe for you!</p>
            <div className="randomizer-container">
              <button
                onClick={handleSpin}
                disabled={isSpinning || recipes.length === 0}
                className="randomize-button"
              >
                {isSpinning ? '🎲 Choosing...' : '🎲 Randomize Recipe!'}
              </button>
            </div>
            {selectedRecipe && !isSpinning && (
              <div className="selected-recipe">
                <h4>🍽️ Your random recipe: {selectedRecipe.title}</h4>
                <p>Time: {selectedRecipe.time}m • Duration: {selectedRecipe.duration}m</p>
                <div className="recipe-preview">
                  <strong>Ingredients:</strong> {selectedRecipe.ingredients.slice(0, 3).join(', ')}{selectedRecipe.ingredients.length > 3 ? '...' : ''}
                </div>
                <button onClick={() => handleOpenDetails(selectedRecipe)}>View Full Recipe</button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="panel">
        <h3>Available Recipes</h3>
        <div className="grid">
          {recipes.map(r => (
            <div key={r.id} className="card">
              {editingRecipe === r.id ? (
                <div className="edit-form">
                  <div className="form-row">
                    <input
                      placeholder="Title"
                      value={editForm.title}
                      onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                    />
                    <input
                      placeholder="Time (min)"
                      value={editForm.time}
                      onChange={e => setEditForm({ ...editForm, time: e.target.value })}
                    />
                    <input
                      placeholder="Duration (min)"
                      value={editForm.duration}
                      onChange={e => setEditForm({ ...editForm, duration: e.target.value })}
                    />
                  </div>
                  <div className="form-row">
                    <input
                      placeholder="Ingredients (comma separated)"
                      value={editForm.ingredients}
                      onChange={e => setEditForm({ ...editForm, ingredients: e.target.value })}
                    />
                  </div>
                  <div className="form-row">
                    <input
                      placeholder="Equipment (comma separated)"
                      value={editForm.equipment}
                      onChange={e => setEditForm({ ...editForm, equipment: e.target.value })}
                    />
                  </div>
                  <div className="form-row">
                    <textarea
                      placeholder="Instructions"
                      value={editForm.instructions}
                      onChange={e => setEditForm({ ...editForm, instructions: e.target.value })}
                    />
                  </div>
                  <div className="row">
                    <button onClick={handleSaveEdit}>Save Changes</button>
                    <button onClick={handleCancelEdit} className="secondary">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="card-title">{r.title}</div>
                  <div className="card-meta">Time: {r.time ?? '-'}m • Duration: {r.duration ?? '-'}m</div>
                  <div className="card-actions">
                    <button onClick={() => handleOpenDetails(r)}>View Details</button>
                    {user?.role === 'admin' && (
                      <>
                        <button onClick={() => handleEdit(r)}>Edit</button>
                        <button onClick={() => handleDelete(r.id)} className="danger">Delete</button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
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
              <ul>{selectedRecipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}</ul>
              <p><strong>Equipment:</strong></p>
              <ul>{selectedRecipe.equipment.map((eq, i) => <li key={i}>{eq}</li>)}</ul>
              <p><strong>Instructions:</strong></p>
              <p style={{ whiteSpace: 'pre-wrap' }}>{selectedRecipe.instructions}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}