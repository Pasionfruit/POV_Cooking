import React, { useState } from 'react'

export default function MealPlan() {
  const [groceryItems, setGroceryItems] = useState([
    { id: 1, name: 'Chicken Breast', quantity: 2, unit: 'lbs', checked: false },
    { id: 2, name: 'Rice', quantity: 5, unit: 'lbs', checked: true },
    { id: 3, name: 'Broccoli', quantity: 1, unit: 'head', checked: false }
  ])

  const [newGroceryItem, setNewGroceryItem] = useState({
    name: '',
    quantity: 1,
    unit: 'pcs'
  })

  const [mealPlan, setMealPlan] = useState({
    Monday: { breakfast: '', lunch: '', dinner: '' },
    Tuesday: { breakfast: '', lunch: '', dinner: '' },
    Wednesday: { breakfast: '', lunch: '', dinner: '' },
    Thursday: { breakfast: '', lunch: '', dinner: '' },
    Friday: { breakfast: '', lunch: '', dinner: '' },
    Saturday: { breakfast: '', lunch: '', dinner: '' },
    Sunday: { breakfast: '', lunch: '', dinner: '' }
  })

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const meals = ['breakfast', 'lunch', 'dinner']

  const getTodaysMeals = () => {
    const today = new Date().toLocaleLowerCase('en-US', { weekday: 'long' })
    return {
      day: today.charAt(0).toUpperCase() + today.slice(1),
      meals: mealPlan[today] || { breakfast: '', lunch: '', dinner: '' }
    }
  }

  const todaysData = getTodaysMeals()

  const handleAddGroceryItem = () => {
    if (!newGroceryItem.name.trim()) return

    const item = {
      id: Date.now(),
      ...newGroceryItem,
      checked: false
    }

    setGroceryItems(prev => [...prev, item])
    setNewGroceryItem({ name: '', quantity: 1, unit: 'pcs' })
    alert('Grocery item added! (simulated)')
  }

  const handleToggleGroceryItem = (id) => {
    setGroceryItems(prev => prev.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ))
  }

  const handleDeleteGroceryItem = (id) => {
    setGroceryItems(prev => prev.filter(item => item.id !== id))
    alert('Grocery item removed! (simulated)')
  }

  const handleMealChange = (day, mealType, value) => {
    setMealPlan(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: value
      }
    }))
  }

  const handleSaveMealPlan = () => {
    alert('Meal plan saved! (simulated)')
  }

  return (
    <div className="meal-plan-page">
      <div className="meal-plan-grid">
        <section className="panel grocery-section">
          <h3>Grocery List</h3>

          <div className="add-grocery-form">
            <div className="form-row">
              <input
                placeholder="Item name"
                value={newGroceryItem.name}
                onChange={e => setNewGroceryItem({ ...newGroceryItem, name: e.target.value })}
              />
              <input
                type="number"
                placeholder="Quantity"
                value={newGroceryItem.quantity}
                onChange={e => setNewGroceryItem({ ...newGroceryItem, quantity: parseFloat(e.target.value) || 1 })}
              />
              <input
                placeholder="Unit"
                value={newGroceryItem.unit}
                onChange={e => setNewGroceryItem({ ...newGroceryItem, unit: e.target.value })}
              />
              <button onClick={handleAddGroceryItem}>Add</button>
            </div>
          </div>

          <div className="grocery-list">
            <table className="grocery-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groceryItems.map(item => (
                  <tr key={item.id} className={item.checked ? 'checked' : ''}>
                    <td className="item-name">{item.name}</td>
                    <td className="item-quantity">{item.quantity} {item.unit}</td>
                    <td className="item-status">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => handleToggleGroceryItem(item.id)}
                        />
                        <span className="checkmark"></span>
                        {item.checked ? 'Done' : 'Pending'}
                      </label>
                    </td>
                    <td className="item-actions">
                      <button
                        onClick={() => handleDeleteGroceryItem(item.id)}
                        className="delete-btn"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {groceryItems.length === 0 && (
              <p className="empty-list">Your grocery list is empty. Add some items above!</p>
            )}
          </div>
        </section>

        <section className="panel todays-meals">
          <h3>Current Day</h3>
          <div className="todays-meals-content">
            <div className="current-day">
              <h4>{todaysData.day}</h4>
            </div>
            <div className="meals-grid">
              <div className="meal-item">
                <strong>Breakfast:</strong>
                <span>{todaysData.meals.breakfast || 'Not planned'}</span>
              </div>
              <div className="meal-item">
                <strong>Lunch:</strong>
                <span>{todaysData.meals.lunch || 'Not planned'}</span>
              </div>
              <div className="meal-item">
                <strong>Dinner:</strong>
                <span>{todaysData.meals.dinner || 'Not planned'}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="panel meal-plan-section">
          <div className="meal-plan-header">
            <h3>Week Meals</h3>
            <button onClick={handleSaveMealPlan} className="save-plan-btn">Save Plan</button>
          </div>

          <div className="meal-plan-table">
            <div className="meal-plan-row header-row">
              <div className="day-cell">Day</div>
              <div className="meal-cell">Breakfast</div>
              <div className="meal-cell">Lunch</div>
              <div className="meal-cell">Dinner</div>
            </div>

            {days.map(day => (
              <div key={day} className="meal-plan-row">
                <div className="day-cell">{day}</div>
                {meals.map(meal => (
                  <div key={meal} className="meal-cell">
                    <input
                      type="text"
                      placeholder={`Enter ${meal}...`}
                      value={mealPlan[day][meal]}
                      onChange={e => handleMealChange(day, meal, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}