# Deployment

This app deploys to Vercel. The Vite frontend and the Edge Function backend
are both served from the same Vercel project — no separate server needed.

---

## Environment variables

| Variable | Where to set it | Purpose |
|---|---|---|
| `VITE_ANTHROPIC_API_KEY` | `.env` only (local) | Enables direct browser → Anthropic calls in local dev. **Never set this in Vercel.** |
| `ANTHROPIC_API_KEY` | Vercel dashboard | Used by `api/analyze.js` in production. Never in code, never in the browser. |

The absence of `VITE_ANTHROPIC_API_KEY` in Vercel is what activates the proxy automatically.

---

## Step-by-step Vercel setup

### 1. Create a Vercel account

- Go to [vercel.com](https://vercel.com)
- Click **Sign Up** → **Continue with GitHub**
- Authorize Vercel to access your GitHub repos

### 2. Import the project

- On the Vercel dashboard, click **Add New… → Project**
- Find **options-advisor** in the list and click **Import**

### 3. Check the build settings

Vercel auto-detects Vite. You should see:

```
Framework Preset:  Vite
Build Command:     npm run build
Output Directory:  dist
```

Leave all of these as-is.

### 4. Add the API key (do this before deploying)

Still on the import screen, scroll down to **Environment Variables** and add:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` (your key) |

Do **not** add `VITE_ANTHROPIC_API_KEY` here — leaving it absent is what
makes the app route through the secure proxy instead of calling Anthropic directly.

### 5. Deploy

- Click **Deploy**
- Vercel builds the app and deploys in ~60 seconds
- You get a URL like `options-advisor.vercel.app`

### 6. Future deploys

Every `git push` to `main` triggers a redeploy automatically. No manual steps.

---

## Verifying the proxy is working

After deploying, open DevTools → Network tab → make a request.
You should see a call to `/api/analyze`, not to `api.anthropic.com`.
The request headers should contain no `x-api-key`. If you see the Anthropic key
anywhere in the network tab, something is misconfigured.

---

## Custom domain (optional)

- Vercel dashboard → your project → **Settings → Domains**
- Add your domain and follow the DNS instructions
- HTTPS is provisioned automatically
