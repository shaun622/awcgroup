# AWC Group App — Design System & Port Brief

> **This supersedes the original Treemate/PoolPro brief.** Same spirit — mobile-first, soft shadows, tabular numerals, pill nav — but the AWC app has evolved it into something richer: CSS-variable-driven brand theming, first-class dark mode with a three-way toggle, a proper desktop top-tab layout, an auto-centering `FilterChips` component, shared `ConfirmModal` + `EmptyState`, nested modals via `zLayer`, and a Settings page whose Appearance section is the polish the old reference never had.
>
> Use this document to port the visual language into AWC's other apps **without rewriting their flow**. The target app's routes, data, and logic stay put — only the visual layer is replaced.

---

## 0. How to use this brief

Hand this file to a new Claude session working on a target app. Tell it:

> "Apply this design system to this app. Keep all existing routes, data hooks, and business logic untouched. Replace the visual layer only — tokens, theming, layout shells, primitive components, page skeletons. Work through §13 checklist in order and verify the app still works after each step."

**Golden rule:** treat this as a theme + component library swap, not a feature rewrite.

---

## 1. Design philosophy

Ten principles the AWC app applies consistently. Port these first — everything else is implementation detail.

1. **Soft over hard.** Multi-layer, low-opacity drop shadows (4–8% black) instead of bold borders. Buttons and cards almost float.
2. **Rounded, not rectangular.** `rounded-xl` (0.75rem) for interactive elements; `rounded-2xl` (1rem) for containers; `rounded-full` for pills. Hard corners are avoided.
3. **Tabular numbers everywhere.** `font-variant-numeric: tabular-nums` global on `body`. Prices, counts, stats all align.
4. **Smooth motion with custom easing.** `cubic-bezier(0.22, 1, 0.36, 1)` — decelerating without overshoot. Respects `prefers-reduced-motion`.
5. **Dynamic theming via CSS variables.** Brand colours are `--brand-50`…`--brand-950` as space-separated RGB triplets on `<html>`. Opacity modifiers just work: `bg-brand-500/40`.
6. **Dark mode is first-class.** Every component has light + dark variants. Three-way toggle (Light / System / Dark) persisted in localStorage. Inline script in `index.html` prevents FOUC.
7. **Mobile-first, desktop-enhanced.** Bottom nav on mobile (`md:hidden`), top tabs on desktop (`hidden md:block`). Modal is a bottom sheet on mobile, a centered card on desktop.
8. **Semantic colour discipline.** Success = emerald, warning = amber, danger = red. Don't invent new semantic colours.
9. **Accessibility is the default, not an audit pass.** `min-h-tap` / `min-w-tap` (44px), proper ARIA roles (`tablist`, `tab`, `dialog`), visible focus rings, reduced-motion handling.
10. **Quiet > loud.** Small text is `text-xs` / `text-sm`. Uppercase section labels use `tracking-wider`. Only page titles are `text-2xl+ font-bold`. Most text is 14–16px.

---

## 2. Tooling & dependencies

```json
{
  "dependencies": {
    "@fontsource-variable/inter": "^5.x",
    "@fontsource-variable/jetbrains-mono": "^5.x",
    "lucide-react": "^0.468.0",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x"
  },
  "devDependencies": {
    "tailwindcss": "^3.x",
    "postcss": "^8.x",
    "autoprefixer": "^10.x"
  }
}
```

- **Inter Variable** for body; **JetBrains Mono Variable** for tabular / code contexts.
- **lucide-react** is the only icon library. Don't mix Heroicons or Feather.
- Add a `cn()` utility if the target doesn't have one:
  ```js
  // src/lib/utils.js
  import { clsx } from 'clsx'
  import { twMerge } from 'tailwind-merge'
  export const cn = (...args) => twMerge(clsx(...args))
  ```

---

## 3. Color system

### 3.1 Brand colour (dynamic via CSS custom properties)

The brand colour is **not hardcoded** — it is set via CSS variables on `<html>` and consumed by Tailwind. Even if the target app has no concept of "divisions", use the pattern — it's how dark mode and any future theming stays clean.

**`src/styles/index.css`** — the essential excerpt:

```css
:root {
  /* default palette — replace with target app's primary colour scale */
  --brand-50:  240 249 255;
  --brand-100: 224 242 254;
  --brand-200: 186 230 253;
  --brand-300: 125 211 252;
  --brand-400: 56 189 248;
  --brand-500: 14 165 233;
  --brand-600: 2 132 199;
  --brand-700: 3 105 161;
  --brand-800: 7 89 133;
  --brand-900: 12 74 110;
  --brand-950: 8 47 73;
}
```

Values are space-separated RGB triplets (no commas, no `rgb(...)` wrapper). This is what makes the Tailwind consumer `rgb(var(--brand-N) / <alpha-value>)` format work.

### 3.2 Tailwind consumer format

**`tailwind.config.js`:**

```js
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
        sans: ['"Inter Variable"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card:          '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.03)',
        'card-hover':  '0 4px 12px 0 rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04)',
        elevated:      '0 8px 24px -4px rgba(0,0,0,0.08), 0 4px 8px -4px rgba(0,0,0,0.04)',
        'soft-lift':   '0 10px 30px -10px rgba(0,0,0,0.12)',
        'inner-soft':  'inset 0 2px 4px 0 rgba(0,0,0,0.04)',
        glow:          '0 0 20px rgb(var(--brand-500) / 0.15)',
        nav:           '0 -1px 12px 0 rgba(0,0,0,0.06)',
      },
      backgroundImage: {
        'gradient-brand':      'linear-gradient(135deg, rgb(var(--brand-500)) 0%, rgb(var(--brand-700)) 100%)',
        'gradient-brand-soft': 'linear-gradient(135deg, rgb(var(--brand-100)) 0%, rgb(var(--brand-50)) 100%)',
        'gradient-danger':     'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.25rem' },
      animation: {
        'fade-in':  'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-in': 'scaleIn 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
        'count-up': 'countUp 0.6s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        scaleIn: { '0%': { transform: 'scale(0.95)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        countUp: { '0%': { transform: 'translateY(8px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
      },
      spacing: { tap: '44px' }, // min-h-tap / min-w-tap
    },
  },
}
```

### 3.3 Semantic status colours

Use stock Tailwind palettes — **don't invent new ones**.

| Meaning | Palette | Light 50/700 | Dark 950/300 |
|---|---|---|---|
| Primary / info | `brand-*` | bg-brand-50 / text-brand-700 | bg-brand-950/40 / text-brand-300 |
| Success | `emerald-*` | bg-emerald-50 / text-emerald-700 | bg-emerald-950 / text-emerald-300 |
| Warning | `amber-*` | bg-amber-50 / text-amber-700 | bg-amber-950 / text-amber-300 |
| Danger | `red-*` | bg-red-50 / text-red-700 | bg-red-950 / text-red-300 |
| Neutral | `gray-*` | bg-gray-100 / text-gray-600 | bg-gray-800 / text-gray-300 |

Convention: surface `-50` / `-950` (often 40% opacity in dark), text `-700` / `-300`, ring `-200/50` / `-800/40`.

---

## 4. Dark mode

### 4.1 Strategy

- **Tailwind config:** `darkMode: 'class'`.
- **Class target:** `<html>` — `document.documentElement.classList.add('dark')`.
- **Persistence:** `localStorage` key (rename per app, e.g. `'appname:theme-mode'`). Values: `'light'` | `'dark'` | `'system'`.
- **Default:** `'system'`. Explicit user choice overrides.

### 4.2 FOUC prevention (do not skip)

Inline script in `index.html` `<head>`, **before** any stylesheets or scripts:

```html
<script>
  (function () {
    try {
      var t = localStorage.getItem('appname:theme-mode') || 'system';
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (t === 'dark' || (t === 'system' && prefersDark)) {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {}
  })();
</script>
```

Without this, users see a white flash on every reload.

### 4.3 ThemeContext

```jsx
// src/contexts/ThemeContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({ mode: 'system', setMode: () => {} })
const STORAGE_KEY = 'appname:theme-mode'

function applyMode(mode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', isDark)
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'system')

  useEffect(() => {
    applyMode(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyMode('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  return <ThemeContext.Provider value={{ mode, setMode: setModeState }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
```

### 4.4 Theme toggle — two variants

**Compact** (header — light ↔ dark only):

```jsx
<button
  onClick={() => setMode(isDark ? 'light' : 'dark')}
  className="min-h-tap min-w-tap rounded-xl p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
  aria-label="Toggle theme"
>
  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
</button>
```

**Full** (Settings → Appearance — three-mode segmented control):

```jsx
<div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-0.5">
  {[['light', Sun, 'Light'], ['system', Monitor, 'System'], ['dark', Moon, 'Dark']].map(([val, Icon, label]) => (
    <button
      key={val}
      onClick={() => setMode(val)}
      aria-pressed={mode === val}
      className={cn(
        'min-h-[36px] px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all',
        mode === val
          ? 'bg-brand-500 text-white shadow-sm'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
      )}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
      {label}
    </button>
  ))}
</div>
```

---

## 5. Typography

### 5.1 Fonts

```js
// src/main.jsx (top of file)
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
```

### 5.2 Global body feature flags

```css
body {
  font-family: 'Inter Variable', system-ui, -apple-system, sans-serif;
  font-feature-settings: 'cv11', 'ss01';
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
  color: rgb(17 24 39);
  background: rgb(248 250 252);
}
.dark body {
  color: rgb(243 244 246);
  background: rgb(3 7 18);
}
```

`cv11`, `ss01`, and `tabular-nums` are the small detail that makes numbers and characters look intentional.

### 5.3 Scale

| Use | Class | Size | Weight |
|---|---|---|---|
| Page title (H1) | `text-2xl sm:text-3xl font-bold tracking-tight` | 24/30 → 30/36 | 700 |
| Card heading | `font-semibold text-gray-900 dark:text-gray-100` | 16 | 600 |
| Body / input | (default) | 16 | 400 |
| Form label | `text-sm font-medium text-gray-600 dark:text-gray-400` | 14 | 500 |
| Section label | `.section-title` | 12 | 600 (UPPERCASE, `tracking-wider`) |
| Metadata | `text-xs text-gray-500 dark:text-gray-400` | 12 | 400 |
| Stat number | `text-2xl sm:text-3xl font-bold tabular-nums` | 24 → 30 | 700 |

Add this utility to `index.css`:

```css
.section-title {
  @apply text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400;
}
```

**Mobile rule:** every form input must be `font-size: 16px` — iOS zooms anything smaller on focus.

---

## 6. Spacing, radii, shadows, motion

### 6.1 Radii

| Element | Class | Value |
|---|---|---|
| Badges, chips (inactive) | `rounded-lg` | 0.5rem |
| Buttons, inputs, icon boxes | `rounded-xl` | 0.75rem |
| Cards, modals (desktop) | `rounded-2xl` | 1rem |
| Modal top (mobile sheet) | `rounded-t-3xl` | 1.25rem |
| Pills, dots, avatars | `rounded-full` | 9999px |

### 6.2 Shadows (see §3.2)

- Resting cards: `shadow-card`
- Hover cards: `shadow-card-hover` + `-translate-y-0.5`
- Modals / floating sheets: `shadow-elevated`
- Glow accents (empty states): `shadow-glow`

### 6.3 Motion

- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` — exposed as `--ease-out-expo`.
- **Durations:** 180ms (small), 250ms (default), 350ms (theme / page transitions).
- **Global transition rules in `index.css`:**
  ```css
  html { transition: background-color 0.35s var(--ease-out-expo), color 0.35s var(--ease-out-expo); }
  html * {
    transition-property: background-color, border-color, color, fill, stroke, box-shadow;
    transition-duration: 0.25s;
    transition-timing-function: var(--ease-out-expo);
  }
  @media (prefers-reduced-motion: reduce) {
    html, html * { transition: none !important; animation: none !important; }
  }
  ```

### 6.4 Safe areas (PWA / mobile)

Use iOS safe-area insets on sticky elements:

```jsx
<header style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>…</header>
<nav    style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>…</nav>
```

---

## 7. Layout shell (desktop is the priority)

This is the structure the user specifically called out. Copy it.

### 7.1 Tree

```
<ThemeProvider>
  <Router>
    <AppShell>
      <Header />           ← sticky, z-30, glass-blurred, 60px min height
      <DesktopNav />       ← md+ only, sticky top-[60px], z-20, horizontal tabs
      <main><Outlet /></main>
      <BottomNav />        ← md-down only, fixed bottom, z-40
    </AppShell>
  </Router>
</ThemeProvider>
```

### 7.2 Header — three-column, glass-blurred

```jsx
<header
  className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 dark:bg-gray-900/80 dark:border-gray-800/60"
  style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
>
  <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 py-3 min-h-[60px]">
    {/* LEFT: brand — logo box + wordmark */}
    <Link to="/" className="flex items-center gap-2 shrink-0">
      <div className="w-8 h-8 rounded-xl bg-brand-900 text-white flex items-center justify-center font-bold text-sm">
        AW
      </div>
      <span className="hidden sm:block font-bold text-gray-900 dark:text-gray-100">App Name</span>
    </Link>

    {/* CENTRE: page context (or division switcher) */}
    <div className="flex-1 min-w-0 flex items-center justify-center" />

    {/* RIGHT: search, theme toggle, avatar */}
    <div className="flex items-center gap-1 shrink-0">
      <button className="min-h-tap min-w-tap rounded-xl p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
        <Search className="w-5 h-5" />
      </button>
      <ThemeToggle />    {/* compact variant */}
      <Link to="/settings" className="min-h-tap min-w-tap rounded-xl p-2">
        <Avatar />
      </Link>
    </div>
  </div>
</header>
```

### 7.3 Desktop top tabs — the signature "tabs along the top" pattern

```jsx
<div className="hidden md:block sticky top-[60px] z-20 bg-slate-50/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200/60 dark:border-gray-800/60">
  <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 overflow-x-auto scrollbar-none">
    {TABS.map(({ to, label, Icon }) => {
      const active = matchPath(to, location.pathname)
      return (
        <NavLink
          key={to}
          to={to}
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
            active
              ? 'border-brand-500 text-brand-700 dark:text-brand-300'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
          )}
        >
          <Icon className="w-4 h-4" strokeWidth={2} />
          {label}
        </NavLink>
      )
    })}
  </div>
</div>
```

The **border underline** is the active marker. `-mb-px` hides the tab's own bottom border against the nav's bottom border.

### 7.4 Bottom nav (mobile) + More sheet

Five tabs: four most-used + "More". "More" opens a bottom sheet with the rest.

```jsx
<nav
  className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/60 dark:border-gray-800/60 z-40"
  style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
>
  <div className="grid grid-cols-5">
    {tabs.map(({ to, label, Icon }) => {
      const active = matchPath(to, location.pathname)
      return (
        <NavLink to={to} className="min-h-tap min-w-tap py-2 px-3 flex flex-col items-center gap-0.5">
          <Icon className={cn('w-5 h-5', active ? 'text-brand-600' : 'text-gray-500')}
                strokeWidth={active ? 2.5 : 2} />
          <span className={cn('text-[10px] font-medium', active ? 'text-brand-600 font-semibold' : 'text-gray-500')}>
            {label}
          </span>
        </NavLink>
      )
    })}
  </div>
</nav>
```

**More sheet:** bottom sheet with `rounded-t-3xl`, `animate-slide-up`, list of remaining nav items each with the brand icon-box pattern (see §8.3).

### 7.5 PageWrapper

```jsx
// src/components/layout/PageWrapper.jsx
const SIZES = { lg: 'max-w-lg', xl: 'max-w-2xl', xxl: 'max-w-4xl', full: 'max-w-6xl' }

export default function PageWrapper({ size = 'xl', className, children }) {
  return (
    <main className={cn(SIZES[size], 'mx-auto px-4 pt-4 pb-28 md:pb-12 animate-fade-in', className)}>
      {children}
    </main>
  )
}
```

`pb-28 md:pb-12` is critical — mobile needs clearance for the bottom nav.

---

## 8. Core UI primitives

Port in this order. Every page composition downstream assumes they exist.

### 8.1 Card

```jsx
export default function Card({ onClick, className, children, ...props }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'block w-full text-left bg-white rounded-2xl border border-gray-100 p-4 shadow-card transition-all duration-200 dark:bg-gray-900 dark:border-gray-800',
        onClick && 'cursor-pointer hover:shadow-card-hover hover:border-gray-200 hover:-translate-y-0.5 active:translate-y-0 dark:hover:border-gray-700',
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}
```

Pass `className="!p-0"` to remove default padding (e.g. for a Card wrapping a divided list).

### 8.2 StatCard

KPI tile with animated number, optional icon box, optional trend indicator.

```jsx
export default function StatCard({ label, value, icon: Icon, trend, trendLabel, onClick }) {
  const display = useAnimatedNumber(value)  // counts up from 0 over 600ms
  return (
    <Card onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {display.toLocaleString('en-GB')}
          </p>
          {trendLabel && (
            <div className={cn('mt-1.5 flex items-center gap-1 text-xs font-medium',
              trend > 0 && 'text-emerald-600 dark:text-emerald-400',
              trend < 0 && 'text-red-600 dark:text-red-400',
              trend === 0 && 'text-gray-500',
            )}>
              {trend > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : trend < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : null}
              {trendLabel}
            </div>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" strokeWidth={2} />
          </div>
        )}
      </div>
    </Card>
  )
}
```

### 8.3 Icon-box pattern (the most repeated motif)

```jsx
<div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
  <Icon className="w-5 h-5" strokeWidth={2} />
</div>
```

Appears in StatCard, Settings section rows, More sheet items, feature highlight cards. Memorise it.

Variants:
- **Destructive:** `bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400`
- **Empty state (large):** `w-16 h-16 rounded-2xl ... shadow-glow` with `Icon w-8 h-8`

### 8.4 Badge

```jsx
const VARIANTS = {
  default: 'bg-gray-100 text-gray-600 ring-gray-200/50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700/50',
  primary: 'bg-brand-50 text-brand-700 ring-brand-200/50 dark:bg-brand-950 dark:text-brand-300 dark:ring-brand-800/40',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200/50 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800/40',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200/50 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800/40',
  danger:  'bg-red-50 text-red-700 ring-red-200/50 dark:bg-red-950 dark:text-red-300 dark:ring-red-800/40',
}

export default function Badge({ variant = 'default', dot, children, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold ring-1 ring-inset', VARIANTS[variant], className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', DOT_COLOR[variant])} />}
      {children}
    </span>
  )
}
```

### 8.5 Button

```jsx
const VARIANTS = {
  primary:   'bg-gradient-brand text-white shadow-[0_4px_14px_-4px_rgb(var(--brand-500)/0.4)] hover:brightness-110',
  secondary: 'bg-white text-gray-700 border border-gray-200 shadow-card hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800',
  danger:    'bg-gradient-danger text-white shadow-[0_4px_14px_-4px_rgb(239_68_68/0.4)] hover:brightness-110',
  ghost:     'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
}
const SIZES = {
  sm: 'px-3 py-2 text-xs min-h-[36px] min-w-[36px]',
  md: 'px-5 py-3 text-sm min-h-tap min-w-tap',
  lg: 'px-6 py-4 text-base min-h-tap',
}

export default function Button({ variant = 'primary', size = 'md', leftIcon: L, rightIcon: R, loading, children, className, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed',
        VARIANTS[variant], SIZES[size], className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : L && <L className="w-4 h-4" />}
      {children}
      {!loading && R && <R className="w-4 h-4" />}
    </button>
  )
}
```

Four variants only — don't add a fifth.

### 8.6 Input / Textarea / Select

```css
/* index.css */
.input {
  @apply w-full rounded-xl border border-gray-200 bg-white px-4 py-3 min-h-tap shadow-inner-soft
         placeholder:text-gray-400 disabled:bg-gray-50 transition-all duration-200
         dark:bg-gray-900 dark:border-gray-800 dark:placeholder:text-gray-500;
  font-size: 16px;  /* stop iOS zoom */
  outline: none;
}
.input:focus {
  border-color: rgb(var(--brand-400));
  box-shadow: 0 0 0 3px rgb(var(--brand-500) / 0.20);
}
```

Wrap with a `<Field label hint error>` helper:

```jsx
<div className="space-y-1.5">
  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">{label}</label>
  {children}
  {error ? <p className="text-xs text-red-500 font-medium">{error}</p> : hint && <p className="text-xs text-gray-500">{hint}</p>}
</div>
```

### 8.7 Modal

Bottom sheet on mobile, centered card on desktop. Supports **nested modals** via `zLayer`.

```jsx
export default function Modal({ open, onClose, size = 'md', zLayer = 50, children }) {
  useScrollLock(open)
  if (!open) return null

  const SIZE = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return createPortal(
    <div className="fixed inset-0 flex items-end sm:items-center justify-center animate-fade-in" style={{ zIndex: zLayer }} role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60" onClick={onClose} />
      <div className={cn(
        'relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl w-full max-h-[92vh] flex flex-col shadow-elevated animate-slide-up sm:animate-scale-in',
        SIZE[size],
      )}>
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <span className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <div className="overflow-y-auto overscroll-contain px-6 pb-6 pt-4">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
```

`zLayer={60}` on a nested modal renders it above its parent (e.g. "Add new client" opened from within "Add new job").

### 8.8 ConfirmModal

```jsx
<Modal open={open} onClose={onClose} size="sm" zLayer={zLayer}>
  <div className="flex justify-center pt-2">
    <div className={cn(
      'w-14 h-14 rounded-2xl flex items-center justify-center',
      destructive
        ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
        : 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400',
    )}>
      <AlertTriangle className="w-7 h-7" strokeWidth={2} />
    </div>
  </div>
  <div className="text-center mt-4">
    <h3 className="text-lg font-bold">{title}</h3>
    {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
  </div>
  <div className="flex gap-2 mt-5">
    <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
    <Button variant={destructive ? 'danger' : 'primary'} onClick={run} loading={running} className="flex-1">
      {confirmLabel ?? 'Delete'}
    </Button>
  </div>
</Modal>
```

Never use `window.confirm` for user-facing confirmations.

### 8.9 FilterChips — the shared list-filter component

Scrollable pill strip with an **auto-centering active chip**. Use this anywhere a page has "status tabs".

```jsx
import { useEffect, useRef } from 'react'

export default function FilterChips({ options, value, onChange, ariaLabel, className }) {
  const activeRef = useRef(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [value])

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1 snap-x snap-mandatory md:snap-none', className)}
    >
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            ref={active ? activeRef : null}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all min-h-[36px] snap-center flex items-center gap-1.5',
              active ? 'bg-brand-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
            )}
          >
            {opt.label}
            {opt.count != null && (
              <span className={cn(
                'inline-flex items-center justify-center rounded-full min-w-[18px] h-[18px] px-1 text-[10px] tabular-nums',
                active ? 'bg-white/25 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400',
              )}>
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

The `scrollIntoView({ inline: 'center' })` call is the tiny detail that makes it feel intentional. `-mx-4 px-4` lets the row bleed to the screen edges while keeping buttons clickable inside the padded region.

Hide scrollbars globally:

```css
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { scrollbar-width: none; }
```

### 8.10 EmptyState

```jsx
<div className="flex flex-col items-center text-center py-16 px-6">
  <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center mb-4 text-brand-500 shadow-glow">
    <Icon className="w-8 h-8" strokeWidth={1.75} />
  </div>
  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">{description}</p>
  {action}
</div>
```

Never leave a list blank — always use EmptyState.

---

## 9. Page composition patterns

### 9.1 Page skeleton

```jsx
<PageWrapper size="full">
  {/* 1. Hero / page header */}
  <section className="mb-6 flex items-start justify-between gap-4">
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
    </div>
    <Button leftIcon={Plus} onClick={openCreate}>New …</Button>
  </section>

  {/* 2. Filter row (if applicable) */}
  <FilterChips className="mb-4" options={FILTERS} value={filter} onChange={setFilter} ariaLabel="…" />

  {/* 3. Content — sections of card lists */}
  <section className="mb-6">
    <h3 className="section-title mb-2 flex items-center gap-2">
      <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
      Section label
    </h3>
    <div className="space-y-3">
      {items.map(x => <RowCard key={x.id} …/>)}
    </div>
  </section>
</PageWrapper>
```

### 9.2 List row cards

```jsx
<Card onClick={() => navigate(`/jobs/${job.id}`)}>
  <div className="flex items-start gap-3">
    <DivisionDot slug={job.division_slug} className="mt-1.5" />
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{job.title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{job.client_name}</p>
    </div>
    <div className="shrink-0 text-right">
      <Badge variant={statusVariant(job.status)}>{statusLabel(job.status)}</Badge>
      <p className="text-[10px] text-gray-400 mt-1">{formatRelative(job.scheduled_date)}</p>
    </div>
  </div>
</Card>
```

### 9.3 Detail pages

- Header has title + subtitle + **Edit (pencil) + Delete (trash) icon buttons** on the right.
- Body is a stack of `<Card>`s, each with a `.section-title` heading above it.
- Edit opens a pre-filled create-modal (dual-mode pattern — same modal handles `create` + `edit` via `editing` prop).
- Delete opens `<ConfirmModal destructive>`.

### 9.4 Detail-row pattern (info cards)

Inside a `Card`, detail rows separated by hairline borders:

```jsx
<Card className="!p-0 divide-y divide-gray-100 dark:divide-gray-800">
  <DetailRow icon={Pin} label="Address" value="123 Beach Rd, Coogee" />
  <DetailRow icon={Phone} label="Phone" value="0412 345 678" />
  <DetailRow icon={Mail} label="Email" value="hello@example.com" />
</Card>

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{value || '—'}</div>
      </div>
    </div>
  )
}
```

`!p-0` overrides Card's default padding.

---

## 10. Settings → Appearance (the polish layer)

The user specifically called this out. It's what makes Settings "far far better" than the PoolPro reference.

```jsx
<PageWrapper size="xl">
  <h1 className="text-2xl font-bold mb-1">Settings</h1>
  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
    Signed in as <span className="font-medium text-gray-700 dark:text-gray-300">{user?.email}</span>
  </p>

  <div className="space-y-6">
    {/* Grouped row-linked sections in one divided card */}
    <Card className="!p-0 divide-y divide-gray-100 dark:divide-gray-800">
      {SECTIONS.map(s => (
        <Link key={s.to} to={s.to} className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
            <s.Icon className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-gray-100">{s.label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.description}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        </Link>
      ))}
    </Card>

    {/* Appearance — separate card under its own section-title */}
    <div className="space-y-2">
      <h2 className="section-title">Appearance</h2>
      <Card className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">Theme</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Choose light, dark, or match your system
          </p>
        </div>
        <ThemeToggle />  {/* three-mode segmented control */}
      </Card>
    </div>
  </div>
</PageWrapper>
```

What makes it feel right:

1. A **row-link card** with divider lines (not a stack of separate cards) — reads like a grouped table.
2. Each row uses the **icon-box pattern** — same motif as everywhere else.
3. Chevron on the right hints at navigation without shouting.
4. Appearance is its **own small card** under a `.section-title` — grouped by purpose.
5. The toggle is a **segmented control with three options**, not a two-way switch — the single biggest polish over the PoolPro reference.

---

## 11. Division-aware theming (optional)

If the target app has a concept of "modes / product lines / areas", copy this pattern. Otherwise ignore.

A `DivisionProvider` sets a theme class on `<html>` (e.g. `theme-pool`, `theme-pest`). Each class overrides `--brand-*`:

```css
.theme-pool {
  --brand-50:  239 246 255;
  /* … through … */
  --brand-950: 23 37 84;
}
.theme-pest {
  --brand-50:  240 253 244;
  --brand-950: 5 46 22;
}
```

Changing the active division swaps the class on `<html>`, and because of the global transition rules in §6.3, the entire UI re-tints over 350ms.

A `DivisionSwitcher` pill strip in the header centre column uses the same `scrollIntoView({ inline: 'center' })` trick as `FilterChips`.

---

## 12. What to keep vs. what to change in the target app

### Keep (do not touch)

- All routes and navigation targets.
- All data hooks (`useXyz` that load from the target's backend).
- All contexts unrelated to theming (auth, business, permissions).
- All business logic (validation rules, state machines, mutations).
- Environment configuration, build config, deployment.

### Replace

- `tailwind.config.js` → update with §3.2.
- Global CSS (usually `index.css` or `globals.css`) → update with §3.1, §5.2, §6.3, `.section-title`, `.input`, `.card`, `.scrollbar-none`.
- Any existing ThemeContext → replace with §4.3.
- All primitive components (Button, Card, Badge, Input, Modal, etc.) → replace with §8.
- Layout shell (AppShell / Header / top nav / bottom nav / page wrapper) → replace with §7.
- Settings page → restructure per §10.

### Add (if missing)

- `ThemeProvider` wrapping the app at the root.
- Inline FOUC script in `index.html` (§4.2).
- `FilterChips` component (§8.9).
- `ConfirmModal` + `EmptyState` components (§8.8, §8.10).
- `cn()` utility if not present (§2).
- Inter + JetBrains Mono variable fonts imported at entry (§5.1).
- `min-h-tap` / `min-w-tap` spacing token (§3.2).
- `.section-title` utility class (§5.3).

---

## 13. Porting checklist (work through in order)

Verify the app still runs after each step. Don't batch.

1. **Install deps:** `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`, `clsx`, `tailwind-merge`, `lucide-react` (if missing).
2. **Update `tailwind.config.js`** with the extend block from §3.2. Set `darkMode: 'class'`.
3. **Update `src/styles/index.css`**: `:root { --brand-* }`, body font + feature-settings + tabular-nums, html + html * transitions, `.section-title`, `.input`, `.card`, `.scrollbar-none`, reduced-motion media query.
4. **Add fonts to `main.jsx`:** imports at top.
5. **Add FOUC script** to `index.html` `<head>` (§4.2). Use a target-app-specific storage key.
6. **Add `ThemeContext`** (§4.3), wrap the app at the root.
7. **Add `cn()` utility** if missing.
8. **Port primitives in this order:** Card → StatCard → Badge → Button → Input/Textarea/Select → Modal → ConfirmModal → FilterChips → EmptyState. After each, swap its usages on one page and verify.
9. **Port layout shell:** Header → DesktopNav → BottomNav → MoreSheet → PageWrapper. Wire in ThemeToggle (both compact + full).
10. **Rebuild Settings page** per §10.
11. **Update each domain page** to follow the §9 skeleton. Data hooks stay untouched.
12. **Smoke-test in both light and dark modes** at mobile (375px) and desktop (1280px) viewports:
    - Header, tabs, page content, bottom nav all render correctly in both modes — no colour leaks.
    - FilterChips centre the active chip on change.
    - Modals bottom-sheet on mobile, centre on desktop.
    - Focus rings visible on all interactive elements.
    - No console errors, no layout jumps.

---

## 14. Things NOT to do

- **Don't use `bg-white` at the body level in light mode.** Use the global body background (`bg-slate-50`-equivalent). Cards sit on top of that, and the contrast is the point.
- **Don't use sharp corners.** Minimum `rounded-xl` on inputs/cards/buttons.
- **Don't introduce a 5th button variant.** The four are enough.
- **Don't use raw black or pure white.** `text-gray-900` light / `text-gray-100` dark is the deepest.
- **Don't use shadows other than the defined tokens.** `shadow-card`, `shadow-card-hover`, `shadow-elevated`, `shadow-nav`, `shadow-glow`, `shadow-soft-lift`.
- **Don't put more than 5 items in the bottom nav.** Use a "More" sheet for overflow.
- **Don't forget `pb-28 md:pb-12` on PageWrapper** — mobile content will hide under the bottom nav.
- **Don't use `backdrop-blur` inside Modals** — Safari perf dies. Solid `bg-gray-900/40` / `bg-black/60` backdrops only.
- **Don't use `window.confirm` / `alert` / `prompt`** for anything user-facing. Always a styled Modal.
- **Don't import framer-motion or any animation library.** Tailwind transitions + custom easing handle everything.
- **Don't forget `min-h-tap` / `min-w-tap` on interactive elements.** iOS HIG minimum is 44px.
- **Don't use `rounded-full` on buttons.** Only for pills, badges, dots, and nav indicators.
- **Don't hardcode brand colours.** Always use `brand-*` Tailwind tokens backed by CSS variables.
- **Don't skip the FOUC script.** A theme flash on every reload is the single most visible "cheap app" tell.
- **Don't wire dark mode by toggling `media`.** Use `class` strategy so the user can override their OS preference.

---

## 15. Lessons from the field (hard-won — AWC era)

- **`backdrop-blur` inside Modals** lags badly on iOS Safari. Use solid `bg-gray-900/40` backdrops.
- **Modal scroll lock:** locking `body` overflow doesn't work on iOS. Lock `html` with `position: fixed` + saved scroll position.
- **iOS input zoom:** any input with `font-size < 16px` triggers auto-zoom on focus. The `.input` class enforces 16px.
- **CSS-variable brand colours** are essential for dark mode and any theming. Don't try to do it with Tailwind classes alone — you'll end up duplicating every component.
- **Inline FOUC script** must be the first thing in `<head>`. Deferring it to React mount flashes the wrong theme on every reload.
- **Three-mode theme toggle beats two-mode.** Light / System / Dark gives the user respect for their OS preference while still letting them override.
- **`scrollIntoView({ inline: 'center' })` on active chip change** in FilterChips and DivisionSwitcher is the tiny detail that makes the whole app feel considered.
- **Nav active state:** an underline border (`border-b-2 border-brand-500 -mb-px`) on desktop tabs beats pill-bg, text-color-only, and dot-below. On mobile bottom nav, the 2px top line still wins.
- **Nested modals via `zLayer` prop** (default 50, inner 60) lets you open "Add new client" from inside "Add new job" without the parent unmounting. The `__add__` sentinel value in select dropdowns triggers the nested modal.
- **Dual-mode modals** (same modal handles create + edit via `editing` prop) are cleaner than a separate EditX modal per entity. Hydrate from `editing` with a `fromRecord(editing)` helper.
- **Fire-and-forget activity logging** (write to `activity_feed` in parallel with the primary mutation, never await, never block) keeps the UI fast even when the activity write hiccups.
- **Tabular numerals on body** (`font-variant-numeric: tabular-nums`) is the single line of CSS that makes prices, counts, and stats look professional.
- **Icon-box pattern** (`w-10 h-10 rounded-xl bg-brand-50 text-brand-600`) is the most repeated motif — reuse it in Settings rows, StatCard icons, More sheet items, EmptyState (sized up). Don't invent a new icon treatment.
- **`!p-0` on Cards that wrap divided lists** is the one-line escape hatch — overrides Card's default padding so `divide-y` works cleanly.
- **Realtime/optimistic updates:** trust the local state mutation, then refetch in the background. Never block the UI on a server round-trip after a save.
- **Confirmation modals for "this one vs all future":** if the target domain has recurring items, always offer the two buttons in the same modal — never make the user choose in advance.
- **When "Claude in session A" and "Claude in session B" are working from the same design system,** the shared icon-box, `.section-title`, and `FilterChips` patterns are what keep the apps feeling like siblings even if no one coordinates.

---

## 16. Reference files in the AWC app

All paths relative to `AWC Group App/`. When in doubt, read the source.

| What | Path |
|---|---|
| Tailwind config | `tailwind.config.js` |
| Global CSS | `src/styles/index.css` |
| FOUC script + HTML head | `index.html` |
| ThemeContext | `src/contexts/ThemeContext.jsx` |
| ThemeToggle | `src/components/layout/ThemeToggle.jsx` |
| AppShell | `src/components/layout/AppShell.jsx` |
| Header | `src/components/layout/Header.jsx` |
| DesktopNav (top tabs) | `src/components/layout/DesktopNav.jsx` |
| BottomNav | `src/components/layout/BottomNav.jsx` |
| MoreSheet | `src/components/layout/MoreSheet.jsx` |
| PageWrapper | `src/components/layout/PageWrapper.jsx` |
| Card, StatCard, Badge, Button, Input, Modal, ConfirmModal, FilterChips, EmptyState | `src/components/ui/` |
| Settings page (Appearance section) | `src/pages/Settings.jsx` |
| Example list page (FilterChips + cards) | `src/pages/Jobs.jsx` |
| Example detail page (Edit + Delete) | `src/pages/JobDetail.jsx` |
| Example dashboard (StatCard grid + activity) | `src/pages/Dashboard.jsx` |

---

## 17. One-paragraph summary

Replace the target app's visual layer with: CSS-variable-driven brand tokens, class-based dark mode with a three-option toggle and FOUC-safe init script, Inter Variable + tabular numerals, `rounded-xl`/`rounded-2xl` shapes with soft multi-layer shadows, a sticky glass-blurred header over a sticky underlined-tab desktop nav, a 5-slot mobile bottom nav with a "More" sheet, a shared scrollable-pill `FilterChips` with auto-centering active state, dual-mode modals that bottom-sheet on mobile and centre on desktop, and a Settings page built as a divided row-link card with a dedicated Appearance subsection. Everything else in the target — its routes, data, auth, business logic — stays untouched.

**Tagline:** *Soft on slate. Dynamic brand. Dark mode by default. Nothing fancier than it needs to be.*
