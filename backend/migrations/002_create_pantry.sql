-- SQL migration to create pantry_items table and seed sample data
CREATE TABLE IF NOT EXISTS pantry_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Grains','Vegetables','Fruits','Dairy','Protein','Fats and Oils','Sugars and Sweets')),
  expiration_date DATE,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'pcs',
  unit_system TEXT NOT NULL DEFAULT 'metric' CHECK (unit_system IN ('metric','imperial')),
  location TEXT NOT NULL CHECK (location IN ('Fridge','Freezer','Pantry','Misc')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed sample pantry data (for demo/testing)
INSERT INTO pantry_items (user_id, name, category, expiration_date, quantity, unit, unit_system, location, notes)
VALUES
  ((SELECT id FROM users WHERE username = 'alice'), 'Milk', 'Dairy', CURRENT_DATE + INTERVAL '3 days', 1, 'L', 'metric', 'Fridge', 'Whole milk'),
  ((SELECT id FROM users WHERE username = 'alice'), 'Bread', 'Grains', CURRENT_DATE + INTERVAL '1 day', 2, 'pcs', 'metric', 'Pantry', 'Sliced bread'),
  ((SELECT id FROM users WHERE username = 'admin'), 'Tomatoes', 'Fruits', CURRENT_DATE - INTERVAL '2 days', 5, 'pcs', 'metric', 'Fridge', 'Expired test'),
  ((SELECT id FROM users WHERE username = 'alice'), 'Carrots', 'Vegetables', NULL, 1, 'kg', 'metric', 'Fridge', 'Fresh carrots');
