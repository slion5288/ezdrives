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

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(root, 'dist')

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
console.log('  → Double-click Preview.html to open the app in your browser.')
