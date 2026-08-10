# Deploying POV Cooking for free

Three free accounts, about 40 minutes, no credit card:

| Piece    | Host               | Free tier                                    |
| -------- | ------------------ | -------------------------------------------- |
| Database | MongoDB Atlas `M0` | 512 MB, free forever                          |
| API      | Render Web Service | 750 instance-hours/month, sleeps when idle    |
| Frontend | Vercel             | Static hosting, always on, HTTPS included     |

**Why a database at all?** Free hosts give you an ephemeral filesystem — every
deploy and every restart wipes it. The app writes JSON files locally, so on a
free host all your recipes, accounts, and pantry would disappear overnight.
Setting `MONGODB_URI` switches the same storage layer over to Atlas; nothing
else in the app changes.

**Why HTTPS matters here.** Installing the PWA and using the barcode scanner's
camera both require a secure context. Both hosts give you HTTPS by default, so
after this the phone features finally work — they can't over `http://192.168.x.x`.

---

## Step 1 — Database (MongoDB Atlas)

1. Sign up at <https://www.mongodb.com/cloud/atlas/register>.
2. **Create a cluster** → choose **M0 Free** → pick the region nearest you → Create.
3. **Database Access** → *Add New Database User*
   - Username: `pov-cooking`
   - Password: *Autogenerate* and **copy it now**.
   - Role: *Read and write to any database*.
4. **Network Access** → *Add IP Address* → **Allow access from anywhere**
   (`0.0.0.0/0`). Render's free tier has no fixed outbound IP, so an allowlist
   isn't an option. The database user's password is what protects the data.
5. **Clusters → Connect → Drivers** and copy the connection string. It looks like:

   ```
   mongodb+srv://pov-cooking:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```

   Replace `<password>` with the real password. If it contains `@ : / ? # [ ] %`,
   URL-encode those characters or regenerate a password without them.

Keep this string for Step 2. **Don't commit it.**

---

## Step 2 — API (Render)

1. Push this repo to GitHub if it isn't already.
2. Sign up at <https://render.com> with GitHub.
3. **New → Web Service** → pick the repo. Settings:

   | Field           | Value            |
   | --------------- | ---------------- |
   | Root Directory  | `backend`        |
   | Runtime         | Node             |
   | Build Command   | `npm install`    |
   | Start Command   | `npm start`      |
   | Instance Type   | **Free**         |
   | Health Check Path | `/health`      |

4. Add environment variables. Generate the two secrets locally first:

   ```bash
   node -e "console.log('JWT_SECRET     =', require('crypto').randomBytes(48).toString('base64url'))"
   node -e "console.log('ENCRYPTION_KEY =', require('crypto').randomBytes(32).toString('hex'))"
   ```

   | Key              | Value                                              |
   | ---------------- | -------------------------------------------------- |
   | `NODE_ENV`       | `production`                                        |
   | `JWT_SECRET`     | the generated value                                 |
   | `ENCRYPTION_KEY` | the generated 64-char hex value                     |
   | `MONGODB_URI`    | the string from Step 1                              |
   | `MONGODB_DB`     | `pov_cooking`                                       |
   | `ADMIN_EMAILS`   | the email you'll sign in with                       |
   | `ADMIN_CODE`     | any private string                                  |
   | `CORS_ORIGIN`    | leave blank for now — you'll fill it in in Step 4   |

   Don't set `PORT`; Render provides it.

5. Deploy. The logs should end with:

   ```
   Store: mongodb (pov_cooking)
   Seeded fresh database from repo data: recipes(3)
   POV Cooking API running on port 10000
   ```

6. Check it: `https://<your-service>.onrender.com/health` → `{"ok":true}`.

> ⚠️ **Never change `ENCRYPTION_KEY` once real accounts exist.** Emails are
> encrypted with it and looked up by an HMAC of it. Rotating it makes every
> existing account unreachable — nobody can log in, including you.

> With `NODE_ENV=production` the server refuses to boot without `JWT_SECRET` and
> `ENCRYPTION_KEY`, and it stops seeding the `demo@povcooking.com` account.
> Published demo credentials would be an open door.

---

## Step 3 — Frontend (Vercel)

1. Sign up at <https://vercel.com> with GitHub.
2. **Add New → Project** → pick the repo. Settings:

   | Field            | Value      |
   | ---------------- | ---------- |
   | Framework Preset | Vite       |
   | Root Directory   | `frontend` |

   Build command and output directory are detected automatically.
   `frontend/vercel.json` is already in the repo — it routes deep links like
   `/pantry` back to the app instead of 404ing, and stops the service worker
   from being cached, so updates actually reach installed phones.

3. Add environment variables:

   | Key                     | Value                                 |
   | ----------------------- | ------------------------------------- |
   | `VITE_API_URL`          | `https://<your-service>.onrender.com` |
   | `VITE_GOOGLE_CLIENT_ID` | leave blank until Step 5              |

   No trailing slash on the API URL. Vite inlines `VITE_*` variables **at build
   time**, so changing one requires a redeploy, not just a restart.

4. Deploy, and note your URL: `https://<project>.vercel.app`.

---

## Step 4 — Point them at each other

Back in Render, set `CORS_ORIGIN` to your exact Vercel URL and save:

```
CORS_ORIGIN=https://<project>.vercel.app
```

Comma-separate to add more (e.g. `,http://localhost:5173` while developing).
No trailing slashes. Render redeploys automatically.

Until this is set the API accepts any origin, and the startup log warns about it.

---

## Step 5 — Google Sign-In

1. <https://console.cloud.google.com> → create a project (e.g. *POV Cooking*).
2. **APIs & Services → OAuth consent screen**
   - User type **External** → fill in app name, your email → Save.
   - Scopes: the defaults (`openid`, `email`, `profile`) are all this needs.
   - **Publish app**. Leaving it in *Testing* means only accounts you add as
     test users can sign in, and their sessions expire after 7 days. These
     three scopes don't require Google's verification review.
3. **Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins** — add both:
     - `https://<project>.vercel.app`
     - `http://localhost:5173`
   - Leave *Authorized redirect URIs* empty. The app uses Google Identity
     Services' ID-token flow, which validates the origin, not a redirect.
4. Copy the client ID (`...apps.googleusercontent.com`) into **both** places:
   - Render → `GOOGLE_CLIENT_ID`
   - Vercel → `VITE_GOOGLE_CLIENT_ID`, then **redeploy** the frontend.

The Google button only renders when `VITE_GOOGLE_CLIENT_ID` is set; otherwise
the page quietly shows email sign-in alone.

---

## Step 6 — Make yourself admin

Sign in with the email you put in `ADMIN_EMAILS`. That list is re-checked on
every sign-in, so it works whether you set it before or after your first login —
the server logs `Promoting <you> to admin`. An **Admin** link appears in the nav.

If you'd rather not use the email list, register with the **Have an admin code?**
field on the sign-up page and enter your `ADMIN_CODE`.

---

## Step 7 — Verify

**Desktop**

- [ ] Home lists recipes (first load may take ~50s — see cold starts below)
- [ ] Create an account, then sign out and back in
- [ ] Google button appears and signs you in
- [ ] Save a recipe, plan a meal, add a pantry item
- [ ] Reload — everything is still there
- [ ] Open `https://<project>.vercel.app/pantry` directly — it loads, doesn't 404
- [ ] DevTools → Application → Manifest: no errors, icon shows
- [ ] DevTools → Application → Service Workers: "activated and running"
- [ ] Install icon appears in the address bar; installed window has no browser chrome

**Phone**

- [ ] iOS: Safari → Share → **Add to Home Screen**
      Android: Chrome → menu → **Install app**
- [ ] Home-screen icon is the chef hat, name reads "POV Cooking"
- [ ] Opens fullscreen with no address bar
- [ ] Pantry → **Scan barcode** → camera opens, a real barcode fills in the form
      *(this is the payoff for HTTPS — it can't work over a LAN IP)*
- [ ] Sign in with Google in the installed app
- [ ] Airplane mode → reopen: the shell loads rather than a browser error page
      *(recipes won't load — see below)*

---

## Living with the free tier

**Cold starts.** Render's free instance sleeps after ~15 minutes idle and takes
about 50 seconds to wake. The first visit of the day shows "Loading recipes…"
for a while. Options: accept it, hit `/health` every 10 minutes from a free
scheduler like <https://cron-job.org> (750 monthly hours ≈ one always-on
service, so this fits), or upgrade that service to Render's cheapest paid tier.

**Offline is the shell only.** The service worker deliberately skips
cross-origin requests, so your API is never cached and you're never shown stale
recipes. Offline you get the app frame and an error where data would be.

**Atlas idle pause.** M0 clusters can be paused after long inactivity; resume
from the Atlas dashboard.

**One instance only.** The storage layer keeps every collection in memory and
writes through to Mongo. That's what lets the whole app stay synchronous, but it
means exactly one server instance — don't scale to two, and don't move the API
to serverless functions, without reworking `backend/store.js` to read through to
Mongo per request.

**Backups.** Atlas M0 has no automatic backups. To snapshot:

```bash
mongodump --uri "<your MONGODB_URI>" --db pov_cooking --out ./backup-$(date +%F)
```

## Updating

Push to your default branch — Render and Vercel both redeploy on push. An
installed PWA picks up the new frontend on its next launch (the service worker
fetches `index.html` from the network first, and `vercel.json` keeps `sw.js`
itself uncached).

## Secrets checklist

Never commit: `MONGODB_URI`, `JWT_SECRET`, `ENCRYPTION_KEY`, `ADMIN_CODE`.
`.env` is gitignored; the two `.env.example` files document every variable.
