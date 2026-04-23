# Deploying AWC App to Cloudflare Pages

End-to-end steps to get the app live at e.g. `app.awcgroup.co.uk`. Expect
≈10 minutes the first time; after that, every `git push` auto-deploys.

## 1 · Connect the repo

1. [Cloudflare dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Pick `shaun622/awcgroup`; production branch `main`
3. **Framework preset:** `None` (we don't need the Vite preset — it guesses `npm run build` + `dist` which is what we want anyway)
4. **Build settings:**

   | field | value |
   |---|---|
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | *(blank)* |

## 2 · Environment variables

In the new project → **Settings → Environment variables**, add these to **Production** and **Preview**:

| name | value |
|---|---|
| `NODE_VERSION` | `20` |
| `VITE_SUPABASE_URL` | `https://ssnzebudcbrtpiwilroo.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the anon JWT from Supabase → Settings → API |
| `VITE_APP_NAME` | `AWC Group` |
| `VITE_SUPPORT_EMAIL` | `support@awcgroup.co.uk` |

**Do not** paste the service role key or the Resend key here — those are
server-side only and live in the Supabase dashboard. See [§4](#4--edge-function-secrets).

Click **Save and deploy**. First build takes ~2 min.

## 3 · Custom domain

Project → **Custom domains** → **Set up a custom domain** → e.g.
`app.awcgroup.co.uk`. If the domain's DNS is already on Cloudflare (it
is, since you bought awcgroup.co.uk there), Cloudflare sets up the CNAME
for you automatically. Otherwise add the CNAME in your DNS provider.

After the domain shows *Active*, go to **Supabase dashboard → Authentication → URL Configuration**:

- **Site URL:** `https://app.awcgroup.co.uk`
- **Additional Redirect URLs:** `https://app.awcgroup.co.uk/**`

Without this step, email confirmation + password reset links still point
at the preview `*.pages.dev` URL.

## 4 · Edge function secrets

One-off setup for email-sending functions. Requires the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
supabase login
supabase link --project-ref ssnzebudcbrtpiwilroo

supabase secrets set \
  RESEND_API_KEY="re_..." \
  RESEND_FROM_EMAIL="noreply@awcgroup.co.uk" \
  APP_URL="https://app.awcgroup.co.uk"

supabase functions deploy send-quote
supabase functions deploy complete-job-report
```

Before Resend will send from `@awcgroup.co.uk`, verify the domain at
[resend.com/domains](https://resend.com/domains) and paste the DNS
records into Cloudflare. Until verified, set
`RESEND_FROM_EMAIL=onboarding@resend.dev` for testing.

## 5 · Ongoing

- Every push to `main` triggers a production build
- Every push to any other branch (or every PR) creates a preview URL
- Rollback with one click from **Pages → Deployments**

## 6 · Running database migrations

Not automated yet. When a new SQL file lands in `supabase/migrations/`:

```bash
# From the project root, with DATABASE_URL set in .env.local
npm run migrate
```

`scripts/migrate.js` tracks applied migrations in the `_migrations` table
on the remote DB, so re-running is a no-op until there's something new.
