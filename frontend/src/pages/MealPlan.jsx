import React, { useEffect, useState } from 'react'
import {
  getMealPlan,
  saveMealPlan,
  getGroceryList,
  addGroceryItem,
  updateGroceryItem,
  deleteGroceryItem
} from '../api'

const EMPTY_WEEK = {
  Monday: { breakfast: '', lunch: '', dinner: '' },
  Tuesday: { breakfast: '', lunch: '', dinner: '' },
  Wednesday: { breakfast: '', lunch: '', dinner: '' },
  Thursday: { breakfast: '', lunch: '', dinner: '' },
  Friday: { breakfast: '', lunch: '', dinner: '' },
  Saturday: { breakfast: '', lunch: '', dinner: '' },
  Sunday: { breakfast: '', lunch: '', dinner: '' }
}

export default function MealPlan({ token }) {
  const [groceryItems, setGroceryItems] = useState([])

  const [newGroceryItem, setNewGroceryItem] = useState({
    name: '',
    quantity: 1,
    unit: 'pcs'
  })

  const [mealPlan, setMealPlan] = useState(EMPTY_WEEK)

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const meals = ['breakfast', 'lunch', 'dinner']

  useEffect(() => {
    if (!token) return

    getMealPlan(token).then((data) => {
      if (data?.weekMeals) {
        setMealPlan({ ...EMPTY_WEEK, ...data.weekMeals })
      }
    }).catch(() => {})

    getGroceryList(token).then((data) => {
      if (Array.isArray(data)) setGroceryItems(data)
    }).catch(() => {})
  }, [token])

  const getTodaysMeals = () => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    return {
      day: today,
      meals: mealPlan[today] || { breakfast: '', lunch: '', dinner: '' }
    }
  }

  const todaysData = getTodaysMeals()

  const handleAddGroceryItem = () => {
    if (!token) return
    if (!newGroceryItem.name.trim()) return

    addGroceryItem(token, {
      name: newGroceryItem.name,
      quantity: newGroceryItem.quantity,
      unit: newGroceryItem.unit
    }).then((item) => {
      if (item?.id) {
        setGroceryItems(prev => [...prev, item])
        setNewGroceryItem({ name: '', quantity: 1, unit: 'pcs' })
      }
    }).catch(() => {})
  }

  const handleToggleGroceryItem = (id) => {
    if (!token) return
    const current = groceryItems.find(item => item.id === id)
    if (!current) return
    updateGroceryItem(token, id, { checked: !current.checked }).then((updated) => {
      if (updated?.id) {
        setGroceryItems(prev => prev.map(item => (item.id === id ? updated : item)))
      }
    }).catch(() => {})
  }

  const handleDeleteGroceryItem = (id) => {
    if (!token) return
    deleteGroceryItem(token, id).then((res) => {
      if (res?.ok) {
        setGroceryItems(prev => prev.filter(item => item.id !== id))
      }
    }).catch(() => {})
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
    if (!token) return
    saveMealPlan(token, mealPlan).then((res) => {
      if (res?.ok) alert('Meal plan saved!')
    }).catch(() => {})
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