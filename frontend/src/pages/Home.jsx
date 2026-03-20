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

  return (
    <div className="home-page">
      <section className="panel">
        <h2>Recipe Explorer</h2>
        <p>Discover and explore recipes from our community.</p>
      </section>

      <section className="panel">
        <h3>Available Recipes</h3>
        <div className="grid">
          {recipes.map(r => (
            <div key={r.id} className="card">
              <div className="card-title">{r.title}</div>
              <div className="card-meta">Time: {r.time ?? '-'}m • Duration: {r.duration ?? '-'}m</div>
              <div className="card-actions">
                <button>View Details</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}