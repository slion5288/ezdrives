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

## Demo accounts

**Instructor (single account)**
- Password: `demo123` (there is also a one-click **Demo** button on the login page that
  signs you in without typing it).

**Students (demo logins)**
- Pick any seeded student from the list on the login page (one tap logs in as them):
  Aisha Khan, Liam Chen, Yuki Tanaka, Omar Hassan, Emma Wilson, Priya Patel.
- **Register:** name + phone + a mock 6-digit SMS code. The code is generated in the UI
  and shown in a toast labeled "Demo code" — enter it to register and auto-login.

## What is simulated

- **Auth** — no real backend or stored passwords; role/session is a localStorage flag.
- **SMS** — the 6-digit registration code is generated and displayed in a toast (demo).
- **Google Sheets sync** — there is no Google Sheets API. The store simulates the
  `WorkingHours / Appointments / Students / Notifications / Courses` tables locally and
  the "Synced" badge in the instructor shell just reflects the last mutation timestamp.
- **Calendar subscription** — the student profile shows a demo calendar-subscription
  link (Apple/Google style) plus a real client-side **ICS file export** (`src/utils/ics.ts`).
- **CSV export** — instructor schedule tab exports appointment records via
  `src/utils/csv.ts` (UTF-8 BOM for Excel).

## Build gate

`npm run build` must pass (`tsc --noEmit && vite build`). The i18n dictionaries
(`src/i18n/locales/en.ts` and `zh.ts`) must have identical key sets — currently
**328 keys each**, verified by a parity script during integration.
