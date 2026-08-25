# EZDRIVES — Technical Architecture (code contract)

> **Status:** v1.0 · **Audience:** all agents working in this repo.
> **Authority order:** `docs/SPEC.md` (product source of truth) → this document (code contract) → `docs/DESIGN.md` (design tokens/system). When this document and DESIGN.md conflict, this document wins for behavior and data; DESIGN.md wins for visual tokens.
> **Language of this document:** English. The product UI is bilingual EN (default) / ZH (Simplified) via the i18n contract in §7 — no user-facing string is ever hardcoded in JSX.
> **Bilingual data:** entity display text (course/vehicle names, notification bodies, bios) uses `{ en, zh }` object fields; everything else uses i18n keys.

---

## 1. FINAL TECH STACK & RATIONALE

**Vite 5 + React 18 + TypeScript (strict) + react-router-dom v6 + lucide-react**, with **plain CSS driven by design tokens**, a **custom context-based i18n** layer, a **localStorage-backed data store** that simulates the Google Sheets tables from the spec, **hand-rolled SVG charts**, and **no backend at all** — the whole product is a fully client-side demo: there is no Google Sheets API; the store simulates the sheets tables locally, and a small "Synced" indicator (fed by `getLastSyncISO()`, §4) claims Google Sheets sync purely for demo flavor. The stack is deliberately minimal so the demo builds fast and stays portable: Vite 5 for instant dev/build with zero config, React 18 + strict TypeScript for safe concurrent agent edits (type errors catch contract drift before it ships), react-router-dom v6 for declarative role-guarded routes, lucide-react for the icon set, hand-rolled SVG for zero-dependency charts, and plain tokenized CSS (no UI kit, no CSS framework) to keep every pixel under design control and to make dark mode a one-attribute switch (§11).

---

## 2. FILE OWNERSHIP TABLE

Every source path belongs to **exactly one owner**. **Do not edit files outside your ownership rows.** When a change needs a foreign file, file a request to its owner (or to the architecture agent) instead of editing it. The **integration/verification agent** is the sole exception: it may edit **any** file to fix the build (it owns the final `npm run build` gate).

| Path (glob) | Owner | Notes |
| --- | --- | --- |
| `docs/*` | **architecture + design agents only** | Spec (source of truth), this architecture contract, design system. No code agent edits docs. |
| `src/styles/*` | **core agent only** | `tokens.css` and any CSS-variable infrastructure. |
| `src/i18n/*` | **core agent only** | Provider, hook, locale dictionaries (§7). |
| `src/data/*` | **core agent only** | `types.ts`, `store.ts`, `timeEngine.ts`, `stats.ts`, `seed.ts` (§3–§6, §10). |
| `src/main.tsx`, `src/App.tsx` | **shell agent only** | Entry point, router, layout shell. |
| `src/components/shared/*` | **shell agent only** | Header, nav, ThemeToggle, LanguageToggle, synced indicator, shared UI primitives. |
| `src/components/calendar/*` | **shell agent only** | Shared slot-grid / week calendar components used by student booking and instructor schedule. |
| `src/components/charts/*` | **shell agent only** | Hand-rolled SVG charts (donut, line, bar). |
| `src/pages/auth/*` | **shell agent only** | `LoginPage`. |
| `src/pages/landing/*` | **landing agent only** | `LandingPage` and its styles. |
| `src/pages/student/*` | **student agent only** | The four student pages (§8). |
| `src/utils/ics.ts` | **student agent only** | ICS calendar-file generation. |
| `src/pages/instructor/*` | **instructor agent only** | `InstructorDashboardPage` and its tab views. |
| `src/utils/csv.ts` | **instructor agent only** | CSV export of appointment records. |
| `src/vite-env.d.ts`, `index.html`, `vite.config.ts`, `tsconfig.json`, `package.json` | **shell agent only** | Root shell/config files (fixes must pass through the integration agent's build gate anyway). |
| **any path** | **integration/verification agent** | May edit ANY file to fix the build. Sole exception to the table. |

**Directory layout (target state, built by the owners above):**

```
src/
  main.tsx                      # shell — mounts <App/>
  App.tsx                       # shell — <I18nProvider><Theme><Routes…/></Theme></I18nProvider>
  styles/tokens.css             # core — :root light + [data-theme='dark'] tokens
  i18n/                         # core — I18nProvider.tsx, useT/useLocale, locales/en.ts, locales/zh.ts
  data/                         # core — types.ts, store.ts, timeEngine.ts, stats.ts, seed.ts
  utils/                        # ics.ts (student), csv.ts (instructor) — nothing else lives here
  components/
    shared/                     # shell
    calendar/                   # shell
    charts/                     # shell
  pages/
    landing/LandingPage.tsx     # landing
    auth/LoginPage.tsx          # shell
    student/…                   # student
    instructor/…                # instructor
```

---

## 3. DATA MODEL

Interfaces live in `src/data/types.ts` (core-owned) and are re-exported from `src/data/store.ts` so every page imports types from one place. **Field names below are final** — the entire app compiles against them. Fields marked `// optional` are deliberate extensions; do not remove base fields.

```ts
// ===== src/data/types.ts =====
export interface Course {
  id: string
  name: { en: string; zh: string }
  description: { en: string; zh: string }
  price: number                 // CAD
  durationMin: 60 | 90
  active: boolean
}

export interface Vehicle {
  id: string
  make: string
  model: string
  plate: string
  color: { en: string; zh: string }
  photoUrl: string | null
  active: boolean
}

export interface WeeklyRule {
  weekday: number               // 0 = Sunday .. 6 = Saturday
  startMin: number              // minutes from midnight, e.g. 540 = 09:00
  endMin: number                // minutes from midnight, exclusive bound, e.g. 1080 = 18:00
}

export interface DayException {
  date: string                  // 'YYYY-MM-DD' (local)
  closed: boolean               // true = whole day closed
  startMin?: number             // override open time (minutes from midnight), when closed === false
  endMin?: number               // override close time (minutes from midnight), when closed === false
  note?: { en: string; zh: string }
}

export interface Appointment {
  id: string
  studentId: string
  courseId: string
  start: string                 // ISO local datetime, e.g. '2024-03-12T14:00:00' (see §5)
  end: string                   // ISO local datetime = start + course.durationMin
  status: 'confirmed' | 'cancelled' | 'pending'
  history: { at: string; note: { en: string; zh: string } }[]   // change log, newest last
  createdAt: string             // ISO local datetime
  reminded?: boolean            // optional — 2h-reminder flag (demo)
}

export interface Student {
  id: string
  name: string
  phone: string                 // stored full; display always via maskPhone() (§4)
  registeredAt: string          // ISO local datetime
  avatarColor: string           // CSS color token name or hex for avatar badge
  email?: string                // optional — used as ICS "to" contact
}

export interface Notification {
  id: string
  role: 'student' | 'instructor'
  recipientId: string           // studentId for role 'student', instructor id ('instructor') for 'instructor'
  type: string                  // one of: 'booking_confirmed' | 'booking_cancelled' | 'booking_rescheduled'
                                //         | 'reminder_2h' | 'day_closed' | 'new_booking'
  title: { en: string; zh: string }
  body: { en: string; zh: string }
  read: boolean
  at: string                    // ISO local datetime
}

export interface AppState {
  instructor: {
    name: string
    phone: string
    email: string
    bio: { en: string; zh: string }
    rating: number              // e.g. 4.9
    yearsExperience: number     // e.g. 9
    avatarColor: string
  }
  weeklyRules: WeeklyRule[]
  exceptions: DayException[]
  courses: Course[]
  vehicles: Vehicle[]
  students: Student[]
  appointments: Appointment[]
  notifications: Notification[]
}
```

**Storage & identity rules**
- Persistence key: **`dw.state.v1`** (localStorage), JSON-serialized `AppState`. Session key: `dw.session.v1` (§9).
- New runtime ids are generated by the store as `<prefix><maxNumericSuffix + 1>` (`c`, `v`, `s`, `a`, `n`) so user-created entities never collide with seeded ids (`c1`, `a1`, …). Seed ids are fixed (§10).
- All datetimes are **local time, no timezone library**: serialized as `'YYYY-MM-DDTHH:mm:ss'` (no `Z`); date keys are `'YYYY-MM-DD'` in local time (pad month/day). Never use `toISOString()` for business timestamps.

---

## 4. STORE API (`src/data/store.ts`)

Singleton store. On module load it reads `dw.state.v1`; if absent, it seeds from `seed.ts` (§10) and persists. Every mutator: **deep-clones → mutates the clone → persists → updates the demo sync stamp → notifies subscribers**. Between mutations `getState()` returns the same reference (referential stability), which keeps `useSyncExternalStore` correct.

```ts
// ===== src/data/store.ts =====
export function getState(): AppState                       // current immutable snapshot — treat as read-only
export function subscribe(l: () => void): () => void       // returns unsubscribe fn
export function useAppState(): AppState                    // useSyncExternalStore(subscribe, getState)

export function bookAppointment(studentId: string, courseId: string, startISO: string):
  { ok: true; appointment: Appointment } | { ok: false; error: 'conflict' | 'closed' | 'past' }
  // validates: course active; start aligned to a 30-min boundary; every consecutive 30-min unit the
  // course needs (durationMin 60 → 2 units, 90 → 3) is inside working hours, not past, not taken.
  // On success: creates the confirmed Appointment, appends a history entry, notifies student
  // ('booking_confirmed') and instructor ('new_booking'). 'conflict' = any unit already taken;
  // 'closed' = day closed / outside working hours; 'past' = start before now.

export function cancelAppointment(id: string, reason?: string): void
  // status → 'cancelled', appends history entry, frees the slot (engine recomputes availability),
  // notifies student ('booking_cancelled') and instructor ('booking_cancelled').

export function rescheduleAppointment(id: string, newStartISO: string):
  { ok: true } | { ok: false; error: string }
  // full validity check (same rules as bookAppointment, excluding the appointment itself);
  // on success updates start/end, appends history entry, notifies student ('booking_rescheduled').

export function batchReschedule(ids: string[], newStartISO: string):
  { moved: string[]; failed: { id: string; error: string }[] }
  // each id runs the reschedule check independently; valid ones move (and notify), invalid ones
  // report per-id errors and keep their original time.

export function setWeeklyRules(rules: WeeklyRule[]): void
  // replaces weeklyRules; on save, AUTO-CANCELS every confirmed appointment that no longer fits the
  // new rules (per spec) and notifies each affected student ('day_closed'/'booking_cancelled').

export function addException(exp: DayException): void      // upsert by date
export function removeException(date: string): void        // date 'YYYY-MM-DD'

export function saveCourse(c: Course): Course              // upsert by id; id '' → store assigns next 'c…'
export function deleteCourse(id: string): void             // refuses/keeps appointments consistent (see note)
export function toggleCourse(id: string): void             // flips active

export function saveVehicle(v: Vehicle): Vehicle           // upsert by id; id '' → store assigns next 'v…'
export function deleteVehicle(id: string): void

export function addStudent(name: string, phone: string): Student
  // registers a new Student and AUTO-LOGS-IN as them (demo register flow); returns the new Student.
export function loginInstructor(password: string): boolean // true iff password === 'demo123'
export function loginAsStudent(id: string): void
export function logout(): void
export function getSession(): { role: 'student' | 'instructor' | null; studentId?: string }

export function markNotificationRead(id: string): void
export function markAllRead(role: 'student' | 'instructor', recipientId: string): void

export function resetDemo(): void                          // re-runs seed, clears session, persists
export function getLastSyncISO(): string                   // demo "synced" stamp (ISO local), refreshed on
                                                           // every mutation — feeds the shell's sync badge
export function maskPhone(phone: string): string           // display mask, e.g. '(416) ***-1234'
```

**Semantic notes**
- `deleteCourse`/`deleteVehicle` set `active = false` instead of removing rows when referenced rows exist (keeps history/notifications coherent); rows with no references are hard-deleted. The UI presents both as "deleted".
- The notification engine is internal to the store (never call it from pages): triggers are fired exactly as listed in §3's `Notification.type` set — booking/reschedule/cancel, rule-save auto-cancel, and the demo 2h reminder (surfaced on the student dashboard as a banner computed from upcoming confirmed appointments).
- Nothing else may mutate `AppState` — pages read via `useAppState()` and act only through the functions above.

---

## 5. TIME ENGINE (`src/data/timeEngine.ts`)

Pure functions; no side effects, no state. All `Date` values are local. Granularity is **30 minutes**; a working interval `[startMin, endMin)` (minutes from midnight) is expanded into 30-min units. The effective interval for a date is: a `DayException` for that date with `closed: true` → no interval; a `DayException` with `closed: false` → `[startMin, endMin)` (**override** replaces weekly rules for that date); otherwise the matching `WeeklyRule` for that weekday (no rule → no interval).

```ts
// ===== src/data/timeEngine.ts =====
export interface Slot {
  start: Date                  // 30-min unit start, aligned to :00 / :30
  end: Date                    // start + 30 min
  available: boolean
  takenById?: string           // set when closedReason === 'booked' — the student who holds it
  closedReason?: 'closed' | 'override' | 'past' | 'booked'   // present iff available === false
}
// 'closed'   → day closed or no working hours that day
// 'override' → unit outside the override interval on an override day
// 'past'     → unit start is before "now"
// 'booked'   → a confirmed/pending appointment covers any part of this unit

export function generateSlots(date: Date, state: AppState): Slot[]
  // All 30-min units of the date's effective interval, in chronological order. A unit is
  // available iff it is inside the interval AND not past AND not covered by any
  // confirmed/pending appointment. Past dates return [].

export function getWeekSlots(weekStart: Date, state: AppState): Record<string, Slot[]>
  // Keys are the 7 consecutive 'YYYY-MM-DD' dates starting at weekStart (caller passes the first
  // displayed day, typically Monday); values are generateSlots(date, state) for each.

export function isConflict(startISO: string, endISO: string, state: AppState,
  exceptAppointmentId?: string): boolean
  // true iff a confirmed/pending appointment (other than exceptAppointmentId) overlaps
  // [start, end). Overlap-only check — closed/past validation lives in the store (§4).

// Shared local-datetime helpers (also core-owned; the ONLY datetime utilities in the app):
export function toLocalISO(d: Date): string        // 'YYYY-MM-DDTHH:mm:ss' local, no Z
export function fromLocalISO(s: string): Date      // parse local ISO
export function dateKey(d: Date): string           // 'YYYY-MM-DD' local
export function parseDateKey(s: string): Date      // local midnight
export function addDays(d: Date, n: number): Date
export function addMinutes(d: Date, n: number): Date
export function startOfDay(d: Date): Date
export function formatHM(d: Date): string          // '09:00'
```

**Booking geometry.** A booking occupies `durationMin / 30` consecutive units (60 → 2, 90 → 3). `bookAppointment`/`rescheduleAppointment` require **all** required consecutive units available; `generateSlots` marks a unit `booked` when *any* confirmed/pending appointment covers any part of it (so 90-min bookings visually occupy their three units).

---

## 6. STATS API (`src/data/stats.ts`)

Pure functions over `AppState`. "This month" = the current calendar month in local time. Only **confirmed** appointments count (cancelled/pending excluded). Charts render from these only.

```ts
// ===== src/data/stats.ts =====
export interface MonthStats { lessons: number; revenue: number; newStudents: number }
export function monthStats(state: AppState): MonthStats
  // lessons: confirmed appointments starting this month; revenue: sum of their course.price (CAD);
  // newStudents: students with registeredAt within this month.

export function courseDistribution(state: AppState): { courseId: string; count: number }[]
  // confirmed appointments grouped by courseId, sorted count desc; courses with zero confirmed
  // bookings are omitted (donut chart renders from this).

export function bookingsTrend(state: AppState, days?: number): { date: string; count: number }[]
  // default days = 14. One entry per 'YYYY-MM-DD' for the last `days` days ending today (inclusive),
  // zero-filled; count = confirmed appointments starting that day.

export function peakHours(state: AppState): { hour: number; count: number }[]
  // confirmed appointments grouped by start hour (0–23), sorted hour asc; bar chart input.
```

---

## 7. I18N CONTRACT (`src/i18n/`)

Custom React context; **no i18n library**. EN is the default locale.

```tsx
// ===== src/i18n/ =====
export function I18nProvider({ children }: { children: React.ReactNode }): JSX.Element
  // reads 'dw.locale' (localStorage) on mount; default 'en'; wraps the app.

export function useT(): (key: string, vars?: Record<string, string | number>) => string
  // returns the message for `key` in the active locale; interpolates {var} placeholders
  // (e.g. useT()('common.greeting', { name: 'Aisha' }) with message "Hello {name}").
  // Missing key → returns the key string verbatim (never crashes).

export function useLocale(): 'en' | 'zh'
export function setLocale(l: 'en' | 'zh'): void      // re-renders all consumers; persists 'dw.locale'
```

**Dictionaries** — `src/i18n/locales/en.ts` and `src/i18n/locales/zh.ts`. Each exports a **flat** record, e.g. `export const messages: Record<string, string> = { 'nav.home': 'Home', … }`. **BOTH locales MUST have identical key sets** (the key of `en.ts` and `zh.ts` must be the same set — a dev-time parity check in the integration build gate enforces this; ZH is Simplified Chinese).

**Required key namespaces** (prefix convention; both locales):

| Namespace | Covers |
| --- | --- |
| `landing.*` | hero, features, how-it-works, CTA, footer |
| `nav.*` | header nav, language toggle, theme toggle labels |
| `auth.*` | login, role select, register, demo-code toast, errors |
| `student.dashboard.*` | upcoming lessons, history, ICS export, cancel |
| `student.booking.*` | slot grid, course picker, confirm dialog, "Slot taken" |
| `student.profile.*` | profile fields, notifications settings (display only) |
| `student.notifications.*` | notification list, mark-all-read |
| `instructor.overview.*` | stats cards, KPI labels |
| `instructor.schedule.*` | calendar, reschedule, batch move, CSV export |
| `instructor.workinghours.*` | weekly rules editor, exceptions, auto-cancel warning |
| `instructor.courses.*` | course CRUD |
| `instructor.vehicles.*` | vehicle CRUD |
| `instructor.notifications.*` | instructor notification list |
| `calendar.*` | day/week headers, month names, empty states |
| `stats.*` | chart titles, axis labels, legends, tooltips |
| `courses.*` | shared course display strings (student-facing) |
| `vehicles.*` | shared vehicle display strings (student-facing) |
| `common.*` | buttons, toasts, confirm dialogs, errors, empty states |
| `ics.*` | ICS export labels and copy |

---

## 8. ROUTING TABLE

`src/App.tsx` (shell) defines a react-router-dom v6 `<Routes>` exactly as below; each page module's **main component is its default export**. Role guards are enforced inside the page components via `getSession()` (§9): a student page with no student session redirects to `/login?role=student`; the instructor page with no instructor session redirects to `/login?role=instructor`.

| Path | Main page component (default export) | File | Guard |
| --- | --- | --- | --- |
| `/` | `LandingPage` | `src/pages/landing/LandingPage.tsx` | public |
| `/login` | `LoginPage` | `src/pages/auth/LoginPage.tsx` | public — role select; student demo login/register with mock SMS code shown in a toast; instructor password `demo123` + one-click demo button |
| `/student` | `StudentDashboardPage` | `src/pages/student/StudentDashboardPage.tsx` | student session, else `/login?role=student` |
| `/student/book` | `StudentBookingPage` | `src/pages/student/StudentBookingPage.tsx` | student session, else `/login?role=student` |
| `/student/profile` | `StudentProfilePage` | `src/pages/student/StudentProfilePage.tsx` | student session, else `/login?role=student` |
| `/student/notifications` | `StudentNotificationsPage` | `src/pages/student/StudentNotificationsPage.tsx` | student session, else `/login?role=student` |
| `/instructor` | `InstructorDashboardPage` | `src/pages/instructor/InstructorDashboardPage.tsx` | instructor session, else `/login?role=instructor` — **internal tab state** (overview / schedule / workinghours / courses / vehicles / notifications) |
| `*` | — | — | `<Navigate to="/" replace />` |

---

## 9. DEMO AUTH MODEL

No real backend, no passwords stored. Session state lives in localStorage key **`dw.session.v1`** via `getSession()`/`loginAsStudent`/`loginInstructor`/`logout` (§4).

- **Student demo login:** pick one of the seeded students (list rendered from `state.students`, one tap logs in as them), **OR** register: name + phone + a **mock 6-digit SMS code** that the UI generates and displays in a toast labeled **"demo code"** (e.g. "Demo code: 482913"); the student enters it, `addStudent(name, phone)` registers and auto-logs-in.
- **Instructor demo login:** password `demo123` (`loginInstructor`), plus a **one-click "Demo" button** that logs in without typing the password.
- Logout clears the session but never the data. `resetDemo()` restores the seed and clears the session.

---

## 10. SEED REQUIREMENTS (`src/data/seed.ts`)

Deterministic demo data, generated **relative to today** so the demo always looks alive. Fixed ids (`'s1'`, `'c1'`, `'v1'`, `'a1'`, `'n1'`, …); appointments/notifications/exceptions are placed with a day-offset helper, e.g. `at(daysFromToday: number, hour: number, minute: number): string` → local ISO `'YYYY-MM-DDTHH:mm:ss'` (Monday–Saturday bookings only, inside working hours, so availability always shows). The seed runs once on first load and is persisted; reloads read `dw.state.v1`.

| Entity | Requirement |
| --- | --- |
| Instructor | "Michael Reeves"; phone + email (Canadian format); bilingual bio; `rating: 4.9`; `yearsExperience: 9`; avatarColor. |
| Students (≈6) | Diverse names: Aisha, Liam, Yuki, Omar, Emma, Priya; Canadian phone numbers (displayed masked via `maskPhone`); staggered `registeredAt`; distinct avatarColors; one or two with `email`. |
| Courses (5) | Bilingual names/descriptions, prices in CAD: G1 Learner Practice ($60 / 60min), G2 Road Test Prep ($75 / 90min), Highway Driving ($70 / 90min), Parking & Maneuvering ($60 / 60min), Defensive Driving ($80 / 90min); ids `c1`–`c5`, all `active: true`. |
| Vehicles (2) | Honda Civic 2023 white (`v1`), Toyota Corolla 2022 grey (`v2`); plate numbers; bilingual `color`; `photoUrl: null`. |
| Weekly rules | Mon–Fri 09:00–18:00 (`startMin: 540`, `endMin: 1080`), Sat 10:00–14:00 (`600`–`840`). |
| Exceptions (1–2, within next 14 days) | e.g. `today + 3` → `closed: true` (closed day, note); `today + 7` → `closed: false`, 14:00–17:00 override (note). |
| Appointments (≈12, over next 14 days) | Mix of `confirmed` / `pending` / `cancelled`; course durations respected (60/90); a couple carry 1–2 `history` entries (e.g. rescheduled); one or two overlap with the closed/override days to make test scenarios 1–2 from SPEC §5 demonstrable. |
| Notifications (≈8) | Mix of roles (student + instructor), several unread; types from the §3 set; bilingual title/body; recent `at` stamps. |

---

## 11. CONVENTIONS

**CSS.** kebab-case class names (`.slot-grid`, `.working-hours-row`). Page/component-specific styles live in a **sibling `*.css`** file imported by that component (e.g. `StudentBookingPage.css` next to `StudentBookingPage.tsx`). **Colors and spacing come only from `src/styles/tokens.css` CSS variables — never hardcode color/spacing values in components.** Charts are hand-rolled SVG with token-derived stroke/fill. Components are React 18 **function components** with PascalCase file names (`FooPage.tsx`, default export = the page component); hooks are `use*`; lucide-react for icons only.

**Dark mode.** `tokens.css` defines `:root` (light theme) and `[data-theme='dark']` (dark theme) token sets. A `ThemeToggle` in the shared shell sets `document.documentElement.dataset.theme` and persists the choice in localStorage key **`dw.theme`**; the shell applies the saved theme on mount.

**TypeScript strictness.** `strict: true`, `noUnusedLocals`, `noUnusedParameters` — every module must compile clean; unused imports/params and `null`-unsafe access fail the build. Prefer explicit types on exported functions and interfaces; use `Date`/local-ISO strings exactly as specified in §3/§5; no timezone libraries, no `toISOString()` for business timestamps.

**i18n hard rule.** Every user-facing string in JSX comes from `useT()` — never hardcode English or Chinese in components. Bilingual demo data (course/vehicle names, notification bodies, bios) uses `{en, zh}` fields selected by `useLocale()`.

**Build gate.** `npm run build` (`tsc --noEmit && vite build`) must pass. The integration/verification agent owns this gate and may edit any file to fix it. The build must also pass an i18n key-parity check (en/zh identical key sets).
