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
      expiration_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 3 days from now
    },
    {
      id: 2,
      name: "Rice",
      category: "Grains",
      quantity: 5,
      unit: "lbs",
      location: "Pantry",
      expiration_date: null
    },
    {
      id: 3,
      name: "Milk",
      category: "Dairy",
      quantity: 1,
      unit: "gallon",
      location: "Fridge",
      expiration_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 5 days from now
    },
    {
      id: 4,
      name: "Expired Yogurt",
      category: "Dairy",
      quantity: 2,
      unit: "cups",
      location: "Fridge",
      expiration_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 2 days ago
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

  const [editingItem, setEditingItem] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '',
    category: 'Vegetables',
    quantity: 1,
    unit: 'pcs',
    location: 'Fridge',
    expiration_date: ''
  })

  const [filters, setFilters] = useState({
    category: '',
    location: '',
    search: ''
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

  const handleEditItem = (item) => {
    setEditingItem(item.id)
    setEditForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      location: item.location,
      expiration_date: item.expiration_date || ''
    })
  }

  const handleSaveEdit = () => {
    setPantryItems(prev => prev.map(item =>
      item.id === editingItem
        ? {
            ...item,
            name: editForm.name,
            category: editForm.category,
            quantity: parseFloat(editForm.quantity) || 1,
            unit: editForm.unit,
            location: editForm.location,
            expiration_date: editForm.expiration_date || null
          }
        : item
    ))
    setEditingItem(null)
    setEditForm({
      name: '',
      category: 'Vegetables',
      quantity: 1,
      unit: 'pcs',
      location: 'Fridge',
      expiration_date: ''
    })
    alert('Pantry item updated! (simulated)')
  }

  const handleCancelEdit = () => {
    setEditingItem(null)
    setEditForm({
      name: '',
      category: 'Vegetables',
      quantity: 1,
      unit: 'pcs',
      location: 'Fridge',
      expiration_date: ''
    })
  }

  const filteredItems = pantryItems.filter(item => {
    const matchesCategory = !filters.category || item.category === filters.category
    const matchesLocation = !filters.location || item.location === filters.location
    const matchesSearch = !filters.search ||
      item.name.toLowerCase().includes(filters.search.toLowerCase())
    return matchesCategory && matchesLocation && matchesSearch
  })

  const isExpiringSoon = (expirationDate) => {
    if (!expirationDate) return false
    const today = new Date()
    const expDate = new Date(expirationDate)
    const timeDiff = expDate.getTime() - today.getTime()
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))
    return daysDiff <= 7 && daysDiff >= 0
  }

  const isExpired = (expirationDate) => {
    if (!expirationDate) return false
    const today = new Date()
    const expDate = new Date(expirationDate)
    return expDate < today
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

        {/* Filter Controls */}
        <div className="filter-controls">
          <div className="form-row">
            <input
              type="text"
              placeholder="Search items..."
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
            />
            <select
              value={filters.category}
              onChange={e => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={filters.location}
              onChange={e => setFilters({ ...filters, location: e.target.value })}
            >
              <option value="">All Locations</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid">
          {filteredItems.map(item => (
            <div key={item.id} className="card">
              {editingItem === item.id ? (
                <div className="edit-form">
                  <div className="form-row">
                    <input
                      placeholder="Item name"
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    />
                    <select
                      value={editForm.category}
                      onChange={e => setEditForm({ ...editForm, category: e.target.value })}
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
                      value={editForm.quantity}
                      onChange={e => setEditForm({ ...editForm, quantity: parseFloat(e.target.value) || 1 })}
                    />
                    <input
                      placeholder="Unit"
                      value={editForm.unit}
                      onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                    />
                    <select
                      value={editForm.location}
                      onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                    >
                      {locations.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-row">
                    <input
                      type="date"
                      placeholder="Expiration date"
                      value={editForm.expiration_date}
                      onChange={e => setEditForm({ ...editForm, expiration_date: e.target.value })}
                    />
                  </div>
                  <div className="row">
                    <button onClick={handleSaveEdit}>Save Changes</button>
                    <button onClick={handleCancelEdit} className="secondary">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={`card-title ${isExpired(item.expiration_date) ? 'expired' : isExpiringSoon(item.expiration_date) ? 'expiring-soon' : ''}`}>
                    {item.name}
                    {isExpired(item.expiration_date) && <span className="warning-icon">⚠️ EXPIRED</span>}
                    {isExpiringSoon(item.expiration_date) && !isExpired(item.expiration_date) && <span className="warning-icon">⏰ Expires Soon</span>}
                  </div>
                  <div className="card-meta">
                    {item.quantity} {item.unit} • {item.category} • {item.location}
                    {item.expiration_date && (
                      <span className={`expiration ${isExpired(item.expiration_date) ? 'expired' : isExpiringSoon(item.expiration_date) ? 'expiring-soon' : ''}`}>
                        • Expires: {new Date(item.expiration_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="card-actions">
                    <button onClick={() => handleEditItem(item)}>Edit</button>
                    <button onClick={() => handleDeleteItem(item.id)} className="danger">Remove</button>
                  </div>
                </>
              )}
            </div>
          ))}
          {filteredItems.length === 0 && pantryItems.length > 0 && (
            <p>No items match your filters. Try adjusting your search criteria.</p>
          )}
          {pantryItems.length === 0 && (
            <p>Your pantry is empty. Add some items above!</p>
          )}
        </div>
      </section>
    </div>
  )
}