# Deployment

This app deploys to Vercel. The Vite frontend and the Edge Function backend
are both served from the same Vercel project — no separate server needed.

---

## Environment variables

### Vercel (production)

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Used by `api/analyze.js`. Never expose to the browser. |
| `VITE_SUPABASE_URL` | Supabase project URL — enables auth + history sync |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key — safe to expose (RLS enforces access) |

Do **not** set `VITE_ANTHROPIC_API_KEY` in Vercel — its absence is what activates the proxy automatically.

### Local dev (`.env`)

```
VITE_ANTHROPIC_API_KEY=sk-ant-...       # direct browser → Anthropic (local only)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Copy `.env.example` to `.env` and fill in your values.

---

## Step-by-step Vercel setup

### 1. Create a Vercel account

- Go to [vercel.com](https://vercel.com) → **Sign Up** → **Continue with GitHub**

### 2. Import the project

- Dashboard → **Add New… → Project** → find **options-advisor** → **Import**

### 3. Check build settings

Vercel auto-detects Vite. Confirm:

```
Framework Preset:  Vite
Build Command:     npm run build
Output Directory:  dist
```

### 4. Add environment variables

Under **Environment Variables**, add:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` |
| `VITE_SUPABASE_URL` | `https://yourproject.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` |

### 5. Deploy

Click **Deploy**. Vercel builds and deploys in ~60 seconds.

### 6. Future deploys

Every `git push` to `main` triggers a redeploy automatically.

---

## Supabase setup

### Create a project

- Go to [supabase.com](https://supabase.com) → **New project**
- Note your **Project URL** and **anon public** key from Settings → API

### Configure auth

In the Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL**: set to your Vercel deployment URL (e.g. `https://options-advisor-sepia.vercel.app`)
- **Redirect URLs**: add both your Vercel URL and `http://localhost:3000` (for local dev)

For Google OAuth:
- Authentication → Providers → Google → enable and add your OAuth credentials
- Add the Supabase callback URL to your Google Cloud OAuth app's authorized redirect URIs

### Database

The app needs an `analyses` table for history sync. Run this in the Supabase SQL editor:

```sql
create table analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  ticker text not null,
  strategy text,
  strategy_type text,
  entry_price text,
  expiry text,
  result jsonb,
  created_at timestamptz default now()
);

alter table analyses enable row level security;

create policy "Users can manage their own analyses"
  on analyses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## Verifying the proxy

After deploying, open DevTools → Network → make a request.
You should see a call to `/api/analyze`, not `api.anthropic.com`.
No `x-api-key` should appear in any request headers from the browser.

---

## Custom domain (optional)

Vercel dashboard → your project → **Settings → Domains** → add your domain.
HTTPS is provisioned automatically. Remember to add the new domain to your
Supabase redirect URL allow-list.
