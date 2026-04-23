#!/usr/bin/env node
/**
 * Build-time generator for PWA icons and the apple-touch-icon.
 *
 * Renders the "AW" monogram from the same SVG used for the favicon into
 * 192×192 (any-purpose), 512×512 (maskable), and a 180×180 apple touch
 * icon. Written into public/ so Vite + vite-plugin-pwa pick them up.
 *
 * Run with: node scripts/generate-icons.js
 */

import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const OUT = join(ROOT, '..', 'public')

// Square SVG with generous padding so it survives maskable cropping (40% safe zone)
function svg({ size = 512, padRatio = 0.18, bg = '#1e2836', fg = '#ffffff' }) {
  const pad = Math.round(size * padRatio)
  const fontSize = Math.round((size - pad * 2) * 0.56)
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="${bg}"/>
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
            font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
            font-size="${fontSize}" font-weight="800" fill="${fg}" letter-spacing="-2">AW</text>
    </svg>
  `
}

async function main() {
  await mkdir(OUT, { recursive: true })

  // 192 — any purpose
  await sharp(Buffer.from(svg({ size: 512, padRatio: 0.10 })))
    .resize(192, 192)
    .png({ compressionLevel: 9 })
    .toFile(join(OUT, 'icon-192.png'))

  // 512 — maskable (needs 40% safe zone, so more padding)
  await sharp(Buffer.from(svg({ size: 512, padRatio: 0.22 })))
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(join(OUT, 'icon-512.png'))

  // 180 — apple touch icon (no transparent corners; iOS will round them)
  await sharp(Buffer.from(svg({ size: 512, padRatio: 0.10 })))
    .resize(180, 180)
    .flatten({ background: '#1e2836' })
    .png({ compressionLevel: 9 })
    .toFile(join(OUT, 'apple-touch-icon.png'))

  // Rewrite favicon.svg in case it's drifted
  await writeFile(join(OUT, 'favicon.svg'), svg({ size: 64, padRatio: 0.12 }).trim())

  console.log('✓ wrote icon-192.png, icon-512.png, apple-touch-icon.png, favicon.svg')
}

main().catch(e => { console.error(e); process.exit(1) })
