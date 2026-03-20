import React, { useState } from 'react'

export default function Pantry() {
  const [pantryItems, setPantryItems] = useState([
    {
      id: 1,
      name: "Chicken Breast",
      category: "Protein",
      quantity: 2,
      unit: "lbs",
      location: "Fridge",
      expiration_date: "2024-03-25"
    },
    {
      id: 2,
      name: "Rice",
      category: "Grains",
      quantity: 5,
      unit: "lbs",
      location: "Pantry",
      expiration_date: null
    }
  ])

  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Vegetables',
    quantity: 1,
    unit: 'pcs',
    location: 'Fridge',
    expiration_date: ''
  })

  const categories = ['Grains', 'Vegetables', 'Fruits', 'Dairy', 'Protein', 'Fats and Oils', 'Sugars and Sweets']
  const locations = ['Fridge', 'Freezer', 'Pantry', 'Misc']

  const handleAddItem = () => {
    if (!newItem.name.trim()) return

    const item = {
      id: Date.now(),
      ...newItem,
      expiration_date: newItem.expiration_date || null
    }

    setPantryItems(prev => [...prev, item])
    setNewItem({
      name: '',
      category: 'Vegetables',
      quantity: 1,
      unit: 'pcs',
      location: 'Fridge',
      expiration_date: ''
    })
    alert('Pantry item added! (simulated)')
  }

  const handleDeleteItem = (id) => {
    setPantryItems(prev => prev.filter(item => item.id !== id))
    alert('Pantry item removed! (simulated)')
  }

  return (
    <div className="pantry-page">
      <section className="panel">
        <h2>My Pantry</h2>
        <p>Manage your kitchen inventory and track expiration dates.</p>
      </section>

      <section className="panel">
        <h3>Add New Item</h3>
        <div className="form-row">
          <input
            placeholder="Item name"
            value={newItem.name}
            onChange={e => setNewItem({ ...newItem, name: e.target.value })}
          />
          <select
            value={newItem.category}
            onChange={e => setNewItem({ ...newItem, category: e.target.value })}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <input
            type="number"
            placeholder="Quantity"
            value={newItem.quantity}
            onChange={e => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 1 })}
          />
          <input
            placeholder="Unit (lbs, pcs, etc.)"
            value={newItem.unit}
            onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
          />
          <select
            value={newItem.location}
            onChange={e => setNewItem({ ...newItem, location: e.target.value })}
          >
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <input
            type="date"
            placeholder="Expiration date (optional)"
            value={newItem.expiration_date}
            onChange={e => setNewItem({ ...newItem, expiration_date: e.target.value })}
          />
        </div>
        <div className="row">
          <button onClick={handleAddItem}>Add to Pantry</button>
        </div>
      </section>

      <section className="panel">
        <h3>Pantry Items</h3>
        <div className="grid">
          {pantryItems.map(item => (
            <div key={item.id} className="card">
              <div className="card-title">{item.name}</div>
              <div className="card-meta">
                {item.quantity} {item.unit} • {item.category} • {item.location}
                {item.expiration_date && (
                  <span className="expiration">
                    • Expires: {new Date(item.expiration_date).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="card-actions">
                <button onClick={() => handleDeleteItem(item.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}