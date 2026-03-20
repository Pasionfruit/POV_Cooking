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

-- Additional dummy pantry data for testing
INSERT INTO pantry_items (user_id, name, category, expiration_date, quantity, unit, unit_system, location, notes)
VALUES
  ((SELECT id FROM users WHERE username = 'alice'), 'Cheddar Cheese', 'Dairy', CURRENT_DATE + INTERVAL '14 days', 0.5, 'kg', 'metric', 'Fridge', 'Aged'),
  ((SELECT id FROM users WHERE username = 'alice'), 'Spinach', 'Vegetables', CURRENT_DATE + INTERVAL '5 days', 1, 'bunch', 'metric', 'Fridge', 'Baby spinach'),
  ((SELECT id FROM users WHERE username = 'alice'), 'Olive Oil', 'Fats and Oils', NULL, 1, 'L', 'metric', 'Pantry', 'Extra virgin'),
  ((SELECT id FROM users WHERE username = 'alice'), 'Apples', 'Fruits', CURRENT_DATE + INTERVAL '10 days', 6, 'pcs', 'metric', 'Pantry', 'Sweet apples'),
  ((SELECT id FROM users WHERE username = 'alice'), 'Ground Beef', 'Protein', CURRENT_DATE - INTERVAL '1 day', 1, 'kg', 'metric', 'Freezer', 'Expired soon'),
  ((SELECT id FROM users WHERE username = 'alice'), 'Salmon', 'Protein', CURRENT_DATE + INTERVAL '20 days', 2, 'pcs', 'metric', 'Freezer', 'Frozen stock');
