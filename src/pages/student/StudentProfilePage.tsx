// ============================================================================
// EZDRIVES — StudentProfilePage (student-owned, default export = page)
// Profile card (masked phone, email, member since), display-only notification
// settings toggles, upcoming bookings with cancel (confirm modal → store),
// history timeline with status chips + bilingual change-log entries, and the
// calendar-sync section: real .ics export of upcoming lessons via
// src/utils/ics.ts plus a subscription link.
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import { CalendarPlus, Download, History } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cancelAppointment, getSession, lessonLabel, maskPhone, rescheduleAppointment, updateStudentAddress, useAppState } from '../../data/store'
import type { Appointment, Course } from '../../data/store'
import { dateKey, formatHM, fromLocalISO, fromServerISO, getLessonStarts, parseDateKey, toLocalISO } from '../../data/timeEngine'
import { useLocale, useT } from '../../i18n'
import { downloadICS } from '../../utils/ics'
import type { IcsEvent } from '../../utils/ics'
import { GOOGLE_MAPS_API_KEY } from '../../config'
import { Avatar, ConfirmModal, EmptyState, ModalFrame, StatusBadge } from './StudentShared'
import type { BadgeTone } from './StudentShared'
import { StudentShell } from './StudentShell'
import { formatDateLabel, formatDateTimeLabel, relativeTime } from './studentFormat'
import { useToast } from './StudentToast'
import './student.css'

const ICS_FILENAME = 'ezdrives-lessons.ics'

type HistoryTone = 'success' | 'info' | 'danger'

function historyTone(note: { en: string; zh: string }): HistoryTone {
  const text = `${note.en} ${note.zh}`
  if (text.includes('Cancel') || text.includes('取消') || text.includes('休息')) return 'danger'
  if (text.includes('Reschedule') || text.includes('改期')) return 'info'
  return 'success'
}

/** Student-side reschedule dialog: pick a date, then a free start time. */
function RescheduleModal({
  appointment,
  state,
  onClose,
  onDone,
}: {
  appointment: Appointment
  state: ReturnType<typeof useAppState>
  onClose: () => void
  onDone: () => void
}): JSX.Element {
  const t = useT()
  const { showToast } = useToast()
  const [date, setDate] = useState<string>(() => dateKey(fromLocalISO(appointment.start)))
  const [startISO, setStartISO] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const course = state.courses.find((c) => c.id === appointment.courseId)
  const duration = course ? (course.type === 'package' ? 60 : course.durationMin) : 60
  const starts = getLessonStarts(parseDateKey(date), state, duration, appointment.studentId, appointment.id)

  const confirm = async (): Promise<void> => {
    if (!startISO) return
    setBusy(true)
    const result = await rescheduleAppointment(appointment.id, startISO)
    setBusy(false)
    if (result.ok) {
      showToast('success', t('common.toast.saved'))
      onDone()
    } else {
      const message =
        result.error === 'conflict'
          ? t('student.booking.slotTaken')
          : result.error === 'closed'
            ? t('calendar.dayClosed')
            : result.error === 'past'
              ? t('student.booking.past')
              : t('common.toast.error')
      showToast('error', message)
    }
  }

  return (
    <ModalFrame open title={t('student.dashboard.rescheduleTitle')} onClose={onClose}>
      <p className="student-confirm-body">{t('student.dashboard.rescheduleBody')}</p>
      <div className="student-field">
        <label className="student-field-label" htmlFor="stu-resched-date">
          {t('instructor.workinghours.date')}
        </label>
        <input
          id="stu-resched-date"
          type="date"
          className="student-card-input"
          value={date}
          min={dateKey(new Date())}
          onChange={(e) => {
            setDate(e.target.value)
            setStartISO(null)
          }}
        />
      </div>
      <div className="student-field">
        <label className="student-field-label">{t('instructor.schedule.pickNewTime')}</label>
        {starts.length === 0 ? (
          <p className="student-muted-note">{t('calendar.dayClosed')}</p>
        ) : (
          <div className="student-slot-grid">
            {starts.map((d) => {
              const iso = toLocalISO(d)
              return (
                <button
                  key={iso}
                  type="button"
                  className={`student-slot${startISO === iso ? ' is-selected' : ''}`}
                  onClick={() => setStartISO(iso)}
                >
                  {formatHM(d)}
                </button>
              )
            })}
          </div>
        )}
      </div>
      <div className="student-modal-actions">
        <button type="button" className="student-btn student-btn-secondary" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button type="button" className="student-btn student-btn-primary" disabled={!startISO || busy} onClick={() => void confirm()}>
          {busy ? t('auth.login.loading') : t('common.confirm')}
        </button>
      </div>
    </ModalFrame>
  )
}

export default function StudentProfilePage(): JSX.Element {
  return (
    <StudentShell>
      <StudentProfileContent />
    </StudentShell>
  )
}

function StudentProfileContent(): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const state = useAppState()
  const { showToast } = useToast()
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [rescheduleId, setRescheduleId] = useState<string | null>(null)
  const [settings, setSettings] = useState({ email: true, sms: false, inApp: true })

  const session = getSession()
  const studentId = session.studentId ?? ''
  const student = state.students.find((s) => s.id === studentId)

  const courseById = (id: string): Course | undefined => state.courses.find((c) => c.id === id)
  const courseLabel = (appt: Appointment): string => {
    const c = courseById(appt.courseId)
    if (!c) return ''
    return `${c.name[locale]}${lessonLabel(c, appt.lessonIndex, locale)}`
  }

  // Editable pickup address (接送地址)
  const [addressDraft, setAddressDraft] = useState<string>(student?.address ?? '')
  const addressInputRef = useRef<HTMLInputElement | null>(null)

  // Google Places autocomplete for the pickup address (enabled when a key is
  // configured; otherwise the field stays a plain input).
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return
    const win = window as unknown as Record<string, unknown>
    const attach = (): void => {
      const el = addressInputRef.current
      const g = win.google as { maps?: { places?: { Autocomplete: new (input: HTMLInputElement, opts?: object) => { addListener: (ev: string, cb: () => void) => void; getPlace: () => { formatted_address?: string } } } } } | undefined
      if (!el || !g?.maps?.places) return
      const ac = new g.maps.places.Autocomplete(el, { fields: ['formatted_address'] })
      ac.addListener('place_changed', () => {
        const place = ac.getPlace()
        if (place?.formatted_address) setAddressDraft(place.formatted_address)
      })
    }
    if ((win.google as { maps?: unknown } | undefined) && (win.google as { maps?: { places?: unknown } } | undefined)?.maps?.places) {
      attach()
      return
    }
    if (win.__ezdAddressAutocomplete) {
      ;(win.__ezdAddressAutocomplete as () => void)()
      return
    }
    win.__ezdAddressAutocomplete = attach
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=__ezdAddressAutocomplete`
    script.async = true
    script.defer = true
    script.onerror = () => {
      // Key/network issue — keep the plain input working.
      delete win.__ezdAddressAutocomplete
    }
    document.head.appendChild(script)
  }, [])

  const saveAddress = async (): Promise<void> => {
    const result = await updateStudentAddress(addressDraft)
    if (result.ok) showToast('success', t('common.toast.saved'))
    else showToast('error', t('common.toast.error'))
  }

  const now = new Date()
  const myAppointments = state.appointments.filter((a) => a.studentId === studentId)
  const upcoming = myAppointments
    .filter((a) => (a.status === 'confirmed' || a.status === 'pending') && fromLocalISO(a.start).getTime() > now.getTime())
    .sort((a, b) => a.start.localeCompare(b.start))
  const history = myAppointments
    .filter(
      (a) =>
        a.status === 'cancelled' ||
        ((a.status === 'confirmed' || a.status === 'pending') && fromLocalISO(a.end).getTime() < now.getTime()),
    )
    .sort((a, b) => b.start.localeCompare(a.start))

  const statusTone = (appt: Appointment): BadgeTone => {
    if (appt.status === 'cancelled') return 'danger'
    if (appt.status === 'pending') return 'warning'
    return 'success'
  }
  const statusLabel = (appt: Appointment): string => {
    // Completed lessons show 已完成 — consistent with the calendar display.
    if (appt.status === 'cancelled') return appt.history.length > 0 ? appt.history[appt.history.length - 1].note[locale] : t('student.booking.cancelled')
    if (fromLocalISO(appt.end).getTime() < now.getTime()) return t('student.booking.completed')
    return appt.history.length > 0 ? appt.history[appt.history.length - 1].note[locale] : ''
  }

  const upcomingConfirmed = upcoming.filter((a) => a.status === 'confirmed')
  const icsEvents: IcsEvent[] = upcomingConfirmed.map((appt) => ({
    uid: `lesson-${appt.id}@ezdrives.example`,
    summary: t('ics.summary', { course: courseLabel(appt) }),
    description: t('ics.description'),
    location: t('ics.location'),
    start: fromLocalISO(appt.start),
    end: fromLocalISO(appt.end),
  }))

  const handleDownloadIcs = (): void => {
    downloadICS(icsEvents, ICS_FILENAME)
    showToast('success', t('ics.exported'))
  }

  const handleCancel = async (): Promise<void> => {
    if (!cancelId) return
    await cancelAppointment(cancelId)
    setCancelId(null)
    showToast('success', t('common.toast.deleted'))
  }

  const toggleSetting = (key: 'email' | 'sms' | 'inApp'): void => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleRows = [
    { key: 'email' as const, label: t('student.profile.emailNotifs') },
    { key: 'sms' as const, label: t('student.profile.smsNotifs') },
    { key: 'inApp' as const, label: t('student.profile.inAppNotifs') },
  ]

  return (
    <div className="student-page">
      <header className="student-page-head">
        <h1>{t('student.profile.title')}</h1>
      </header>

      <div className="student-profile-layout">
        <div className="student-profile-col">
          <section className="student-card student-profile-head">
            {student && <Avatar name={student.name} color={student.avatarColor} size="lg" />}
            <div>
              <h2 className="student-profile-name">{student ? student.name : ''}</h2>
              <p className="student-greeting-sub">
                {student ? `${maskPhone(student.phone)}` : ''}
                {student?.email ? ` · ${student.email}` : ''}
              </p>
            </div>
          </section>

          <section className="student-card">
            <div className="student-card-header">
              <h3 className="student-card-title">{t('student.profile.personal')}</h3>
            </div>
            <div className="student-profile-rows">
              <div className="student-profile-row">
                <span className="student-summary-label">{t('student.profile.name')}</span>
                <span className="student-summary-value">{student ? student.name : ''}</span>
              </div>
              <div className="student-profile-row">
                <span className="student-summary-label">{t('student.profile.phone')}</span>
                <span className="student-summary-value">{student ? maskPhone(student.phone) : ''}</span>
              </div>
              <div className="student-profile-row">
                <span className="student-summary-label">{t('student.profile.address')}</span>
                <div className="student-profile-address">
                  <input
                    ref={addressInputRef}
                    className="student-address-input"
                    value={addressDraft}
                    onChange={(e) => setAddressDraft(e.target.value)}
                    placeholder={t('student.profile.addressPlaceholder')}
                    autoComplete="street-address"
                  />
                  <button
                    type="button"
                    className="student-btn student-btn-primary student-btn-sm"
                    disabled={addressDraft.trim() === (student?.address ?? '')}
                    onClick={saveAddress}
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
              {student?.email && (
                <div className="student-profile-row">
                  <span className="student-summary-label">{t('student.profile.email')}</span>
                  <span className="student-summary-value">{student.email}</span>
                </div>
              )}
              <div className="student-profile-row">
                <span className="student-summary-label">{t('student.profile.registered')}</span>
                <span className="student-summary-value">
                  {student ? formatDateLabel(locale, fromLocalISO(student.registeredAt)) : ''}
                </span>
              </div>
            </div>
          </section>

          <section className="student-card">
            <div className="student-card-header">
              <h3 className="student-card-title">{t('student.profile.settings')}</h3>
            </div>
            <div className="student-settings-group">
              {toggleRows.map((row) => (
                <div key={row.key} className="student-toggle-row">
                  <span className="student-toggle-label">{row.label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings[row.key]}
                    aria-label={row.label}
                    className={`student-toggle${settings[row.key] ? ' on' : ''}`}
                    onClick={() => toggleSetting(row.key)}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="student-profile-col">
          <section className="student-card">
            <div className="student-card-header">
              <h3 className="student-card-title">{t('student.dashboard.upcoming')}</h3>
            </div>
            {upcoming.length > 0 ? (
              <ul>
                {upcoming.map((appt) => {
                  const course = courseById(appt.courseId)
                  return (
                    <li key={appt.id} className="student-book-row">
                      <div className="student-book-info">
                        <p className="student-book-title">{courseLabel(appt)}</p>
                        <p className="student-book-meta">
                          {formatDateTimeLabel(locale, fromLocalISO(appt.start))}
                          {course ? ` · ${t('courses.duration', { duration: course.durationMin })}` : ''}
                        </p>
                      </div>
                      <StatusBadge tone={statusTone(appt)} label={statusLabel(appt)} />
                      {appt.status === 'confirmed' || appt.status === 'pending' ? (
                        <button
                          type="button"
                          className="student-btn student-btn-secondary student-btn-sm"
                          onClick={() => setRescheduleId(appt.id)}
                        >
                          {t('student.dashboard.reschedule')}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="student-btn student-btn-ghost-danger student-btn-sm"
                        onClick={() => setCancelId(appt.id)}
                      >
                        {t('student.dashboard.cancel')}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyState
                icon={CalendarPlus}
                title={t('student.dashboard.upcomingEmpty')}
                body={t('student.dashboard.historyEmptyBody')}
                action={
                  <Link to="/student/book" className="student-btn student-btn-primary">
                    {t('student.dashboard.bookAnother')}
                  </Link>
                }
              />
            )}
          </section>

          <section className="student-card">
            <div className="student-card-header">
              <h3 className="student-card-title">{t('student.dashboard.history')}</h3>
            </div>
            {history.length > 0 ? (
              <ol className="student-timeline">
                {history.map((appt) => {
                  const lastNote = appt.history[appt.history.length - 1]
                  const tone = lastNote ? historyTone(lastNote.note) : 'success'
                  return (
                    <li key={appt.id} className="student-timeline-item">
                      <span className={`student-timeline-node ${tone}`} aria-hidden="true" />
                      <div className="student-timeline-head">
                        <span className="student-timeline-title">{courseLabel(appt)}</span>
                        <StatusBadge tone={statusTone(appt)} label={statusLabel(appt)} />
                      </div>
                      <p className="student-timeline-meta">
                        {formatDateTimeLabel(locale, fromLocalISO(appt.start))} · {t('student.dashboard.lesson')}
                      </p>
                      <ol className="student-history-log">
                        {appt.history.map((entry, index) => (
                          <li key={index} className="student-history-entry">
                            <span className="student-history-note">{entry.note[locale]}</span>
                            <span className="student-history-time">{relativeTime(locale, fromServerISO(entry.at))}</span>
                          </li>
                        ))}
                      </ol>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <EmptyState
                icon={History}
                title={t('student.dashboard.historyEmpty')}
                body={t('student.dashboard.historyEmptyBody')}
                action={
                  <Link to="/student/book" className="student-btn student-btn-primary">
                    {t('student.dashboard.bookAnother')}
                  </Link>
                }
              />
            )}
          </section>

          <section className="student-card">
            <div className="student-card-header">
              <h3 className="student-card-title">{t('student.profile.calendarSync')}</h3>
            </div>
            <p className="student-card-subtitle">{t('student.profile.calendarSyncBody')}</p>
            <div className="student-sync-actions">
              <button
                type="button"
                className="student-btn student-btn-secondary"
                disabled={icsEvents.length === 0}
                onClick={handleDownloadIcs}
              >
                <Download size={16} />
                {t('ics.export')}
              </button>
            </div>
            <p className="student-sync-hint">{t('ics.howTo')}</p>
          </section>
        </div>
      </div>

      <ConfirmModal
        open={cancelId !== null}
        title={t('student.dashboard.cancelConfirmTitle')}
        body={t('student.dashboard.cancelConfirmBody')}
        confirmLabel={t('student.dashboard.cancel')}
        onConfirm={handleCancel}
        onClose={() => setCancelId(null)}
      />

      {rescheduleId !== null ? (
        <RescheduleModal
          appointment={myAppointments.find((a) => a.id === rescheduleId) as Appointment}
          state={state}
          onClose={() => setRescheduleId(null)}
          onDone={() => setRescheduleId(null)}
        />
      ) : null}
    </div>
  )
}
