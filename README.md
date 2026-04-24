# AWC Group App

Field operations PWA for **A Wilkinson Company Ltd** — a UK-based parent company with four service divisions:

- **Pest Control** (AWPC)
- **Fire Safety** (AWFS)
- **Hygiene Services** (AWHS)
- **Locksmith** (AWL)

One app, one shared client database, four themed divisions.

## Stack

- **React 18 + Vite 6 + Tailwind 3**
- **Supabase** (Auth, Postgres, Edge Functions, Realtime, Storage) — project ref `ssnzebudcbrtpiwilroo`
- **Cloudflare Pages** hosting (static build)
- **Resend** for transactional email
- **Lucide** icons, **Sonner** toasts, **cmdk** command palette, **Leaflet** maps, **Recharts** charts
- PWA via `vite-plugin-pwa`

See [AWC_APP_SPEC.md](./AWC_APP_SPEC.md) for the full build blueprint and [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for the design language.

## Local development

Requirements: **Node 20+** (see `.nvmrc`).

```bash
npm install
cp .env.example .env.local
# Fill in the two VITE_* values from the Supabase dashboard

npm run dev     # starts http://localhost:5173
npm run build   # produces /dist for deploy
npm run preview # serves the production build locally
```

### Environment variables

Only `VITE_*` variables are bundled into the client. Server-side secrets (service role key, Resend API key) live in the **Supabase dashboard** (Project Settings → Edge Functions → Secrets), never in this repo.

```
VITE_SUPABASE_URL=https://ssnzebudcbrtpiwilroo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_APP_NAME=AWC Group
VITE_SUPPORT_EMAIL=support@awcgroup.uk
```

## Deployment — Cloudflare Pages

1. Push to `github.com/shaun622/awcgroup.git` (branch `main` = production).
2. In the Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Pick the `awcgroup` repo, production branch `main`.
4. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/`
   - **Node version:** `20` (set via `NODE_VERSION` env var, or it'll pick up `.nvmrc`)
5. Add environment variables (both **Production** and **Preview**):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_NAME`
   - `VITE_SUPPORT_EMAIL`
6. Save & deploy. First build ≈ 2 min.
7. Add your custom domain under **Pages → Custom domains** (e.g. `app.awcgroup.uk`).
8. **Important:** `public/_redirects` handles SPA fallback — do not delete.

### After first deploy

In the Supabase dashboard:

- Add the production domain to **Auth → URL Configuration → Site URL** and to **Additional Redirect URLs**
- Set edge-function secrets via CLI or dashboard:
  ```
  supabase secrets set RESEND_API_KEY=re_... RESEND_FROM_EMAIL=noreply@awcgroup.uk
  ```

## Project structure

```
src/
  components/
    layout/    AppShell, Header, BottomNav, DesktopNav, DivisionSwitcher,
               CommandPalette, PageWrapper, ThemeToggle, ProtectedRoute
    ui/        Button, Card, Input, Modal, Badge, Skeleton, EmptyState,
               Avatar, DivisionChip, StatCard
  contexts/    Auth, Business, Division, Theme
  hooks/       useHotkeys, useHaptic
  lib/         supabase, utils (UK formatters), divisionRegistry
  pages/       Dashboard, Schedule, Clients, Jobs, Quotes, Analytics,
               Settings, Login, Signup, NotFound
  styles/      index.css (Tailwind + theme CSS variables + dark mode)
```

## Division theming

Each division has its own colour palette (pest green / fire red / hygiene cyan / locksmith amber). The active division drives the `brand-*` Tailwind tokens via CSS variables on `<html class="theme-pest">`.

Switching divisions is instant and animated — see [DivisionSwitcher.jsx](src/components/layout/DivisionSwitcher.jsx) and [globals.css](src/styles/index.css).

## Keyboard shortcuts

- `⌘K` / `Ctrl+K` — command palette (switch division, navigate, change theme)
- `Esc` — close modals / palette

## License

Private. All rights reserved.
