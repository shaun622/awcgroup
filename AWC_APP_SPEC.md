# AWC Group App — Build Blueprint

**Multi-division field-service PWA for A Wilkinson Company Ltd (AWC Group).**

One unified app, four divisions, one shared client database. Built on the PoolPro/TreePro foundations but **UK-based**, **multi-division**, and **design-elevated**: polished micro-interactions, swipe actions, skeleton loaders, command palette, dark mode — while staying simple, fast, and mobile-perfect.

- **Hosting:** Cloudflare Pages (static, connected to GitHub)
- **Backend:** Supabase (Auth, Postgres, Edge Functions, Realtime, Storage)
- **Frontend:** React 18 + Vite + Tailwind CSS + Lucide icons
- **Domain:** TBD (Cloudflare DNS)
- **Git:** https://github.com/shaun622/awcgroup.git
- **Supabase project ref:** `ssnzebudcbrtpiwilroo`
- **Email:** Resend

---

## 0. THE BIG IDEA (read this first)

AWC Group owns four service divisions: **Pest Control (AWPC)**, **Fire Safety (AWFS)**, **Hygiene Services (AWHS)**, **Locksmith (AWL)**. They share clients, staff, invoicing, calendar, and brand parent. They differ in job types, equipment, assessment forms, terminology, and colour.

The app is built around one pattern: the **division switcher**. A segmented control at the top of the shell swaps the active division. When a division is active:

- Brand accent colour swaps via CSS variables (instant, smooth)
- All lists (jobs, quotes, premises, reports) filter to that division
- "New job / new quote" forms show division-specific templates, equipment, tasks
- Header label + division icon update
- URL adds `?division=pest` for deep-linkability

There is also a **"Group" view** — the owner sees all divisions aggregated. KPIs roll up. Activity feed shows everything. Clients show jobs across all divisions on one profile.

**Clients live at Group level.** One customer can be a pest control client AND a fire safety client. Their ClientDetail page shows quotes and jobs across all divisions, division-tagged.

**Staff can be multi-division** (an admin/office user) or **single-division** (a pest tech). Division assignment gates what they see in the Tech role view.

**Divisions activate incrementally.** Pest is live first, Fire just activated, Hygiene and Locksmith come later. The `divisions` table has an `active` flag per business. Inactive divisions are hidden from the switcher.

---

## 1. VISION & DESIGN PHILOSOPHY

**Feel:** Apple-grade polish on a field-service app. Notion-level keyboard shortcuts. Linear-level performance. Stripe-level empty states. The bar is premium SaaS, not "good enough for a trades business".

**Principles:**

1. **Mobile is primary.** The tech in a van uses this one-handed. Desktop is for the office. Every interaction works on thumb reach, with 44px minimum tap targets, 16px inputs (no iOS zoom), and bottom-sheet modals.
2. **Calm by default.** White-on-slate background, single accent colour per division, no gradients except on primary CTAs. Nothing competing for attention.
3. **Fast everywhere.** <120KB initial JS. Skeleton loaders, not spinners. Optimistic updates. Offline-ready shell.
4. **Delight in details.** Count-up stats. Subtle haptic feedback on mobile. Number-scroll on invoice totals. Confetti on quote acceptance. Micro-copy that reads like a human wrote it.
5. **Keyboard-first on desktop.** `⌘K` command palette. `⌘N` new quote. `G J` go to jobs. Power users never touch the mouse.
6. **Accessible.** WCAG AA contrast. Full keyboard nav. Screen-reader labels on every interactive element. Respects `prefers-reduced-motion`.
7. **Division-aware but not cluttered.** Colour cue is the division. Terminology adapts. Never show "select a division" dialogs — always a default active.

**What we're NOT doing:** dashboards with 20 charts, AI assistants, full CRM pipelines beyond the basics, chat, video calls, inventory warehousing. Stay focused.

---

## 2. BRAND SYSTEM

### AWC Group (parent)

Used in settings, login, onboarding, Group view, invoice letterhead.

```js
awc: {
  50:  '#f5f7fa',
  100: '#e4e9f0',
  200: '#cbd4e0',
  300: '#a4b3c6',
  400: '#7589a4',
  500: '#556a87',
  600: '#43556e',
  700: '#37455a',
  800: '#2f3a4b',
  900: '#1e2836',      // primary — deep graphite, professional
  950: '#111722',
}
```

Graphite/navy — trustworthy, professional, multi-division neutral. The parent brand.

### Division palettes

Each division gets a full 50–950 scale. Active division = CSS variables (`--brand-50` ... `--brand-950`, `--brand-gradient`) are rewritten. All components use `var(--brand-500)` etc. — never hardcoded hex.

```js
// Pest Control — forest green (safe, professional, nature-adjacent)
pest: {
  50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
  400: '#4ade80', 500: '#16a34a', 600: '#15803d', 700: '#166534',
  800: '#14532d', 900: '#0f3d24', 950: '#052e16',
}

// Fire Safety — signal red (urgency, safety, regulation)
fire: {
  50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
  400: '#f87171', 500: '#dc2626', 600: '#b91c1c', 700: '#991b1b',
  800: '#7f1d1d', 900: '#641212', 950: '#3f0a0a',
}

// Hygiene Services — medical cyan (cleanliness, clinical)
hygiene: {
  50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
  400: '#22d3ee', 500: '#0891b2', 600: '#0e7490', 700: '#155e75',
  800: '#164e63', 900: '#134050', 950: '#082f3b',
}

// Locksmith — amber gold (security, craft, trust)
locksmith: {
  50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
  400: '#fbbf24', 500: '#d97706', 600: '#b45309', 700: '#92400e',
  800: '#78350f', 900: '#5a2a0c', 950: '#361907',
}
```

**Division icons** (Lucide): `Bug` (pest), `Flame` (fire), `SprayCan` (hygiene), `KeyRound` (locksmith), `Building2` (Group).

### Neutrals, semantics — inherit from Tailwind

Same as PoolPro/TreePro rules (don't override): `slate-50` body, `gray-900` text, `emerald/amber/red/brand-50-700` for semantics. App background is always `bg-slate-50` (light) or `bg-gray-950` (dark).

### Typography

- **Inter Variable** (via `@fontsource-variable/inter`) — UI text, 14/16/18
- **Inter Display** optional for large headings (dashboard numbers)
- **JetBrains Mono** for numeric tabular data (invoice totals, IDs) — monospace nums align in columns

Font features: `font-variant-numeric: tabular-nums` on numbers. `font-feature-settings: 'cv11', 'ss01'` for Inter's improved glyph variants.

### Iconography

**Lucide React** (`lucide-react`). Cleaner, larger library than Heroicons, consistent 1.5-stroke line style. Size: 16px inline, 20px buttons, 24px headers, 32–40px empty states.

### Spacing, radii, shadows

Mostly the same as PoolPro/TreePro (`rounded-xl` buttons, `rounded-2xl` cards, `shadow-card/hover/elevated`). Additions:

```js
boxShadow: {
  'card':       '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.03)',
  'card-hover': '0 4px 12px 0 rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04)',
  'elevated':   '0 8px 24px -4px rgba(0,0,0,0.08), 0 4px 8px -4px rgba(0,0,0,0.04)',
  'nav':        '0 -1px 12px 0 rgba(0,0,0,0.06)',
  'inner-soft': 'inset 0 2px 4px 0 rgba(0,0,0,0.04)',
  'glow':       '0 0 20px rgba(var(--brand-500-rgb), 0.15)',     // division-aware
  'glow-lg':    '0 0 40px rgba(var(--brand-500-rgb), 0.20)',
  'ring-focus': '0 0 0 3px rgba(var(--brand-500-rgb), 0.25)',
  'soft-lift':  '0 10px 30px -10px rgba(0,0,0,0.12)',            // NEW: for elevated cards
  'pressed':    'inset 0 1px 2px 0 rgba(0,0,0,0.06)',            // NEW: active button state
}
```

### Dark mode

Off by default, toggleable in Settings. Uses Tailwind `dark:` variants. Divisions keep their identity; neutrals flip (`slate-50` → `gray-950`, `gray-900` → `gray-50`, cards become `gray-900` with `gray-800` borders).

Implementation: `<html class="dark">` attribute, persisted to `localStorage`, initial read before React mount to prevent FOUC.

---

## 3. TECH STACK

### package.json

```json
{
  "name": "awc-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.47.0",
    "@fontsource-variable/inter": "^5.1.0",
    "@fontsource-variable/jetbrains-mono": "^5.1.0",
    "clsx": "^2.1.1",
    "cmdk": "^1.0.4",
    "date-fns": "^4.1.0",
    "leaflet": "^1.9.4",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-leaflet": "^4.2.1",
    "react-router-dom": "^6.28.0",
    "recharts": "^2.13.0",
    "sonner": "^1.7.0",
    "tailwind-merge": "^2.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.16.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "vite": "^6.0.0",
    "vite-plugin-pwa": "^0.21.0"
  }
}
```

**Why these additions over TreePro:**
- `cmdk` — command palette (⌘K) on desktop
- `lucide-react` — cleaner icons than Heroicons
- `sonner` — toast notifications (undo, actions, stacking)
- `@fontsource-variable/*` — self-hosted variable fonts, no network round-trip
- `tailwind-merge` — already implied but listing explicitly
- No `sharp` (server-side image resizing — use Supabase's built-in image transforms instead)
- No `serve` (Cloudflare Pages serves static `dist`)

### vite.config.js

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'AWC Group',
        short_name: 'AWC',
        description: 'Field operations for A Wilkinson Company',
        theme_color: '#1e2836',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'pages', expiration: { maxEntries: 10, maxAgeSeconds: 300 } },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase', expiration: { maxEntries: 100, maxAgeSeconds: 86400 } },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'recharts': ['recharts'],
          'supabase': ['@supabase/supabase-js'],
          'leaflet': ['leaflet', 'react-leaflet'],
          'cmdk': ['cmdk'],
        },
      },
    },
  },
  server: { host: true, port: 5173 },
})
```

### tailwind.config.js

```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Division palettes — each has full scale (see §2)
        awc:       { /* graphite/navy */ },
        pest:      { /* green */ },
        fire:      { /* red */ },
        hygiene:   { /* cyan */ },
        locksmith: { /* amber */ },

        // `brand` is the ACTIVE division — set via CSS variables
        brand: {
          50:  'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
          950: 'rgb(var(--brand-950) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      minHeight: { tap: '44px' },
      minWidth:  { tap: '44px' },
      boxShadow: { /* see §2 */ },
      backgroundImage: {
        'gradient-brand':       'linear-gradient(135deg, rgb(var(--brand-500)) 0%, rgb(var(--brand-700)) 100%)',
        'gradient-brand-soft':  'linear-gradient(135deg, rgb(var(--brand-100)) 0%, rgb(var(--brand-50)) 100%)',
        'gradient-success':     'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'gradient-danger':      'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        'gradient-warm':        'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'gradient-page':        'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
        'gradient-shimmer':     'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.25rem' },
      animation: {
        'fade-in':        'fadeIn 0.25s ease-out',
        'slide-up':       'slideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-down':     'slideDown 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-in':       'scaleIn 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'shimmer':        'shimmer 1.8s ease-in-out infinite',
        'count-up':       'countUp 0.6s ease-out',
        'pop':            'pop 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        fadeIn:       { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:      { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideDown:    { '0%': { opacity: '0', transform: 'translateY(-12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:      { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        slideInRight: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        shimmer:      { '0%, 100%': { backgroundPosition: '-200% 0' }, '50%': { backgroundPosition: '200% 0' } },
        countUp:      { '0%': { transform: 'translateY(6px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        pop:          { '0%': { transform: 'scale(0.95)' }, '50%': { transform: 'scale(1.05)' }, '100%': { transform: 'scale(1)' } },
      },
      transitionTimingFunction: {
        'out-expo':  'cubic-bezier(0.22, 1, 0.36, 1)',   // preferred for pages/modals
        'in-out-soft': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
```

### src/styles/index.css (globals)

```css
@import '@fontsource-variable/inter';
@import '@fontsource-variable/jetbrains-mono';

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ============ Division CSS variables (dynamically swapped) ============ */
:root {
  /* Pest (default on first load) — values are raw RGB, used as `rgb(var(--brand-500))` */
  --brand-50:  240 253 244;
  --brand-100: 220 252 231;
  --brand-200: 187 247 208;
  --brand-300: 134 239 172;
  --brand-400: 74 222 128;
  --brand-500: 22 163 74;
  --brand-600: 21 128 61;
  --brand-700: 22 101 52;
  --brand-800: 20 83 45;
  --brand-900: 15 61 36;
  --brand-950: 5 46 22;
  --brand-500-rgb: 22, 163, 74;  /* convenience for rgba() in shadow utilities */
}

.theme-pest      { /* same as root default */ }
.theme-fire      { --brand-500: 220 38 38; --brand-600: 185 28 28; /* etc. */ }
.theme-hygiene   { --brand-500: 8 145 178; /* etc. */ }
.theme-locksmith { --brand-500: 217 119 6; /* etc. */ }
.theme-awc       { --brand-500: 85 106 135; /* etc. — Group view */ }

/* All variables transition when class changes */
html { transition: background-color 0.35s var(--ease-out-expo, ease-out); }

@layer base {
  html { -webkit-tap-highlight-color: transparent; }
  html, body { overscroll-behavior: none; }
  body {
    @apply bg-slate-50 text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100;
    padding-bottom: env(safe-area-inset-bottom, 0px);
    font-feature-settings: 'cv11', 'ss01';
    font-variant-numeric: tabular-nums;
  }

  /* Kill iOS input zoom, kill native number arrows */
  input[type="number"] { -moz-appearance: textfield; }
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

  * { scroll-behavior: smooth; }
  ::selection { @apply bg-brand-200 text-brand-900; }

  /* Leaflet z-index containment (hard-won from PoolPro) */
  .leaflet-container { isolation: isolate; }

  /* Reduced-motion respect */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
}

@layer components {
  .btn {
    @apply inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200
           min-h-tap min-w-tap px-5 py-3 text-sm tracking-wide
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2
           disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
           active:scale-[0.98];
  }
  .btn-primary   { @apply btn bg-gradient-brand text-white shadow-md shadow-brand-500/20
                          hover:shadow-lg hover:shadow-brand-500/30 hover:brightness-110 active:shadow-pressed; }
  .btn-secondary { @apply btn bg-white text-gray-700 border border-gray-200 shadow-card
                          hover:bg-gray-50 hover:border-gray-300 hover:shadow-card-hover active:bg-gray-100
                          dark:bg-gray-900 dark:text-gray-100 dark:border-gray-800 dark:hover:bg-gray-800; }
  .btn-danger    { @apply btn bg-gradient-danger text-white shadow-md shadow-red-500/20
                          hover:shadow-lg hover:shadow-red-500/30 hover:brightness-110; }
  .btn-ghost     { @apply btn text-gray-600 hover:bg-gray-100/80 hover:text-gray-900
                          dark:text-gray-400 dark:hover:bg-gray-800/80 dark:hover:text-gray-100; }

  .input {
    @apply w-full rounded-xl border border-gray-200 bg-white px-4 py-3
           min-h-tap shadow-inner-soft
           placeholder:text-gray-400
           focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400
           disabled:bg-gray-50 disabled:cursor-not-allowed
           transition-all duration-200
           dark:bg-gray-900 dark:border-gray-800 dark:placeholder:text-gray-500;
    font-size: 16px; /* iOS zoom prevention */
  }
  .input-lg { @apply input text-2xl font-semibold text-center py-4 tracking-tight; }

  .card {
    @apply bg-white rounded-2xl border border-gray-100 p-4 shadow-card
           transition-all duration-200
           dark:bg-gray-900 dark:border-gray-800;
  }
  .card-interactive {
    @apply card cursor-pointer
           hover:shadow-card-hover hover:border-gray-200 hover:-translate-y-0.5
           active:translate-y-0 active:shadow-card
           dark:hover:border-gray-700;
  }
  .card-elevated { @apply card shadow-soft-lift; }

  .glass { @apply bg-white/80 backdrop-blur-xl border border-white/20 dark:bg-gray-900/80 dark:border-gray-800/40; }

  .section-title { @apply text-xs font-semibold text-gray-400 uppercase tracking-wider dark:text-gray-500; }

  /* Skeleton loader with shimmer */
  .skeleton {
    @apply rounded-xl bg-gray-100 dark:bg-gray-800;
    background-image: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
    background-size: 200% 100%;
    animation: shimmer 1.8s ease-in-out infinite;
  }

  /* Division chip — used in switcher and filter tags */
  .division-chip {
    @apply inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold
           transition-all duration-200 min-h-tap;
  }
}
```

---

## 4. MULTI-DIVISION ARCHITECTURE

### The DivisionContext

A single React Context provides:

```js
{
  active: 'pest' | 'fire' | 'hygiene' | 'locksmith' | 'awc',  // 'awc' = Group view
  setActive: (slug) => void,
  available: Division[],   // only ones enabled for the logged-in business
  byId: Record<string, Division>,
  bySlug: Record<string, Division>,
  currentDivision: Division | null,   // null when active = 'awc'
  isGroupView: boolean,
}
```

Division object shape:

```js
{
  id: 'uuid',
  slug: 'pest',                         // 'pest' | 'fire' | 'hygiene' | 'locksmith'
  name: 'Pest Control',
  full_name: 'A Wilkinson Pest Control',
  abbrev: 'AWPC',
  theme_class: 'theme-pest',            // applied to <html>
  icon: Bug,                            // Lucide component
  job_type_templates: [...],            // loaded lazily
  equipment_templates: [...],
  assessment_schema: { /* JSON */ },    // the form fields for site assessments
  terminology: {                        // overrides copy throughout app
    site: 'Premises',                   // pest: Premises, fire: Building, hygiene: Site, locksmith: Location
    job: 'Treatment',                   // pest: Treatment, fire: Inspection, hygiene: Clean, locksmith: Job
    report: 'Treatment Report',
    assessment: 'Infestation Assessment',
  },
  regulations: {
    cert_body: 'BPCA',                  // shown in footer / compliance tab
    key_standards: ['CRRU UK Code', 'COSHH 2002'],
  },
  active: true,
}
```

### The DivisionSwitcher component

**Desktop:** a segmented control in the top bar, horizontally arranged with icons + labels. Active division has filled background + brand colour. Plus a "Group" option at the right.

**Mobile:** a swipable horizontal scroll strip at the top, under the header. Active division has brand-filled pill. Taps are haptic (`navigator.vibrate(10)`). Also accessible via the command palette (`⌘K → Switch to …`).

Switching a division:
1. `setActive(slug)` updates context
2. `<html>` class changes (`theme-pest` → `theme-fire`) — CSS variables transition over 350ms
3. URL updates with `?division=pest` (or removed if Group)
4. Page data refetches (filtered by division)
5. Toast confirms: "Switched to Fire Safety" with undo

### Dynamic theming approach

Two layers:

1. **CSS variables on `<html>`** drive `brand-*` Tailwind tokens. Smooth transitions. Cheap.
2. **Data filter** applies on every query in hooks: `.eq('division_id', active.id)`.

A `useDivision()` hook wraps `useContext(DivisionContext)`. Every page calls it. Queries automatically scope.

### Group view

Special case `active = 'awc'`. Division filter is removed from queries. Theme is the parent graphite palette. Dashboard shows aggregated KPIs AND per-division breakdown strips. Activity feed shows all divisions with a colour dot prefix.

Group view is only accessible to admin/owner roles, not techs.

### Division activation

`businesses.enabled_divisions` is a `text[]` with slugs: `['pest', 'fire']`. Only these show in the switcher. Toggled from Settings → Divisions (owner only).

On first signup, pest is auto-enabled; fire activates when client is ready (`enabled_divisions` updated). New divisions can be added later via a "Enable Division" flow that shows expected setup tasks (import job types, set up equipment library, assign staff, etc.).

---

## 5. DATABASE SCHEMA

### Core tables (new or modified from PoolPro/TreePro)

**businesses** — extended

```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL DEFAULT 'A Wilkinson Company Ltd',
  trading_name TEXT,
  logo_url TEXT,
  brand_colour TEXT DEFAULT '#1e2836',

  -- UK-specific
  companies_house_number TEXT,                     -- e.g. 12345678
  vat_number TEXT,                                 -- e.g. GB123456789
  vat_rate NUMERIC DEFAULT 0.20,                   -- 20% standard UK VAT
  country_code TEXT DEFAULT 'GB',
  currency TEXT DEFAULT 'GBP',
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  county TEXT,
  postcode TEXT,

  phone TEXT,
  email TEXT,

  -- Multi-division
  enabled_divisions TEXT[] DEFAULT ARRAY['pest']::TEXT[],  -- subset of 'pest','fire','hygiene','locksmith'

  -- Billing / plan
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial','starter','pro','enterprise')),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),

  -- Invoicing
  next_invoice_number INTEGER DEFAULT 1,
  invoice_prefix TEXT DEFAULT 'INV',
  default_payment_terms_days INTEGER DEFAULT 14,
  bank_details JSONB,                              -- { sort_code, account_number, account_name }

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**divisions** — new. Stores config per division per business.

```sql
CREATE TABLE divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  slug TEXT NOT NULL CHECK (slug IN ('pest','fire','hygiene','locksmith')),
  name TEXT NOT NULL,                              -- 'Pest Control'
  full_name TEXT NOT NULL,                         -- 'A Wilkinson Pest Control'
  abbrev TEXT NOT NULL,                            -- 'AWPC'
  active BOOLEAN DEFAULT true,
  brand_colour TEXT,                               -- override per business if needed
  terminology JSONB DEFAULT '{}',                  -- overrides labels
  assessment_schema JSONB DEFAULT '{}',            -- form schema
  regulations JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (business_id, slug)
);
```

**clients** — shared across divisions (no `division_id`)

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  name TEXT NOT NULL,
  client_type TEXT DEFAULT 'residential' CHECK (client_type IN ('residential','commercial','public_sector','housing_association','industrial')),
  email TEXT,
  phone TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  postcode TEXT,
  notes TEXT,

  -- Division participation — which divisions this client uses
  divisions TEXT[] DEFAULT ARRAY[]::TEXT[],        -- auto-populated from jobs/quotes

  -- Shared fields
  billing_email TEXT,
  invoice_payment_terms_days INTEGER,
  assigned_staff_id UUID,
  pipeline_stage TEXT DEFAULT 'lead' CHECK (pipeline_stage IN ('lead','quoted','active','on_hold','lost')),
  auth_user_id UUID,                               -- portal login
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**premises** — replaces `pools`/`job_sites`. Division-tagged (since the same building might have pest + fire + hygiene).

```sql
CREATE TABLE premises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  client_id UUID REFERENCES clients NOT NULL,
  division_slug TEXT NOT NULL,                     -- 'pest','fire','hygiene','locksmith'

  -- Common
  name TEXT,                                       -- e.g. 'Main Kitchen' or 'Head Office'
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT,
  postcode TEXT,

  site_type TEXT DEFAULT 'commercial',             -- residential/commercial/industrial/public
  access_notes TEXT,
  hazards JSONB DEFAULT '[]',

  -- Ongoing maintenance (division-specific meaning)
  regular_service BOOLEAN DEFAULT false,
  service_frequency TEXT CHECK (service_frequency IN ('weekly','fortnightly','monthly','quarterly','biannual','annual')),
  next_due_at TIMESTAMPTZ,

  -- Division-specific data lives in JSONB
  division_data JSONB DEFAULT '{}',
  /* Examples:
     pest: { bait_stations: 12, risk_level: 'high', target_species: ['rat','mouse'], coverage_sqm: 450 }
     fire: { building_category: 'B', num_extinguishers: 8, alarm_panel_type: 'conventional', last_rra_date: '...' }
     hygiene: { area_sqm: 220, surface_types: ['stainless','tile'], touchpoint_count: 45, frequency_tier: 'high' }
     locksmith: { entry_count: 6, lock_brands: ['Yale','Chubb'], master_key_system: true, accessibility: 'standard' }
  */

  assigned_staff_id UUID,
  route_order INTEGER,
  portal_token UUID DEFAULT gen_random_uuid(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geocoded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON premises(business_id, division_slug);
CREATE INDEX ON premises(client_id);
CREATE INDEX ON premises(next_due_at) WHERE regular_service = true;
```

**jobs** — division-tagged

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  division_slug TEXT NOT NULL,
  client_id UUID REFERENCES clients NOT NULL,
  premises_id UUID REFERENCES premises,
  quote_id UUID REFERENCES quotes,
  recurring_profile_id UUID REFERENCES recurring_profiles,

  job_number TEXT,                                 -- AWPC-2026-0001, AWFS-2026-0001 (per-division prefix)
  title TEXT NOT NULL,
  description TEXT,
  job_type TEXT,                                   -- ref to job_type_templates.name

  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','on_hold','completed','cancelled')),
  scheduled_date TIMESTAMPTZ,
  scheduled_duration_minutes INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  assigned_staff_id UUID REFERENCES staff_members,
  price NUMERIC,                                   -- agreed price for this job (ex. VAT)

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON jobs(business_id, division_slug, status);
CREATE INDEX ON jobs(scheduled_date);
CREATE INDEX ON jobs(premises_id);
```

**job_reports** — division-aware. Division-specific data in `report_data` JSONB.

```sql
CREATE TABLE job_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  division_slug TEXT NOT NULL,
  job_id UUID REFERENCES jobs NOT NULL,
  premises_id UUID REFERENCES premises,
  staff_id UUID REFERENCES staff_members,
  technician_name TEXT,

  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  notes TEXT,
  signature_url TEXT,                              -- client sign-off
  client_satisfaction INTEGER,                     -- optional 1-5 in-person

  -- Universal metrics
  duration_minutes INTEGER,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_notes TEXT,

  -- Division-specific in JSONB (validated client-side from division.assessment_schema)
  report_data JSONB DEFAULT '{}',
  /* Examples:
     pest: {
       rodent_activity: 'high', bait_consumed_pct: 60, stations_rebaited: 8,
       species_identified: ['brown_rat','house_mouse'], treatment_applied: 'brodifacoum_28g',
       harbourage_found: true, proofing_recommended: ['door_sweeps','air_brick_mesh']
     }
     fire: {
       alarm_tested: true, extinguishers_checked: 8, extinguishers_serviced: 2,
       emergency_lighting_ok: true, fire_doors_checked: 4, defects: [...],
       risk_rating: 'medium', next_rra_due: '2027-04-01'
     }
     hygiene: {
       areas_cleaned: ['kitchen','toilets','dining'], touchpoints_sanitised: 45,
       consumables_replaced: {'soap': 3, 'paper_towel': 2}, atp_readings: [{zone:'prep_counter', rlu: 25}],
       issues_reported: []
     }
     locksmith: {
       work_performed: 'Yale 5-lever upgrade', locks_installed: 2, keys_cut: 8,
       master_keyed: true, lockout_call: false, security_survey_done: false
     }
  */

  completed_at TIMESTAMPTZ,
  report_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**job_tasks**, **job_photos**, **consumables_used** (replaces equipment_used/chemicals_added) — all have `division_slug` and reference `job_report_id`. Unchanged structure from PoolPro/TreePro otherwise.

**products** — the division-agnostic name for Equipment/Chemicals/Supplies library. Categorised by division.

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  division_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,                                   -- per-division enum
  unit TEXT DEFAULT 'unit',                        -- unit, hour, litre, kg, g, m2
  unit_cost NUMERIC DEFAULT 0,                     -- cost to business
  unit_price NUMERIC,                              -- charge to client
  hourly_rate NUMERIC,                             -- for equipment-type products

  -- Compliance
  safety_data_sheet_url TEXT,                      -- COSHH for pest/hygiene chemicals
  hse_approval TEXT,                               -- UK HSE approval number

  notes TEXT,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (business_id, division_slug, name)
);
```

**quotes**, **invoices** — division-tagged, but inherits shared invoice numbering at business level. Numbering format: `INV-2026-0001` (global), `AWPC-2026-0001` (division-specific reference).

```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  division_slug TEXT NOT NULL,
  client_id UUID REFERENCES clients NOT NULL,
  premises_id UUID REFERENCES premises,

  quote_number TEXT NOT NULL,                      -- AWPC-Q-2026-0001
  subject TEXT,
  scope TEXT,
  terms TEXT,

  line_items JSONB DEFAULT '[]',                   -- [{ description, qty, unit_price, line_total }]
  subtotal NUMERIC DEFAULT 0,
  vat_rate NUMERIC DEFAULT 0.20,
  vat_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','follow_up','accepted','declined','expired')),
  expires_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  public_token UUID DEFAULT gen_random_uuid(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**staff_members** — with division assignments

```sql
CREATE TABLE staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  auth_user_id UUID,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  photo_url TEXT,

  role TEXT DEFAULT 'tech' CHECK (role IN ('admin','tech','owner')),
  divisions TEXT[] DEFAULT ARRAY[]::TEXT[],        -- which divisions they work in; empty = all (admin)
  certifications JSONB DEFAULT '[]',               -- [{ name, issuer, expires_at, url }]

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Other tables** — same pattern (add `division_slug` if applicable):
- `recurring_profiles` (division-tagged) — with `duration_type` + `end_date` + `total_visits` + `completed_visits` from PoolPro SCHEDULE_WORKORDERS_INVOICING spec
- `invoices` (division-tagged)
- `activity_feed` (division-tagged so filters and colouring work)
- `automation_rules` + `automation_logs`
- `communication_templates`
- `job_type_templates` (division-tagged, seeded per-division)
- `surveys` + responses
- `documents`

### RLS

Every table: `business_id = current_business_id(auth.uid())`. Division filtering is application-level (users see their enabled divisions only, techs filtered further by `staff_members.divisions`).

Portal access: public via `portal_token` on `premises` and `public_token` on quotes/surveys, same as PoolPro.

### Realtime

Enable on: `activity_feed`, `jobs`, `quotes`, `job_reports`. Channel naming: `${table}-${business_id}-${Date.now()}` (critical — prevents white-screen crashes from duplicate subscriptions).

---

## 6. PER-DIVISION DATA

This is where each division is uniquely shaped. Seeded via migration `seed_division_templates.sql`.

### Pest Control (AWPC)

**Job types:**
- Initial Infestation Survey (45m, £85)
- Rodent Treatment — Residential (60m, £120)
- Rodent Treatment — Commercial (90m, £180)
- Insect Treatment — Ants / Cockroaches / Bedbugs / Wasps / Fleas (60–90m)
- Monthly Commercial Visit (60m, £75)
- Quarterly Visit (45m, £55)
- Bird Proofing (varies)
- Heat Treatment (bedbugs) (240m)
- Emergency Callout (60m, £150+)

**Products (chemicals + equipment):**
- Rodenticides: brodifacoum blocks, difenacoum wax blocks, bromadiolone grain
- Insecticides: K-Othrine, Cislin 25, Ficam W, Gel baits
- Equipment: rat bait stations, pheromone traps, glue boards, UV fly killers, sprayer (5L knapsack), respirator (P3), UV torch
- All with COSHH sheet URL + HSE approval number

**Assessment form (division.assessment_schema):**
```js
{
  fields: [
    { key: 'target_species', type: 'multiselect', options: ['brown_rat','house_mouse','cockroach','ant','bedbug','wasp','flea','moth','silverfish','other'] },
    { key: 'infestation_level', type: 'select', options: ['none','low','moderate','heavy','severe'] },
    { key: 'harbourage_found', type: 'boolean' },
    { key: 'entry_points', type: 'multiselect', options: ['door_gaps','air_bricks','pipe_penetrations','roof','windows','drainage'] },
    { key: 'stations_count', type: 'number' },
    { key: 'bait_used', type: 'products_picker' },
    { key: 'proofing_recommended', type: 'multiselect', options: ['door_sweeps','air_brick_mesh','pipe_sealing','roof_repairs'] },
    { key: 'risk_to_non_target', type: 'select', options: ['none','low','medium','high'] },
    { key: 'crru_compliance_notes', type: 'textarea' },
  ]
}
```

**Terminology:** Premises, Treatment, Treatment Report, Infestation Assessment

**Regulations:** BPCA membership, CRRU UK Code, COSHH 2002, HSE

### Fire Safety (AWFS)

**Job types:**
- Fire Risk Assessment (Type 1/2/3/4) (120–480m)
- Fire Extinguisher Service (Annual) (60m, £95)
- Emergency Lighting Test (Annual) (90m, £140)
- Fire Alarm Service (Annual / Quarterly / Monthly) (60–90m)
- Fire Door Inspection (30m per door)
- Passive Fire Protection Survey (120m)
- Extinguisher Supply & Install (varies)
- Emergency Call-out (varies)

**Products:**
- Extinguishers: Water, Foam, CO2, Dry Powder, Wet Chemical
- Emergency lighting: bulkhead LED, spot LED, exit sign
- Fire alarm components: detectors, call points, sounders
- Servicing kit: test lamp, decibel meter, smoke canister, heat detector tester

**Assessment form:**
```js
{
  fields: [
    { key: 'building_category', type: 'select', options: ['A','B','C','D','E','sleeping_risk'] },
    { key: 'occupancy_type', type: 'select', options: ['office','retail','hotel','care_home','HMO','school','industrial','public'] },
    { key: 'num_floors', type: 'number' },
    { key: 'max_occupants', type: 'number' },
    { key: 'alarm_system', type: 'select', options: ['none','L1','L2','L3','L4','L5','P1','P2'] },
    { key: 'means_of_escape_adequate', type: 'boolean' },
    { key: 'extinguisher_coverage_adequate', type: 'boolean' },
    { key: 'emergency_lighting_adequate', type: 'boolean' },
    { key: 'signage_adequate', type: 'boolean' },
    { key: 'fire_doors_adequate', type: 'boolean' },
    { key: 'overall_risk', type: 'select', options: ['trivial','tolerable','moderate','substantial','intolerable'] },
    { key: 'next_rra_due', type: 'date' },
    { key: 'defects', type: 'repeatable', schema: { location, defect_type, priority, action_required } },
  ]
}
```

**Terminology:** Building, Service, Service Report, Fire Risk Assessment

**Regulations:** RRO 2005, BS 5839, BS 9999, BAFE SP101/SP203

### Hygiene Services (AWHS)

**Job types:**
- Daily Office Clean (60–180m, £45–£120)
- Weekly Deep Clean (180m, £150)
- Monthly Deep Clean (240m, £220)
- Food Hygiene Deep Clean (kitchen) (240m)
- Post-build Sparkle Clean (480m)
- Washroom Service (60m)
- ATP Hygiene Audit (60m, £95)
- One-off Deep Clean (varies)

**Products:**
- Chemistry: detergent, disinfectant, degreaser, sanitiser, descaler
- Equipment: microfibre cloths, mop system, vac (upright/backpack), steam cleaner, ATP meter, colour-coded buckets
- Consumables: soap, paper towel, toilet tissue, bin liners

**Assessment form:**
```js
{
  fields: [
    { key: 'areas', type: 'multiselect', options: ['reception','offices','meeting_rooms','toilets','kitchen','dining','warehouse','production','external'] },
    { key: 'total_sqm', type: 'number' },
    { key: 'frequency_tier', type: 'select', options: ['daily','weekly','fortnightly','monthly'] },
    { key: 'food_area', type: 'boolean' },
    { key: 'touchpoint_count', type: 'number' },
    { key: 'colour_code_adherence', type: 'boolean' },
    { key: 'atp_readings', type: 'repeatable', schema: { zone, rlu_value, pass_fail } },
    { key: 'consumables_stocked', type: 'boolean' },
    { key: 'issues_reported', type: 'textarea' },
  ]
}
```

**Terminology:** Site, Clean, Clean Report, Hygiene Audit

**Regulations:** BICSc, Food Safety Act 1990, COSHH, ISO 9001

### Locksmith (AWL)

**Job types:**
- Emergency Lockout (60m, £95 + parts)
- Lock Upgrade (90m, £150 + parts)
- UPVC Door Repair (90m, £120)
- Multipoint Lock Replacement (120m)
- Master Key System Install (varies)
- Access Control Install (varies)
- Security Survey (60m, £75)
- Key Cutting (on-site) (varies)
- Safe Opening (varies)

**Products:**
- Locks: Yale, Chubb, Banham, Mul-T-Lock, ERA, Union
- Cylinders: euro, oval, rim
- Multipoint gearboxes
- UPVC door parts (hinges, keeps, handles)
- Access control: keypads, card readers, electric strikes
- Tools (for the tech to log time on rather than charge): pick set, tension tools, lishi, bump hammer, bypass tools

**Assessment form:**
```js
{
  fields: [
    { key: 'work_type', type: 'select', options: ['lockout','upgrade','repair','install','survey','key_cut','safe_open'] },
    { key: 'entry_locations', type: 'multiselect', options: ['front_door','back_door','patio','side_gate','windows','garage','internal'] },
    { key: 'current_lock_brand', type: 'select' },
    { key: 'current_lock_type', type: 'select' },
    { key: 'recommended_upgrade', type: 'textarea' },
    { key: 'british_standard_compliant', type: 'boolean' },  // BS 3621
    { key: 'insurance_compliant', type: 'boolean' },
    { key: 'master_keyed', type: 'boolean' },
    { key: 'forced_entry_evidence', type: 'boolean' },
  ]
}
```

**Terminology:** Location, Job, Job Report, Security Survey

**Regulations:** MLA (Master Locksmiths Association), BS 3621, BS 8621, DBS checks

---

## 7. APP ARCHITECTURE

### Directory structure

```
/src
  /components
    /layout
      AppShell.jsx             — Top: header + DivisionSwitcher. Bottom: BottomNav. Desktop: top-bar nav.
      Header.jsx               — Title + back button + right action + breadcrumb
      BottomNav.jsx            — 5 tabs + FAB (+ New)
      DivisionSwitcher.jsx     — Segmented control (desktop) / swipable strip (mobile)
      PageWrapper.jsx          — max-w, padding, pb-safe
      CommandPalette.jsx       — ⌘K overlay
      ThemeToggle.jsx          — Light / dark / system
    /ui
      Button.jsx
      Card.jsx
      Badge.jsx
      Input.jsx / TextArea.jsx / Select.jsx
      Modal.jsx                — bottom-sheet on mobile, centred on desktop; drag-to-dismiss
      Sheet.jsx                — side-panel drawer (desktop)
      Skeleton.jsx             — shimmer loader (several sizes)
      Toast (sonner import)
      EmptyState.jsx
      StatCard.jsx             — count-up animated number + label + trend arrow
      DetailRow.jsx
      SwipeableCard.jsx        — swipe-left/swipe-right actions on mobile list cards
      Avatar.jsx               — initials fallback, photo, colour by first letter
      DivisionChip.jsx         — compact pill showing division
      ActivityPanel.jsx        — slide-in timeline with mark-read
      DocumentUploader.jsx
      SignaturePad.jsx         — for client sign-off on reports (new vs PoolPro)
      Charts.jsx               — Recharts with consistent styling + division colouring
  /contexts
    DivisionContext.jsx        — active division + CSS variable swap
    ThemeContext.jsx           — light/dark + system
    AuthContext.jsx            — Supabase auth
  /hooks
    useAuth.jsx
    useBusiness.jsx
    useDivision.jsx            — reads DivisionContext
    useClients.jsx
    usePremises.jsx            — replaces usePools; division-scoped query
    useJobs.jsx
    useJobReport.jsx
    useStaff.jsx
    useProducts.jsx            — division-scoped
    useActivity.jsx
    useHotkeys.jsx             — keyboard shortcut registry (NEW)
    useHaptic.jsx              — navigator.vibrate wrapper (NEW)
    useOptimistic.jsx          — local mutation with background reconciliation (NEW)
  /lib
    supabase.js
    utils.js                   — UK formatters (GBP, DD/MM/YYYY, UK phone, postcode validate)
    templateEngine.js
    divisionRegistry.js        — static division config (colours, icons, copy)
  /pages
    Login.jsx
    Signup.jsx
    Onboarding.jsx             — business setup (name, VAT, address, logo) → divisions enable
    Dashboard.jsx              — Today + KPIs + recent activity (division-aware OR group)
    Schedule.jsx               — merged: jobs + recurring projections + overdue premises. Tabs: Today/Week/Upcoming/Map.
    Clients.jsx                — Active clients list + toggle to full CRM
    ClientDetail.jsx           — Profile + premises (grouped by division) + quotes + jobs
    PremisesDetail.jsx         — Premises info + assessment data + photos + job history
    NewJobReport.jsx           — Complete a job; division-aware form renderer from assessment_schema
    JobReportDetail.jsx
    Jobs.jsx                   — Job list with status filters + division filter
    JobDetail.jsx
    Recurring.jsx              — Recurring profiles list + create
    Quotes.jsx
    QuoteBuilder.jsx           — Line items + VAT + division-tagged
    Invoices.jsx
    InvoiceBuilder.jsx
    Reports.jsx                — Analytics: revenue by division, jobs by tech, etc.
    TechHome.jsx               — Stripped view for techs — Today/Week/Upcoming/Map, assigned-only
    TechProfile.jsx
    Subscription.jsx
    /settings
      Settings.jsx             — Hub
      BusinessSettings.jsx     — Name, VAT, Companies House, address, logo
      DivisionsSettings.jsx    — Enable/disable divisions, configure per-division settings
      Staff.jsx                — List, invite, role + division assignment
      ProductsLibrary.jsx      — Per-division (filtered by active division)
      JobTypeTemplates.jsx     — Per-division
      CommunicationTemplates.jsx
      Automations.jsx
      Integrations.jsx
      ImportData.jsx
      ComplianceCenter.jsx     — Cert expiry tracking, VAT threshold alerts, etc. (NEW)
    /portal
      PortalLogin.jsx
      PortalSetup.jsx
      PortalDashboard.jsx      — Shows all services (divisions) this client uses
      PortalTokenLanding.jsx
    PublicQuote.jsx
    PublicSurvey.jsx

/supabase
  /functions
    complete-job-report/
    send-quote/
    respond-to-quote/
    trigger-automation/
    portal-auth/
    update-job-status/
    send-reminder/             — NEW: scheduled reminder for upcoming service
    generate-invoice-pdf/      — NEW: optional PDF output for invoices (uses Deno + pdf-lib)
  /migrations
    001_initial_schema.sql
    002_divisions_and_multitenant.sql
    003_clients_premises_jobs.sql
    004_reports_and_products.sql
    005_quotes_invoices.sql
    006_staff_recurring.sql
    007_realtime_rls.sql
    008_seed_division_templates.sql
```

### Route structure

```jsx
<Routes>
  {/* Public */}
  <Route path="/portal/*" element={<PortalRoutes />} />
  <Route path="/quote/:token" element={<PublicQuote />} />
  <Route path="/survey/:token" element={<PublicSurvey />} />
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<Signup />} />

  {/* Protected */}
  <Route element={<ProtectedRoute />}>
    <Route path="/onboarding" element={<Onboarding />} />

    <Route element={<BusinessGuard />}>
      {/* Tech-only routes */}
      <Route element={<TechGuard />}>
        <Route path="/tech" element={<TechHome />} />
        <Route path="/tech/profile" element={<TechProfile />} />
        <Route path="/tech/job/:id" element={<JobDetail />} />
        <Route path="/tech/job/:id/report" element={<NewJobReport />} />
      </Route>

      {/* Admin routes (owner + admin staff) */}
      <Route element={<AdminGuard />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/premises/:id" element={<PremisesDetail />} />
        <Route path="/premises/:id/report" element={<NewJobReport />} />
        <Route path="/reports/:id" element={<JobReportDetail />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/recurring" element={<Recurring />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/quotes/new" element={<QuoteBuilder />} />
        <Route path="/quotes/:id" element={<QuoteBuilder />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/new" element={<InvoiceBuilder />} />
        <Route path="/invoices/:id" element={<InvoiceBuilder />} />
        <Route path="/analytics" element={<Reports />} />
        <Route path="/settings/*" element={<SettingsRoutes />} />
        <Route path="/subscription" element={<Subscription />} />
      </Route>
    </Route>
  </Route>

  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

Every route honours `?division=X` search param. `DivisionContext` reads it and syncs the active division.

---

## 8. KEY FEATURES & BEHAVIOUR (division-aware)

### Auth flow — same as PoolPro (Supabase email/password with PKCE + email confirm). Redirect `emailRedirectTo` to app origin.

### Onboarding

1. **Business** — Name (defaults "A Wilkinson Company Ltd"), Companies House number, VAT number (optional), address, phone, email
2. **Divisions** — Grid of 4 cards: Pest / Fire / Hygiene / Locksmith. Toggle each ON/OFF. At least one required.
3. **Brand** — Logo upload (Supabase `logos` bucket), parent brand colour (defaults graphite)
4. **Staff** — Invite first tech (optional, can skip)
5. **Done** — Redirect to Dashboard with Pest division active (or first enabled)

### Dashboard

- **"Today" panel** (top) — Progress bar (X of Y stops complete) + stat pills (Overdue / Due Today / Completed) + first 3 upcoming cards
- **KPI strip** — 4 cards: This Week's Jobs, Active Jobs, Pending Quotes, Overdue Premises (each with count-up animation on mount)
- **Revenue chart** — Recharts line chart, 30 days, colour-coded per division if Group view
- **Activity feed** (right rail on desktop, bottom on mobile) — last 20 events with division dots

**In Group view:** adds a per-division summary strip showing "Pest: 12 jobs this week | Fire: 4 jobs | Hygiene: 8 jobs" with each division having its accent colour.

### Schedule (merged view)

Four tabs: **Today / Week / Upcoming / Map**.

- Sources: jobs + recurring_profiles projections + overdue premises with `regular_service = true`
- Deduplicated: if a recurring profile has a scheduled job today, show the job only (not the projection)
- Grouped by time: Overdue (red, top) / Morning / Afternoon / Evening
- Card shows: division chip (colour), time, client name, address, assigned tech avatar, status
- **Swipe-left on mobile**: Mark completed (with undo toast)
- **Swipe-right on mobile**: Reschedule (opens date picker modal)
- **Tap**: Opens StopDetailModal (quick edit — address, phone, notes, status, date/time, assigned tech)
- **Map tab**: Leaflet with all stops, colour-coded by division, clickable markers open stop drawer

### Clients

- Default: "Active Clients" (has jobs or premises in any enabled division)
- Toggle: "All Clients" (full CRM)
- Search bar: fuzzy match on name, address, postcode, phone, email
- Each row: avatar, name, division dots (which divisions they use), last job date, next visit date
- Tapping row → ClientDetail
- **"+ Add Client" button** (floating on mobile, top-right on desktop)
  - Single-step form: name, client type, phone, email, address (with postcode lookup), notes
  - On save → navigate to `/clients/:id?addPremises=1`

### ClientDetail

- Header: client name, address, contact, pipeline stage chip
- **Tabs**: Overview / Premises / Quotes / Jobs / Invoices / Activity
- **Premises tab**: grouped by division. Each group has a division chip header + "+ Add premises" button. Premises cards show address + next visit + assigned tech.
- **Quotes tab**: all quotes across all divisions, colour-coded chips. Filter bar: "All | Pest | Fire | Hygiene | Locksmith".
- **"+ Create Quote"** button (multi-division ClientDetail shows a division picker first)

### PremisesDetail

- Header: address, division chip (coloured), client link, next due date
- Division-specific assessment data displayed (read from `premises.division_data` + latest `job_reports.report_data`)
- Photos gallery (grouped by job)
- Job history (latest 20)
- **Quick actions** (division-aware):
  - Pest: "Log treatment visit", "Update bait stations"
  - Fire: "Start service check", "Record defect"
  - Hygiene: "Start clean", "ATP audit"
  - Locksmith: "Start job", "Add security note"

### NewJobReport (the form that adapts)

- Reads `division.assessment_schema` and renders fields dynamically
- Built-in field types: text, number, select, multiselect, boolean, date, textarea, products_picker, photo, repeatable, signature
- Task checklist (from job type template)
- Products used (consumables + equipment from library; for equipment, track hours; for consumables, track quantity + cost)
- Photos (tagged: before / during / after / defect / evidence)
- Client signature (SignaturePad)
- **"Complete & Send"** — triggers edge function, emails client + owner, creates activity, closes job

### Quotes

- Pipeline tabs: Draft / Sent / Viewed / Follow-up / Accepted / Declined
- Each card: quote number, client, total, status, days since sent
- **QuoteBuilder** — clean line-item editor with:
  - Template picker (division-specific line item bundles)
  - Subtotal → VAT 20% → Total auto-calc
  - Scope + Terms sections
  - Preview pane (shows branded quote email as it'll appear)
  - Send button → calls `send-quote` edge function
  - Public link copy button
  - Convert to job button (once accepted)

### Invoices — same as PoolPro but in £ GBP with 20% VAT and UK bank details (sort code + account number). Emit PDF optionally.

### Command Palette (⌘K)

Uses `cmdk`. Shows:
- Switch division (Pest / Fire / Hygiene / Locksmith / Group)
- Quick nav: Dashboard, Schedule, Clients, Jobs, Quotes, Invoices, Settings
- Create: New quote, New job, New client
- Search: clients, jobs, premises, invoices (debounced Supabase query)
- Recent: last 5 items touched

Trigger: `⌘K` (Mac) / `Ctrl+K` (Win/Linux). Mobile: long-press the search icon in header.

### Activity feed

- Real-time via Supabase Realtime on `activity_feed` INSERT
- Each event: icon, title, timestamp, division dot colour
- Mark-read on open (per user)
- Filter: show all / per division / unread only

---

## 9. UI PATTERNS (elevated)

### Buttons

Same 4 variants. With new: loading spinner replaces label and icon slot. `active:scale-[0.98]` for feedback. On mobile, `onClick` fires `haptic(10)` (10ms vibrate).

### Inputs with built-in UK helpers

- **Postcode input**: validates `/^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/i` on blur; optional "Look up address" button calls a free postcode API and populates address fields
- **Phone input**: formats as the user types (07XXX XXXXXX or +44 XXXX XXXXXX)
- **Currency input**: £ prefix, 2dp, tabular-nums. Also supports `£1,234.56` formatting on blur.
- **Date input**: DD/MM/YYYY display, uses native `<input type="date">` under the hood for picker, formatted on blur

### Skeleton loaders

On first load of any list, show 3–5 skeleton cards matching the real card shape. On refetch, leave existing cards and show a thin top progress bar (shimmer) instead.

### Toast system (sonner)

- Success: `toast.success("Job scheduled", { description: "Mon 27 Apr, 9:00am", action: { label: "View", onClick }})`
- Error: `toast.error("Couldn't reach server")`
- Undo: `toast("Job completed", { action: { label: "Undo", onClick: revert }})` — stays for 6s
- Mobile: toasts stack from the bottom, above bottom nav

### Modals with drag-to-dismiss (mobile)

- Bottom sheet on mobile, centred card on desktop
- Mobile: drag-handle at top, touch events track drag distance, release < 50% snaps back, > 50% dismisses
- Desktop: click-outside dismisses
- Focus trap on open, return focus on close
- Multiple snap points for large modals (peek / half / full)

### SwipeableCard

- Two action zones revealed on swipe: left action (primary — e.g. Mark Complete) and right action (secondary — e.g. Reschedule)
- Haptic feedback on reveal and on commit
- Commit threshold: 60% of card width
- Disabled on desktop (no touch)

### StatCard with count-up

On mount, animate number from 0 to actual value over 600ms using `requestAnimationFrame`. Respects `prefers-reduced-motion` (just renders final value).

### Division theming animation

When switching divisions, the CSS variables transition over 350ms via `transition: background-color, color, border-color, fill, stroke`. Cards that had `shadow-glow` using `var(--brand-500-rgb)` smoothly recolour their glow. This is the single biggest "wow" moment in the app.

### Number formatting

- All monetary: tabular-nums, £ prefix, 2dp, thousand separator
- Job number: monospaced (JetBrains Mono), e.g. `AWPC-2026-0001`
- Dates: `dd MMM yyyy` for display (`27 Apr 2026`), `dd/MM/yyyy` for inputs, relative ("in 3 days", "2 weeks ago") where helpful

---

## 10. MOBILE PERFECTION CHECKLIST

Every one of these is non-negotiable:

- [ ] All interactive elements ≥ 44×44px
- [ ] All inputs 16px font-size (no iOS zoom)
- [ ] `env(safe-area-inset-bottom)` on bottom nav, `env(safe-area-inset-top)` on header
- [ ] `overscroll-behavior: none` on html, body
- [ ] `-webkit-tap-highlight-color: transparent`
- [ ] Bottom nav uses frosted glass (`bg-white/90 backdrop-blur-xl`) with safe-area padding
- [ ] FAB (+ New) floats above bottom nav, bottom-right, 56×56px, brand-gradient
- [ ] Modals scroll-lock via `<html>` position-fixed + restore (iOS Safari safe)
- [ ] NO `backdrop-blur` inside modals (Safari perf)
- [ ] Leaflet `.leaflet-container { isolation: isolate }` to prevent z-index fights
- [ ] Pull-to-refresh on Schedule, Jobs, Clients lists (threshold 60px, spinner appears, refetch triggered)
- [ ] Swipe actions on list cards (Schedule, Jobs) — left = complete, right = reschedule
- [ ] Haptic feedback: on swipe commit, on tab switch, on toast appear, on button long-press
- [ ] Bottom-sheet modals with drag-to-dismiss
- [ ] Keyboard-aware forms — when keyboard opens, scroll focused input into view
- [ ] Offline shell — core screens render from cache, show "Offline" indicator, queue mutations
- [ ] Install prompt — after 3 sessions, show subtle banner "Add AWC to your home screen"
- [ ] Apple touch icon (180×180 PNG), manifest icons (192, 512, maskable)
- [ ] `display: "standalone"` in manifest — no Safari chrome when installed
- [ ] Theme-color meta tag matches active division (updated on theme change)
- [ ] Tested on: iPhone SE (small), iPhone 15 Pro, Pixel 7, iPad Mini
- [ ] First Contentful Paint < 1.5s on 4G
- [ ] Initial JS bundle < 150KB gzipped
- [ ] Images: WebP, lazy-loaded, `loading="lazy"`
- [ ] No layout shift (CLS < 0.1) — reserve space for images, use `aspect-ratio`

---

## 11. EDGE FUNCTIONS

Same 6 as PoolPro, UK-ified, plus 2 new:

1. **complete-job-report** — Adapts template by division. Sends branded HTML email to client + owner. Includes photos, tasks completed, products used, assessment data (rendered per-division). Creates activity_feed entry. Triggers `report_completed` automation.
2. **send-quote** — Branded email with division styling. Line items table. VAT breakdown. CTA to view/accept online.
3. **respond-to-quote** — Accept/decline. Auto-create job if accepted (with `scheduled_date` picker in public link).
4. **trigger-automation** — Event-driven template rendering + Resend email.
5. **portal-auth** — Token validation, account creation.
6. **update-job-status** — Status transitions + automation triggers.
7. **send-reminder** — NEW. Scheduled (via pg_cron or Supabase Scheduler) — finds premises with `next_due_at` within 7 days and sends branded reminder email to clients.
8. **generate-invoice-pdf** — NEW. Uses `pdf-lib` in Deno to output an invoice PDF with VAT breakdown, payment terms, bank details. Returned as signed storage URL.

All functions use the service role key from env. Email via Resend.

---

## 12. UTILITY FUNCTIONS (UK-specific)

```js
// src/lib/utils.js

// Dates
formatDate(date)       // '27 Apr 2026'
formatDateShort(date)  // '27/04/2026'
formatDateTime(date)   // '27 Apr 2026, 14:30'
formatRelative(date)   // 'in 3 days' / '2 weeks ago'

// Money
formatGBP(amount)      // '£1,234.56'
calculateVAT(subtotal, rate = 0.20) // returns { subtotal, vatAmount, total }

// UK formats
formatUKPhone(number)  // '07123 456789' or '+44 20 1234 5678'
validateUKPostcode(pc) // boolean
formatPostcode(pc)     // 'SW1A1AA' -> 'SW1A 1AA'

// Status
statusColour(status)   // Tailwind class
statusLabel(status)    // Human-friendly: 'in_progress' -> 'In progress'

// Class names
cn(...classes)

// Constants
DIVISIONS: ['pest','fire','hygiene','locksmith']
DIVISION_META: { pest: { name, colour, icon, ... }, fire: {...}, ... }

CLIENT_TYPES: ['residential','commercial','public_sector','housing_association','industrial']
SERVICE_FREQUENCIES: ['weekly','fortnightly','monthly','quarterly','biannual','annual']
JOB_STATUSES: ['scheduled','in_progress','on_hold','completed','cancelled']
QUOTE_STATUSES: ['draft','sent','viewed','follow_up','accepted','declined','expired']
```

---

## 13. ENVIRONMENT VARIABLES

`.env.local` (never committed — in `.gitignore`):

```
VITE_SUPABASE_URL=https://ssnzebudcbrtpiwilroo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_APP_NAME=AWC Group
VITE_SUPPORT_EMAIL=support@awcgroup.co.uk

# Edge function secrets (set in Supabase dashboard, not client)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
RESEND_API_KEY=re_UFYtdo1d_...
RESEND_FROM_EMAIL=noreply@awcgroup.co.uk
```

Cloudflare Pages environment variables (production):
- Mirror the `VITE_*` variables above in the Pages project settings
- Edge function secrets set via Supabase dashboard only

---

## 14. IMPLEMENTATION NOTES (important)

1. **Supabase Realtime channel naming** — always `${table}-${business_id}-${Date.now()}`. Never reuse a static name. Causes "cannot add postgres_changes callbacks after subscribe()" white-screen otherwise.

2. **Division switching** — triggered via `setActive(slug)` which:
   - Updates `<html>` class (adds `theme-${slug}`, removes others)
   - Updates theme-color meta tag
   - Updates URL `?division=${slug}`
   - Persists to `localStorage` (restores on reload)
   - Fires `divisionchanged` custom event that hooks listen to refetch

3. **Data fetching** — do NOT use Supabase joined selects with FK that might be null (e.g. `.select('*, premises(*)')`). Fetch parent first, then children in parallel.

4. **Suggestions always visible** — in ProductsLibrary and JobTypeTemplates, per-division suggestions default visible. "Hide Suggestions" toggle.

5. **Email redirect** — on signup, set `emailRedirectTo: window.location.origin`. On `onAuthStateChange SIGNED_IN`, clean up URL (remove hash/code params). PKCE support required.

6. **Lazy loading** — all pages `React.lazy()` with `<Suspense>` fallback. Initial bundle: AppShell + Login + Dashboard only.

7. **UK VAT** — hardcoded `0.20` default. Business can override at business-level. Below £85k threshold, businesses may not register; support `vat_registered: false` with a "Not VAT registered" line on quotes/invoices.

8. **Job number format** — per-division prefix: `AWPC-2026-0001`, `AWFS-2026-0001`, etc. Auto-increment via trigger on insert. Reset yearly.

9. **Invoice number format** — business-wide: `INV-2026-0001` (no division prefix — bookkeeping wants one sequence). Reference the division-specific job number in the invoice body.

10. **Date handling** — store UTC in Postgres, display in user's locale (Europe/London). Use `date-fns-tz` for conversions if needed.

11. **Offline-ready** — Service Worker caches AppShell + last viewed Schedule/Jobs pages. Mutations go to IndexedDB queue when offline, replay on reconnect. Show offline indicator in header.

12. **Accessibility** — every icon-only button has `aria-label`. Focus outline visible via `focus-visible:ring-2`. Skip-to-content link. Headings in order.

13. **Tech role view** — when `staff_members.role = 'tech'`, ProtectedRoute redirects to `/tech`. Tech cannot access admin pages. Their scheduler filters by `staff_members.divisions` (only their assigned divisions' jobs).

14. **Storage buckets**: `logos`, `staff-photos`, `job-photos`, `documents`, `signatures`. All public-read with RLS on write.

15. **Prefers-reduced-motion** — disable count-up animations, theme transitions, modal slide-ups. Use opacity-only fades.

---

## 15. BUILD ORDER

**Phase 1: Foundation (week 1)**
1. Supabase project set up (already done — `ssnzebudcbrtpiwilroo`)
2. Run migrations 001–008 — schema + RLS + realtime + seeds
3. Storage buckets created with policies
4. Scaffold Vite + React + Tailwind + PWA
5. Theme system: CSS variables, dark mode, division registry
6. Core UI primitives: Button, Card, Input, Badge, Modal, Skeleton, Toast, EmptyState, Avatar, DivisionChip
7. Layout: AppShell, Header, BottomNav, DivisionSwitcher, PageWrapper, CommandPalette stub
8. Contexts: Auth, Business, Division, Theme
9. Hooks: useAuth, useBusiness, useDivision, useHotkeys, useHaptic

**Phase 2: Auth + Onboarding (week 2)**
10. Login, Signup, email confirm flow
11. Onboarding wizard (business → divisions → brand → invite)
12. ProtectedRoute, BusinessGuard, TechGuard, AdminGuard

**Phase 3: Core data (week 3)**
13. Clients list + ClientDetail
14. Premises — per-division tabs on ClientDetail
15. Division-aware forms (dynamic renderer from `assessment_schema`)

**Phase 4: Scheduling + jobs (week 4)**
16. Jobs list + JobDetail
17. Schedule (4 tabs, 3 sources, deduplication, Leaflet map)
18. NewJobReport (division-aware)
19. Recurring profiles
20. Tech role view

**Phase 5: Commerce (week 5)**
21. QuoteBuilder + Quotes list + public quote page
22. Invoices + InvoiceBuilder + PDF generation
23. Respond-to-quote flow (accept → create job)

**Phase 6: Settings + polish (week 6)**
24. Settings: Business, Divisions, Staff, ProductsLibrary, JobTypeTemplates, CommunicationTemplates, Automations, ComplianceCenter
25. Activity feed (realtime)
26. Command palette (⌘K)
27. Reports/Analytics page
28. Portal (PortalLogin, PortalDashboard with multi-division view)
29. Dark mode polish pass
30. Accessibility audit pass
31. Mobile checklist pass (§10)

**Phase 7: Deploy (week 7)**
32. Deploy Edge Functions (complete-job-report, send-quote, respond-to-quote, trigger-automation, portal-auth, update-job-status, send-reminder, generate-invoice-pdf)
33. Configure Resend domain (awcgroup.co.uk) and templates
34. Deploy to Cloudflare Pages (connect GitHub repo, build `npm run build`, publish `dist`)
35. Set Cloudflare Pages env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
36. Configure custom domain via Cloudflare DNS
37. Set Supabase Auth `SITE_URL` to prod domain
38. Smoke test end-to-end

---

## 16. DEPLOYMENT — CLOUDFLARE PAGES

1. Push to `github.com/shaun622/awcgroup.git` (main branch = production)
2. In Cloudflare dashboard → Pages → Create project → Connect to Git
3. Select repo → production branch `main`
4. Build command: `npm run build`
5. Output directory: `dist`
6. Environment variables (build + runtime):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_NAME`
   - `VITE_SUPPORT_EMAIL`
7. Save & deploy. First build ~2 min.
8. Custom domain: add via Pages → Custom domains → (e.g. `app.awcgroup.co.uk`) → CNAME auto-configured.
9. Add `_redirects` file in `public/` for SPA fallback:
   ```
   /*  /index.html  200
   ```
10. Preview deployments automatic on every PR / branch push.

**Supabase post-deploy:**
- Set `SITE_URL` to production domain
- Add the production domain to Auth → URL Configuration → Additional Redirect URLs
- Deploy edge functions via `supabase functions deploy <name>`
- Set edge function secrets: `supabase secrets set RESEND_API_KEY=... RESEND_FROM_EMAIL=...`

---

## 17. THINGS NOT TO DO

All PoolPro/TreePro "don'ts" apply. Plus AWC-specific:

- Don't hardcode division colours anywhere — always `var(--brand-500)` or Tailwind `brand-*`
- Don't silo divisions in separate schemas/projects — they share tables, scoped by `division_slug`
- Don't assume a single division — `active` can be any of 5 (including Group). Guard every page that requires a specific division.
- Don't put customer emails in GBP format — that's for display; send RFC-formatted
- Don't precache HTML in Service Worker (stale deploy); `navigateFallback: null`
- Don't use `window.confirm/alert/prompt` — always styled Modal or Toast
- Don't use more than 5 bottom nav tabs
- Don't forget `pb-24 md:pb-8` on PageWrapper
- Don't import framer-motion — Tailwind keyframes handle everything
- Don't use Heroicons — Lucide only, for consistency
- Don't add a 5th button variant
- Don't theme hover/focus states with hardcoded brand colour — use `brand-500/30` or `brand-400` so they inherit the active division
- Don't query `.select('*, premises(*), clients(*)')` with nullable FKs — fetch parent then related in parallel

---

## 18. QUICK-START CHECKLIST

1. Clone `github.com/shaun622/awcgroup.git`
2. `npm install`
3. Copy `.env.example` to `.env.local`, fill in Supabase + Resend values
4. `npm run dev`
5. Apply migrations via Supabase SQL editor (or `supabase db push` if CLI set up)
6. Seed first business via Signup flow
7. Enable pest + fire divisions in Onboarding
8. Build out features in Phase order (§15)

---

**Tagline:** *One app. Four divisions. Zero compromise.*
