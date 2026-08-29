#!/usr/bin/env node
// ============================================================================
// make-preview.mjs — bundle the production build into ONE self-contained file
// (Preview.html at the project root) that can be double-clicked and opened in
// any modern browser via file:// — no terminal, no server, no network needed.
//
// Why: Chrome blocks external ES-module <script src> on file:// pages (CORS),
// so the raw dist/ output cannot be opened directly. Inlining the module
// script (and the stylesheet) into the HTML fixes that.
//
// Usage: npm run make:preview   (runs `npm run build` first, then this script)
// ============================================================================

import { readFileSync, writeFileSync, rmSync, readdirSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Build a single-chunk (no code-splitting) variant so the lazy-loaded G1
// question bank is inlined too — the offline file must not depend on
// dynamically-imported chunk files (Chrome blocks module loads on file://).
const previewDist = join(root, '.preview-dist')
rmSync(previewDist, { recursive: true, force: true })
execSync('npx vite build --outDir .preview-dist', {
  cwd: root,
  env: { ...process.env, PREVIEW_INLINE: '1' },
  stdio: 'inherit',
})
const distDir = previewDist

let html = readFileSync(join(distDir, 'index.html'), 'utf8')

// --- Inline stylesheets (dist output uses relative "./assets/*.css") ---
html = html.replace(/<link[^>]+href="\.\/([^"]+\.css)"[^>]*>/gi, (_m, href) => {
  const css = readFileSync(join(distDir, href), 'utf8').replace(/<\/style>/gi, '<\\/style>')
  return `\n    <style>\n${css}\n    </style>`
})

// --- Inline JavaScript (dist output uses relative "./assets/*.js") ---
html = html.replace(/<script[^>]+src="\.\/([^"]+\.js)"[^>]*><\/script>/gi, (_m, src) => {
  const js = readFileSync(join(distDir, src), 'utf8').replace(/<\/script>/gi, '<\\/script>')
  return `\n    <script type="module">\n${js}\n    </script>`
})

// --- Drop leftover modulepreload/favicon asset links (nothing to load from disk) ---
html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>/gi, '')
html = html.replace(/<link[^>]+rel="icon"[^>]*>/gi, '')

// --- Safety gate: every asset must have been inlined ---
const leftover = html.match(/(?:src|href)="\.\/assets\//g)
if (leftover) {
  console.error(`✗ ${leftover.length} asset reference(s) were NOT inlined:`, leftover.slice(0, 5))
  process.exit(1)
}
if (!/type="module"/.test(html) || !/<style>/.test(html)) {
  console.error('✗ Inlined content missing (no module script or style block found).')
  process.exit(1)
}

const out = join(root, 'Preview.html')
writeFileSync(out, html)
console.log(`✓ Wrote ${out} (${(html.length / 1024).toFixed(0)} KB, single self-contained file)`)

// § file:// support: the hero photo must sit NEXT TO Preview.html — copy the
// public/hero folder to the project root so double-clicked previews show the
// Tesla hero image (the app also falls back to the bundled base64 on error).
const heroSrc = join(root, 'public', 'hero')
const heroDst = join(root, 'hero')
try {
  const files = readdirSync(heroSrc)
  mkdirSync(heroDst, { recursive: true })
  for (const f of files) {
    writeFileSync(join(heroDst, f), readFileSync(join(heroSrc, f)))
  }
  console.log(`✓ Copied public/hero → ${heroDst} (next to Preview.html)`)
} catch (e) {
  console.warn(`⚠ hero folder copy skipped: ${e.message}`)
}

console.log('  → Double-click Preview.html to open the app in your browser.')
