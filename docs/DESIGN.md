# DESIGN.md — Design System for the Driving Instructor Booking Platform

> **Author:** Senior Product/UI Designer · **Audience:** all coding agents
> **Source of truth for product behavior:** `docs/SPEC.md` (bilingual EN/ZH).
> This document is the single source of truth for **visual language**: tokens, components,
> layout, motion, and copy tone. Every user-facing string must still come from `useT()`
> with `{en, zh}` values — the bilingual examples below are **copy patterns**, not string literals.
>
> **Golden rule:** build every pixel with CSS variables from `src/styles/tokens.css`.
> Never hardcode a color, radius, shadow, or font size in component code. If a token is
> missing, add it to `tokens.css` and this document — do not invent one-off values.

---

## 1. Brand Concept

| Decision | Value |
| --- | --- |
| **Brand name** | **EZDRIVES** — a modern, dependable Canadian driving school brand (blue→purple gradient). |
| **Tagline (EN)** | *"Drive with confidence."* |
| **Tagline (ZH)** | *"自信驾驶，安心上路"* |
| **Personality** | Modern, trustworthy, premium, calm. A driving school that feels like booking a flight on a great airline — not like a classifieds ad. |

**Aesthetic direction (explicit):** original Western/modern SaaS — think **Calendly, Linear, Stripe**. Airy layouts with generous whitespace, large rounded cards, soft layered shadows, subtle gradients (never loud), restrained single-accent coloring, crisp system typography. **NOT** cluttered; **NOT** a Chinese instructor-template style (no red/gold banners, no busy photo collages, no flashing badges). Calm wins over loud; clarity wins over decoration.

**Voice:** warm but professional. Short sentences. Numbers and times always human-formatted (e.g. "Mar 10 · 14:00"). Confirmations, not apologies.

---

## 2. Token System & Theming

All tokens live in **`src/styles/tokens.css`**:

- Light theme = defaults on `:root`.
- Dark theme = overrides on `html[data-theme='dark']`.
- The theme switcher only toggles the `data-theme` attribute on `<html>`; components never branch on theme in JS.

```css
:root { --color-bg: #F6F8F9; /* ...all tokens below... */ }
html[data-theme='dark'] { --color-bg: #0D1216; /* ... */ }
```

Usage rule: `var(--color-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--shadow-*)`, `var(--font-size-*)`, `var(--transition-*)`. Semantic over bare values — a component reads `--color-danger`, never a literal red.

### 2.1 Color tokens — Light theme

| Token | Hex | Purpose |
| --- | --- | --- |
| `--color-bg` | `#F6F8F9` | App background (cool gray-white, airy). |
| `--color-surface` | `#FFFFFF` | Cards, panels, modal, dropdowns. |
| `--color-surface-2` | `#EDF1F3` | Inset wells, hover fill, table header, code/slot grid background. |
| `--color-text` | `#101828` | Primary text, headings. Contrast ≈ 17:1 ✓ |
| `--color-text-muted` | `#475467` | Body secondary text. Contrast ≈ 7.4:1 ✓ |
| `--color-text-soft` | `#98A2B3` | Placeholders, disabled, captions (≥14px only). ≈ 2.9:1 — never for essential info. |
| `--color-accent` | `#0E9F63` | Brand green — primary buttons, links, selected states, brand accents. ≈ 3.6:1 on white (use with 500/600-weight text or white text on it). |
| `--color-accent-hover` | `#0B7D4E` | Accent hover/pressed. |
| `--color-accent-soft` | `#E6F6EF` | Accent tint backgrounds: selected nav item, success chip, soft CTA. |
| `--color-success` | `#22A06B` | **Availability green** — bookable slots, "confirmed" status. |
| `--color-danger` | `#E5484D` | Errors, cancel, destructive actions. |
| `--color-danger-soft` | `#FDECEE` | Danger tint backgrounds. |
| `--color-warning` | `#F5A524` | Warnings, "pending" status. |
| `--color-info` | `#3B82F6` | Informational accents, links in bodies of text. |
| `--color-border` | `#E3E8EC` | Default hairlines. |
| `--color-border-strong` | `#CBD3DA` | Stronger hairlines (inputs, hover borders). |
| `--color-focus-ring` | `rgba(14, 159, 99, 0.35)` | 2px focus outline + 2px offset. |
| `--color-overlay` | `rgba(16, 24, 40, 0.45)` | Modal scrim. |

### 2.2 Color tokens — Dark theme

| Token | Hex | Purpose |
| --- | --- | --- |
| `--color-bg` | `#0D1216` | App background (deep blue-slate). |
| `--color-surface` | `#151C22` | Cards, panels, modal. |
| `--color-surface-2` | `#1F2830` | Inset wells, hover fills, table header. |
| `--color-text` | `#F2F6F8` | Primary text. Contrast ≈ 15:1 ✓ |
| `--color-text-muted` | `#C2CBD4` | Secondary text. ≈ 8:1 ✓ |
| `--color-text-soft` | `#7C8894` | Placeholders/disabled captions (≥14px only). ≈ 4.6:1 on surface. |
| `--color-accent` | `#34D399` | Brand green (brighter for dark). |
| `--color-accent-hover` | `#5AE3AF` | Accent hover/pressed. |
| `--color-accent-soft` | `rgba(52, 211, 153, 0.14)` | Accent tint backgrounds. |
| `--color-success` | `#34D399` | Availability green — bookable slots. |
| `--color-danger` | `#F97066` | Errors, cancel. |
| `--color-danger-soft` | `rgba(249, 112, 102, 0.14)` | Danger tint backgrounds. |
| `--color-warning` | `#FDB022` | Warnings, pending. |
| `--color-info` | `#53B1FD` | Informational accents. |
| `--color-border` | `#263039` | Default hairlines. |
| `--color-border-strong` | `#3A4651` | Stronger hairlines. |
| `--color-focus-ring` | `rgba(52, 211, 153, 0.4)` | Focus outline. |
| `--color-overlay` | `rgba(3, 7, 10, 0.65)` | Modal scrim. |

### 2.3 Elevation, radius, spacing, motion

| Token | Value |
| --- | --- |
| `--shadow-card` | `0 1px 2px rgba(16,24,40,.04), 0 2px 6px rgba(16,24,40,.05)` |
| `--shadow-pop` | `0 8px 20px -4px rgba(16,24,40,.14), 0 2px 6px -2px rgba(16,24,40,.08)` |
| `--radius-sm` | `6px` (chips, badges, small inputs) |
| `--radius-md` | `10px` (buttons, inputs, toggles) |
| `--radius-lg` | `14px` (cards, dropdowns, tables) |
| `--radius-xl` | `20px` (modals, hero panels) |
| `--space-1` … `--space-8` | `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 px` |
| `--transition-fast` | `150ms ease` |
| `--transition-base` | `200ms ease` |

Dark theme shadows: reuse the same tokens (add `rgba(0,0,0,.35)` layering if shadows read too faint); never introduce separate shadow names.

---

## 3. Typography

| Token | Size / Line-height | Use |
| --- | --- | --- |
| `--font-size-xs` | 12px / 1.4 | Captions, timestamps, avatar initials |
| `--font-size-sm` | 13px / 1.45 | Meta, helper text, table cells |
| `--font-size-base` | 14px / 1.5 | Default body, inputs, buttons |
| `--font-size-md` | 15px / 1.5 | Secondary headings, card titles |
| `--font-size-lg` | 16px / 1.4 | Page section titles, nav |
| `--font-size-xl` | 18px / 1.35 | Card headings, modal titles |
| `--font-size-2xl` | 20px / 1.3 | Panel titles |
| `--font-size-3xl` | 24px / 1.25 | Page titles |
| `--font-size-4xl` | 32px / 1.2 | Hero headline |
| `--font-size-5xl` | 40px / 1.15 | Hero headline (desktop only) |
| `--font-size-6xl` | 56px / 1.1 | Reserved — never below 40px viewport width |

- **Weights:** 400 (body), 500 (emphasis, buttons), 600 (subheads, table headers), 700 (headings, stat values).
- **Font stack** `--font-sans` (iOS-first system stack):

```css
--font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
  "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC",
  "Microsoft YaHei", "Noto Sans SC", sans-serif;
```

- Numerals: use tabular figures (`font-variant-numeric: tabular-nums`) in stats, times, and tables so numbers don't jitter.
- Chinese text inherits the same sizes; ZH line-height ≥ 1.6. ZH never uses italic.

---

## 4. Component Specs

Naming: all components are PascalCase React function components in `src/components/`. Every string prop defaults to a `useT()` key — no hardcoded EN/ZH in JSX.

### 4.1 Button

- **Anatomy:** label (+ optional leading icon 16px), padding `10px 16px`, radius `--radius-md`, weight 500.
- **Sizes:** `sm` 32px height / `md` 40px / `lg` 48px (only in hero CTAs).
- **Variants:**
  - `primary` — bg `--color-accent`, text white, hover `--color-accent-hover`, shadow `--shadow-card`.
  - `secondary` — bg `--color-surface`, text `--color-text`, border `--color-border-strong`, hover bg `--color-surface-2`.
  - `ghost` — transparent, text `--color-text-muted`, hover bg `--color-surface-2`, hover text `--color-text`.
  - `danger` — bg `--color-danger`, white text (hover darkens 5%); or ghost-danger: text `--color-danger`, hover bg `--color-danger-soft`.
- **States:** `disabled` → opacity 0.5, no pointer events, no shadow. `loading` → spinner (14px ring, white/currentColor) replaces icon, label dims; disable clicks.
- **Focus:** `--color-focus-ring` 2px outline, 2px offset, radius matches button.

### 4.2 Card

- **Anatomy:** `--color-surface`, radius `--radius-lg`, border 1px `--color-border`, shadow `--shadow-card`, padding `--space-5` (24px) default.
- **Header slot:** title (md, 600) + optional `muted` subtitle + right-aligned actions.
- **States:** `hoverable` (clickable cards) → translateY(-2px) + `--shadow-pop` on hover, transition 200ms. `selected` → border `--color-accent` + 1px, bg tint `--color-accent-soft` at 30% opacity.
- **Nested surfaces:** inner wells use `--color-surface-2` with `--radius-md`.

### 4.3 Badge

- **Anatomy:** inline-flex, height 22px, padding `0 8px`, radius `--radius-sm`, font-xs 500, 1px border.
- **Tones:** `neutral` (surface-2 bg, muted text) · `success` (accent-soft bg, accent text — e.g. "Confirmed / 已确认") · `danger` (danger-soft bg, danger text — "Cancelled / 已取消") · `warning` (warning at 15% opacity bg, `#B54708`/dark `#FDB022` text — "Pending / 待确认") · `info` (info at 12% bg, info text).
- Optional 6px dot before text (status pulse only for live/pending).

### 4.4 Toggle (switch)

- **Anatomy:** 40×24px track, radius full, 20px knob, 150ms transition.
- **States:** off = `--color-border-strong` track, white knob; on = `--color-accent` track, white knob; disabled = 50% opacity; focus ring around track.
- Label sits left (or right for settings rows) at `--font-size-base`, 500. Never show a toggle without a text label.

### 4.5 Input / Select / Field

- **Field:** label (sm, 500, muted) above; optional `hint` (xs, text-soft) below; `error` (xs, danger) replaces hint.
- **Input/Select:** height 40px, radius `--radius-md`, bg `--color-surface`, border `--color-border-strong`, padding `0 12px`, font-base. Focus → border `--color-accent`, ring 2px `--color-focus-ring`. Placeholder = `--color-text-soft`. Disabled = bg `--color-surface-2`, 50% text.
- **Select:** custom chevron (lucide `ChevronDown`), native select styled, same tokens.
- **Error state:** border `--color-danger` + danger ring on focus + `FieldError` text. Input group with suffix (e.g. currency `$`, duration `h`) uses `--color-text-soft` suffix.
- **Spacing:** stacked forms use `--space-5` (24px) between fields; two-column grids get `--space-4` gutters.

### 4.6 Modal

- **Anatomy:** scrim `--color-overlay` (blur 4px optional), dialog: surface, radius `--radius-xl`, padding `--space-6`, width 480px (max 92vw), shadow `--shadow-pop`.
- **Header:** title (xl, 600) + close ghost icon button top-right. **Body:** stacked content. **Footer:** right-aligned actions (`secondary` + `primary`/`danger`), 16px gap.
- **Behavior:** focus trap inside dialog, `Escape` closes, scrim click closes, body scroll locked. Enter animates in 150ms with scale 0.98→1 + fade.

### 4.7 Toast

- **Anatomy:** surface card, radius `--radius-md`, shadow `--shadow-pop`, left icon 16px, title (base, 500) + optional body (sm, muted), 1px border. Width 360px, bottom-center on mobile / bottom-right desktop, stacked 8px apart, z-index above modals.
- **Tones:** `success` (icon `--color-success`) · `error` (`--color-danger`) · `info` (`--color-info`).
- **Behavior:** auto-dismiss 4s (errors 6s), slide-up + fade in 200ms, slide-out on dismiss; progress is subtle — no countdown bar. Close button always available.

### 4.8 StatCard

- **Anatomy:** card, padding `--space-5`; label (sm, muted) → value (`--font-size-3xl`, 700, tabular-nums) → delta row: icon `TrendingUp/Down` 14px + text (sm, 500; green `--color-success` up / `--color-danger` down / `--color-text-soft` flat) + optional muted context ("vs last month / 较上月").
- Layout: dashboard row of 3–4 StatCards, equal width, `--space-4` gap.

### 4.9 EmptyState

- **Anatomy:** centered column, padding `--space-8`; icon in a 64px `--color-surface-2` circle (or `--color-accent-soft`), 24px; title (lg, 600); body (base, muted, max 360px); optional single action Button. No border — lives on page/card background.

### 4.10 Avatar

- **Anatomy:** circle, 32/40/48px sizes, radius full, bg derived deterministically from name (rotating palette of 6 muted hues — accents at low saturation), white/dark-contrast initials 600 weight at `--font-size-xs`/`sm`.
- Presence dot: 8px `--color-success` ringed by surface, bottom-right (instructor online in booking UI).

### 4.11 Header / Navbar

- **Sticky top**, `position: sticky; top: 0`, bg `color-mix(in srgb, var(--color-bg) 82%, transparent)` + `backdrop-filter: blur(12px)`, bottom hairline `--color-border`. Height 64px.
- Left: logo mark (rounded square `--color-accent` with white "star/steering" glyph — lucide `Navigation` or custom 20px SVG) + wordmark "EZDRIVES" (600). Center/right: nav links (ghost, active = accent text + underline offset 4px), language toggle (EN | 中文 pill), theme toggle icon, avatar.

### 4.12 Sidebar (instructor)

- Width 240px, full-height under header, bg `--color-surface`, right hairline. Nav items: 40px rows, radius `--radius-md`, icon 18px + label (base, 500); hover bg `--color-surface-2`; active bg `--color-accent-soft` + accent text + 3px accent left bar. Collapses to 64px icon-only on < 1024px.

### 4.13 WeekCalendar & Slot cells

- **Frame:** card with 7 day columns; header row = weekday short (sm, 600) + date number (sm, muted). Time gutter 56px left, rows every 30 min (per spec granularity), min row height 40px.
- **Slot cell states:**
  - **Available** — fill `--color-success` at 12% (light) / 16% (dark), text `--color-success` 600; hover → bg intensifies + scale(1.02), cursor pointer, focus ring. This is the primary affordance: **green block = bookable**.
  - **Booked** — fill `--color-accent` 100% (white text, 600) — solid brand green. Sub-label: student name clipped.
  - **Closed (instructor)** — muted: bg `--color-surface-2`, text `--color-text-soft`, diagonal hatch (`repeating-linear-gradient 45deg` at 4% black) for closed days.
  - **Past** — same as closed but additionally `text-decoration: line-through` for the time label; no pointer events.
  - **Taken by others** — fill `--color-danger-soft`, danger text, `line-through`; tooltip "Slot taken / 该时段已满".
  - **Selected** — 2px accent ring inset + scale 1.03 + success check badge top-right.

### 4.14 SlotPicker

- Grouped by date: date heading (md, 600) + chip grid (`--space-2` gap) of 30-min slots; chip = 40px tall, radius `--radius-md`, success tint like available cells. States reuse 4.13 palette. Selected chip → solid `--color-accent`, white text. Disabled chips (past/taken) → `--color-surface-2`, soft text, strike-through.

### 4.15 MiniCalendar (month grid)

- 7-col grid, 36px cells, radius `--radius-md`. Day number (base). Today = accent text + 2px accent circle. Selected = solid accent, white. Days with availability = 4px success dot under number. Other-month days = soft text. Today's date handled in local time with `YYYY-MM-DD` keys.

### 4.16 Timeline (booking history / notification log)

- Vertical 2px rail `--color-border`; nodes: 12px circles, tone by event (`success` confirm · `info` reschedule · `danger` cancel · `warning` pending). Item: title (base, 500) + meta (sm, muted, e.g. "Mar 10 · 14:00 → 15:00"). Latest on top; rail left, content right, 16px padding.

### 4.17 Table

- Header row: `--color-surface-2` bg, sm 600 muted, 44px tall, bottom border `--color-border`. Cells: base 400, 48px min height, row borders `--color-border`, zebra off (cleaner), row hover bg `--color-surface-2` at 50%. Right-align numeric columns with tabular-nums. Actions column: ghost icon buttons right-aligned. Overflow: horizontal scroll on mobile, sticky first column optional.

### 4.18 Charts (hand-rolled SVG)

- **Shared rules:** no chart library. Axis text: sm, `--color-text-soft`; grid lines: 1px `--color-border` dashed; no axis on donut. Tooltip = mini card (`--shadow-pop`, base 13px, muted label). Animations: stroke-dashoffset / width transition 600ms ease-out on mount.
- **LineChart** (bookings trend): line 2px `--color-accent`, area gradient `--color-accent` → transparent (opacity 0.18→0), point = 6px accent circle on hover with vertical guide line.
- **BarChart** (peak hours): bars radius 4px top, fill `--color-accent` (weekday-peak) with the max bar filled `--color-success` (highlight); hover → opacity 0.85.
- **DonutChart** (course mix): segments from 6-hue muted palette (accent-led: start `--color-accent`, then `--color-info`, `--color-warning`, `--color-success`, muted grays); center label = total (3xl 700); stroke gap 2px in `--color-surface`; legend right, sm.

---

## 5. Page Layout Guidance

### 5.1 Landing (public)

Vertical rhythm: sections separated by `--space-8` (64px) min. Content max-width 1120px, centered, side padding 24px (mobile 16px).

1. **Hero** — full-width, bg `--color-bg` with a **subtle radial gradient** (`--color-accent-soft` at 25% opacity, top-right) or a calm photo (Canadian road, soft focus) at 30% opacity behind. Badge chip (accent-soft, "Licensed in Canada / 加拿大持牌认证") → H1 (`--font-size-5xl` desktop / 4xl mobile, 700, `--color-text`) → subhead (xl, muted) → dual CTA row: `primary lg` "Book a lesson / 预约课程" + `secondary lg` "Instructor login / 教练登录" → trust row of 3 small stats (500+ students etc., sm muted). Hero cards float above with `--shadow-pop`.
2. **Steps** — 3 cards in a row (stack mobile), numbered accent circles, icon + title + body.
3. **Courses** — 3 pricing-style cards; middle one highlighted ("Most popular / 最受欢迎" badge), price accent 3xl, duration + features list with success check icons.
4. **Instructors** — card grid: Avatar 48px, name (lg 600), rating stars (warning), tags badges, "Book / 预约" secondary button.
5. **Testimonials** — 3 quote cards, 5-star warning icons, muted attribution.
6. **Footer** — muted sm text, 3 columns (brand + links + contact), top hairline, "© 2025 EZDRIVES".

### 5.2 Student booking flow

- **Layout:** two-column `grid-template-columns: 1fr 360px`, gap `--space-5`. Left: MiniCalendar + WeekCalendar card. Right: **summary panel** — sticky top 80px, card with course select, chosen slot summary (date/time big, tabular), price row, total row (border-top strong), `primary` full-width "Confirm booking / 确认预约", plus calendar-sync row (ghost, calendar icon).
- **Mobile (< 900px):** single column; summary panel becomes a **bottom action bar** (sticky, surface, hairline top, shows compact summary + confirm button), full booking form opens in a Modal.
- Flow: select slot (left) → slot pins to summary (right) → choose course → confirm → success state (check animation, 4.19) → notification toast.

### 5.3 Instructor dashboard

- **Layout:** Sidebar (240px) + main content (`padding: 32px 40px`, max-width 1200px). Header row: page title (3xl) + actions right (secondary "New booking / 新建预约", ghost export CSV).
- **Row 1 — StatCards:** 4 cards (Lessons this month / Revenue / New students / Course mix headline) `--space-4` gap.
- **Row 2 — Charts:** 2-col grid `1.5fr 1fr` (LineChart wide + DonutChart), then full-width BarChart (peak hours) or third column; each in a Card with title + period select.
- **Row 3 — Appointments table** full width; **Row 4 — working-hours editor** card (weekly grid + exception list with toggle rows).
- Student/Notification views reuse the table + timeline specs.

### 5.4 Forms

Stacked, generous: field gap `--space-5`, label above input, hint/error below. Submit row = primary left + ghost cancel. Section dividers: hairlines with `--space-6` breathing. Never two-column forms below 768px. Validation on blur, success on submit.

---

## 6. Type & Motion (summary)

- Stack & sizes: see §3. Weights 400/500/600/700 only.
- Transitions: **120–200ms `ease`** everywhere; `--transition-fast` 150ms default, `--transition-base` 200ms for panels/modals.
- **Hover lift** for cards: `transform: translateY(-2px)` + `--shadow-pop`, 200ms.
- **Focus visibility:** every interactive element shows `2px solid var(--color-focus-ring)` with `2px` offset — keyboard users included, never `outline: none` without a replacement.
- **Contrast ≥ 4.5:1** for body text; large text (≥24px) ≥ 3:1. Verify with token pairs in §2. Do not use `--color-text-soft` for actionable or primary content.

---

## 7. Micro-interactions & Empty States

### 7.1 Micro-interactions

- **Slot hover:** scale 1.02 + tint intensification (150ms); selected slot pops with inset accent ring + 12px success check (lucide `Check`) that draws in with a 200ms `stroke-dashoffset` animation.
- **Success checkmark:** 28px circle fills `--color-success` (scale 0.8→1, 200ms ease-out) while a white check draws itself (stroke-dashoffset 300ms) — used on booking confirmation and save actions.
- **Toast entry/exit:** translateY(8px) + fade, 200ms.
- **Stat value tick:** value animates 0→n on mount (400ms, tabular-nums prevents jitter).
- **Nav active state:** 150ms background fade + 3px accent bar slide-in.
- **Button press:** `transform: translateY(1px)` + reduced shadow on `:active`.
- **Reduce motion:** honor `prefers-reduced-motion` — drop scale/translate, keep fades ≤ 150ms or none.

### 7.2 Empty states (bilingual copy patterns)

All strings through `useT()`, e.g. `t('calendar.empty.title') = { en: 'No lessons this week', zh: '本周暂无课程' }`.

- **Empty calendar (student, no open days):** icon `CalendarX` → *"No available lessons / 本周暂无可用课时"* → body *"The instructor hasn't opened hours for this period yet. Check back soon. / 教练尚未开放该时段，请稍后再来查看。"* + ghost "Notify me / 有新课时通知我".
- **No notifications:** icon `BellOff` → *"You're all caught up / 暂无新通知"* → *"Booking confirmations and reminders will appear here. / 预约确认与提醒将显示在这里。"
- **No bookings (history):** icon `CalendarPlus` → *"No bookings yet / 还没有预约"* → *"Pick a green slot on the calendar to book your first lesson. / 在日历上选择绿色时段，预约您的第一节课。"* + primary "Book a lesson / 预约课程".
- **No students / no appointments (instructor):** icon `Users` → *"No students yet / 暂无学员"*.
- **Closed day (calendar):** inline muted banner in the day column — *"Day closed / 当日休息"* with hatch texture.
- **Loading skeleton:** shimmering blocks (`--color-surface-2` base with 30% white/dark pulse, 1.2s loop) shaped to the eventual content — never spinners for layout.

---

## 8. Exemplar — "specimen" paragraphs

**Landing hero.** A calm, airy page: cool gray `#F6F8F9` everywhere, one soft emerald radial glow breathing from the top-right corner like morning light. A white rounded card (20px radius, barely-there shadow) floats over the fold holding the headline — dark ink `#101828`, 40px, tight — *"Drive with confidence. 自信驾驶，安心上路"* — above a single confident emerald button. To the right, a ghosted Canadian highway photo dissolves into the background. Nothing flashes; the page feels like a well-designed booking app, because it is one.

**Instructor dashboard.** A 240px white sidebar with one emerald item highlighted; content on `#F6F8F9`. Four white stat cards float in a row, big tabular numbers with tiny green deltas. Below, a wide emerald trend line glides over faint dashed gridlines, beside a donut whose first segment is the same emerald. The appointments table is quiet: hairline rows, no zebra, one emerald "confirmed" badge. Every card is a rounded white rectangle with a soft shadow; the eye moves from number to chart to table without effort. It looks like Stripe's dashboard — trustworthy, premium, calm.

---

## 9. Deliverables & Conventions Checklist

- [ ] `src/styles/tokens.css` contains **every** token name listed in §2 (exact spelling).
- [ ] No hex/rgba literals in components — only `var(--…)`.
- [ ] All user-facing strings via `useT()`; demo data uses `{en, zh}` fields.
- [ ] Both `:root` and `html[data-theme='dark']` fully defined before any page work.
- [ ] `data-theme` toggle on `<html>` only; no theme logic in components.
- [ ] Focus rings, 4.5:1 contrast, `prefers-reduced-motion` respected everywhere.
