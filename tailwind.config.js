import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

// Use forward slashes — glob libraries treat backslash as escape on Windows.
const __dirname = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, '/')

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    `${__dirname}/index.html`,
    `${__dirname}/src/**/*.{js,jsx}`,
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Parent brand — AWC Group (graphite / navy)
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
          900: '#1e2836',
          950: '#111722',
        },
        // Pest Control — forest green
        pest: {
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
          400: '#4ade80', 500: '#16a34a', 600: '#15803d', 700: '#166534',
          800: '#14532d', 900: '#0f3d24', 950: '#052e16',
        },
        // Fire Safety — signal red
        fire: {
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
          400: '#f87171', 500: '#dc2626', 600: '#b91c1c', 700: '#991b1b',
          800: '#7f1d1d', 900: '#641212', 950: '#3f0a0a',
        },
        // Hygiene Services — medical cyan
        hygiene: {
          50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
          400: '#22d3ee', 500: '#0891b2', 600: '#0e7490', 700: '#155e75',
          800: '#164e63', 900: '#134050', 950: '#082f3b',
        },
        // Locksmith — amber gold
        locksmith: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
          400: '#fbbf24', 500: '#d97706', 600: '#b45309', 700: '#92400e',
          800: '#78350f', 900: '#5a2a0c', 950: '#361907',
        },
        // `brand` = currently active division, driven by CSS variables on <html>
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
      minHeight: { tap: '44px' },
      minWidth:  { tap: '44px' },
      boxShadow: {
        'card':       '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.03)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04)',
        'elevated':   '0 8px 24px -4px rgba(0,0,0,0.08), 0 4px 8px -4px rgba(0,0,0,0.04)',
        'nav':        '0 -1px 12px 0 rgba(0,0,0,0.06)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0,0,0,0.04)',
        'glow':       '0 0 20px rgb(var(--brand-500) / 0.15)',
        'glow-lg':    '0 0 40px rgb(var(--brand-500) / 0.20)',
        'soft-lift':  '0 10px 30px -10px rgba(0,0,0,0.12)',
        'pressed':    'inset 0 1px 2px 0 rgba(0,0,0,0.06)',
      },
      backgroundImage: {
        'gradient-brand':       'linear-gradient(135deg, rgb(var(--brand-500)) 0%, rgb(var(--brand-700)) 100%)',
        'gradient-brand-soft':  'linear-gradient(135deg, rgb(var(--brand-100)) 0%, rgb(var(--brand-50)) 100%)',
        'gradient-success':     'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'gradient-danger':      'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        'gradient-warm':        'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'gradient-page':        'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
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
        'out-expo':    'cubic-bezier(0.22, 1, 0.36, 1)',
        'in-out-soft': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
