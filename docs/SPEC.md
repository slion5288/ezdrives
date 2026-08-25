# Driving Instructor Booking System — Product Specification (source of truth)

> This document is the authoritative product spec. All agents must read it first. It is bilingual by design:
> the final website must be fully functional in **English (default)** and **Chinese (Simplified)**, with a
> language switcher, and ALL user-facing text must come from the i18n dictionary (never hardcoded).

---

## 一、System Core Goals

### 1. User Roles & Core Value

| Role | Core Needs |
| --- | --- |
| Instructor | 1. Set regular/temporary working hours, fully control bookable slots 2. Flexibly reschedule student lessons with automatic notifications 3. See schedule, revenue stats & student data in real time |
| Student | 1. Self-book based on the instructor's open hours, no back-and-forth 2. Auto-sync lesson reminders to phone calendar 3. Quickly cancel or modify bookings |
| System | 1. Zero-error conflict detection 2. Real-time sync to Google Sheets for instructor management 3. Automated notifications & reminders |

### 2. Complete Feature Modules

#### Instructor side

- **Working hours management**
  - Weekly recurring hours (e.g. Mon–Fri 9:00–18:00), 30-minute minimum granularity (9:00–9:30, 14:00–14:30…)
  - Temporary adjustments: close a specific date entirely; override hours for one date (e.g. Mar 12 only 14:00–17:00)
  - Takes effect immediately: student side updates instantly; conflicting existing bookings are auto-cancelled and students notified
- **Appointment management**
  - Manually reschedule a student's lesson (drag in calendar OR precise time input), with automatic conflict check
  - Batch operations: select multiple bookings and move them together; export appointment records (CSV)
- **Statistics**
  - Core metrics: lessons this month, estimated revenue, new students; course-type distribution (e.g. 60% parking practice)
  - Trends: daily/weekly/monthly booking volume (line chart); peak hours (bar chart)
- **Vehicles & courses**
  - Vehicles: photo, model, plate (visible to students)
  - Courses: name, description, price, lesson duration (e.g. 1h / 1.5h)

#### Student side

- **Booking flow**
  - Calendar shows real availability — green blocks = bookable (derived from instructor's rules)
  - Click slot → choose course → confirm
  - Conflict guard: if another student already took the slot, show "该时段已满 / Slot taken"
- **Personal center**
  - Bookings: current bookings (cancellable), history (with change log)
  - Calendar sync: one-tap calendar subscription link (Apple/Google style) + manual ICS file export
- **Notifications**
  - Auto: booking confirmed / cancelled / rescheduled; reminder 2h before lesson
  - Channels: in-app + email + SMS (SMS optional)

#### Shared

- **Real-time data sync**: instructor changes availability → student calendar updates; student cancels → instructor slot frees
- **Notification engine** triggers:
  - Student submits booking → instructor: "New booking: 张三 Mar 10 14:00 倒车入库"
  - Instructor reschedules → student: "Your lesson is now Mar 10 15:00"
  - 2h before start → student: "Your lesson starts in 2 hours"

### 3. Data architecture (Google Sheets style)

Tables: `WorkingHours` (type recurring/exception, weekday/date, start, end, active), `Appointments` (studentId, instructorId, originalTime, newTime, status confirmed/cancelled/pending), `Students` (id, phone encrypted, name, registeredAt), `Notifications` (type, recipientId, content, sendStatus), `Courses` (id, name, price, duration, status).

### 4. Non-functional requirements

- Performance: key operations < 1s
- Security: sensitive data encrypted (simulated), sheets not exposed
- Compatibility: iOS 14+ / Android 10+, modern Chrome/Safari/Firefox
- Design: iOS design conventions — card layout, system font stack, dynamic colors (light/dark)

### 5. Test scenarios (must work in the demo)

1. Instructor closes a day → students can't book it AND existing bookings that day auto-cancel with notification
2. Instructor reschedules a student's lesson → conflict check, notification sent, calendar reflects new time
3. Student cancels → instructor slot frees up

---

## English summary (condensed)

Modern, premium, **Canadian-market** driving school booking website. Two roles:
**Student** (register with phone + mock SMS code, book from green availability slots, manage bookings,
export ICS, get notifications) and **Instructor** (single demo account; weekly working hours + per-day
exceptions with 30-min granularity; appointment calendar with reschedule/cancel/batch move + CSV export;
stats dashboard: monthly lessons/revenue/new students, course mix donut, bookings trend line, peak-hours
bars; course & vehicle CRUD; sees live notifications). Bilingual EN/ZH with a toggle, light/dark themes,
card-based iOS-style design, fully client-side demo with seeded data persisted in localStorage (simulating
the Google Sheets tables). No reference to Chinese instructor website templates — the design must be an
original Western/modern SaaS aesthetic.
