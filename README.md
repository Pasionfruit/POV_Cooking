# POV Cooking

A personal recipe cookbook for desktop and mobile. Recipes are stored as
semi-structured JSON documents, ready to move into MongoDB (or any document
store) later.

## Features

- **Home** — a featured "latest recipe attempt" (pinned by the admin) above the
  full list; filter by text, cuisine, total time, or saved-only; paginated
  6 per page on phones, 12 on desktop
- **Recipe pages** — checkable ingredients/steps (remembered per device), a dial
  kitchen timer (drag to set minutes and seconds, prep/cook presets), tags, notes, source
- **Saved** — logged-in users can save/unsave recipes
- **Meal Plan** — plan recipes per day, week by week, with a spinning-wheel
  randomizer for ideas
- **Login** — email + password (emails stored encrypted, passwords bcrypt-hashed) or Google Sign-In
- **Light/dark mode** — follows your system by default, toggle in the navbar
- **Admin** — create, edit (form or raw JSON), and delete recipes; pick which
  recipe shows as the latest attempt on the home page
- **Import** — upload or paste recipe JSON (single object, array, or `{ "recipes": [...] }`)
- **Input standardization** — on create/edit/import, titles, ingredients, steps,
  descriptions, and notes get their first word capitalized and quantity words
  become digits ("two cups flour" becomes "2 cups flour")

## Run it

Backend (API on port **5001**):

```bash
cd backend
npm install
npm run dev
```

Frontend (Vite dev server on port 5173):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. To use it from your phone, join the same Wi-Fi and
open `http://<your-computer-ip>:5173` (Vite prints the address; the frontend
automatically talks to the API on the same host).

## Accounts & admin

Two demo accounts are created automatically the first time the server starts:

| Role  | Email                  | Password    |
| ----- | ---------------------- | ----------- |
| User  | `demo@povcooking.com`  | `demo1234`  |
| Admin | `admin@povcooking.com` | `admin1234` |

- Or create your own account on the Login page. To become an **admin**, expand
  "Have an admin code?" and enter the code from `backend/.env`
  (`ADMIN_CODE`, default `admin-secret`).
- `ADMIN_EMAILS` in `backend/.env` makes specific emails admins automatically
  (works for Google sign-in too).

### Google Sign-In (optional)

1. Create an OAuth **Web application** client ID at
   https://console.cloud.google.com/apis/credentials with
   `http://localhost:5173` as an authorized JavaScript origin.
2. Put it in `backend/.env` as `GOOGLE_CLIENT_ID=...`
3. Put the same value in `frontend/.env` as `VITE_GOOGLE_CLIENT_ID=...`

Without it, email/password login still works and the Google button is hidden.

## Configuration

Copy `backend/.env.example` to `backend/.env`. Everything has a dev default;
for real use set `JWT_SECRET` and a 64-char hex `ENCRYPTION_KEY`
(usernames/emails are encrypted at rest with AES-256-GCM and looked up via an
HMAC blind index).

## Data & the MongoDB plan

All data lives in JSON files under `backend/data/`:

- `recipes.json` — the cookbook (seeded with 3 recipes; committed to git)
- `users.json`, `saved.json`, `mealplans.json`, `settings.json` — created at
  runtime, gitignored

[backend/store.js](backend/store.js) is the only module that touches storage.
To switch to MongoDB, reimplement its small collection interface
(`all/find/filter/findById/insert/update/remove`) on top of a Mongo collection —
recipe documents map 1:1.

## Recipe JSON shape

Only `title` is required; unknown fields are preserved (semi-structured).

```json
{
  "title": "Garlic Bread",
  "description": "…",
  "servings": 4,
  "prepTimeMinutes": 10,
  "cookTimeMinutes": 15,
  "cuisine": "Italian",
  "tags": ["side"],
  "ingredients": ["1 baguette", { "item": "butter", "quantity": 50, "unit": "g" }],
  "steps": ["…"],
  "notes": "…",
  "source": { "name": "…", "url": "…" }
}
```

Ingredients may be plain strings or `{ item, quantity, unit, note }` objects —
the UI renders both.

## Testing

No automated test suite yet. Quick manual check:

```bash
cd backend && npm run dev
curl http://localhost:5001/health          # {"ok":true}
curl http://localhost:5001/recipes         # seed recipes
```

Then exercise the UI: register (with and without the admin code), save a
recipe, and import one from the Admin page.
