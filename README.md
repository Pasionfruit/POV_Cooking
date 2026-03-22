# POV_Cooking

## Backend DB Setup (PostgreSQL)

1. Create a Postgres database (example name: `pov_cooking`).
2. Copy `backend/.env.example` to `backend/.env` and fill in DB credentials.
3. Install backend dependencies:

```bash
cd backend
npm install
```

4. Start the backend:

```bash
npm run dev
```

The backend accepts either:

- `DATABASE_URL` (recommended), or
- `PGHOST` + `PGPORT` + `PGUSER` + `PGPASSWORD` + `PGDATABASE`

To run API without a DB for demos, set `SKIP_DB=true` in `backend/.env`.

