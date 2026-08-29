# EZDRIVES — Build & Run Guide

> Written by the integration/verification agent after the final build gate passed.

## How to run

**No-terminal preview:** double-click **`Preview.html`** at the project root — a
single self-contained file (JS + CSS inlined) that works via `file://` in any
modern browser. Regenerate it after code changes with `npm run make:preview`.

```bash
npm install          # install dependencies (Vite 5, React 18, TS strict, react-router-dom v6, lucide-react)
npm run dev          # start the Vite dev server (default http://localhost:5173)
npm run build        # production build = tsc --noEmit && vite build → dist/
npm run preview      # serve the production build locally
npm run make:preview # build + inline everything into a single Preview.html (scripts/make-preview.mjs)
```

- Routing uses **HashRouter** so the app also runs from `file://` (no server needed).
  URLs look like `…/Preview.html#/student/book`.

- `npm run typecheck` runs `tsc --noEmit` alone.
- All state is client-side: the app seeds demo data into `localStorage` key `dw.state.v3`
  on first load and persists every mutation there (simulating the Google Sheets tables).
- Session lives in `dw.session.v1`; theme in `dw.theme`; language in `dw.locale`.
- `npm run reset` is not provided — use the **Reset demo** button on the instructor
  dashboard to restore seed data.

## Accounts

- **Instructor (single account)** — logs in on the「教练工作台」entry with the phone
  number or email registered for the instructor account + password (set by the site
  owner; never committed to this repo).
- **Students** — register on the「课程预约」page with name + email + phone + a real
  SMS verification code (Twilio Verify) + password; then log in with phone + password.

## What is real

- **Auth** — real backend (Cloudflare Pages Functions + D1): PBKDF2-hashed passwords,
  server sessions, phone/SMS verification via Twilio Verify, password reset via SMS.
- **Data** — courses / vehicles / videos / students / appointments / payments /
  notifications / enrollments all persist in D1; instructor writes go through the
  fine-grained `POST /api/instructor/actions` (versioned), student actions through
  `POST /api/student/actions`.
- **Payments** — cash / WeChat Pay / Interac e-Transfer only; the instructor confirms
  receipt before lessons unlock; students can never mark an order as paid themselves.
- **Calendar subscription** — real client-side **ICS file export** (`src/utils/ics.ts`).
- **CSV export** — instructor schedule tab exports appointment records via
  `src/utils/csv.ts` (UTF-8 BOM for Excel).

## Build gate

`npm run build` must pass (`tsc --noEmit && vite build`). The i18n dictionaries
(`src/i18n/locales/en.ts` and `zh.ts`) must have identical key sets — currently
**328 keys each**, verified by a parity script during integration.
