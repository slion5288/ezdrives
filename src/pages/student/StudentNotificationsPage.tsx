// ============================================================================
// EZDRIVES — StudentNotificationsPage (student-owned, default export = page)
// Notification list for the current student: icon per type, bilingual title /
// body (from store data), relative timestamp, unread accent bar, click-to-read,
// "Mark all as read" action and an empty state. All static labels via useT().
// ============================================================================

import { Bell, BellOff, CalendarClock, CalendarX, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { markAllRead, markNotificationRead, getSession, useAppState } from '../../data/store'
import { fromServerISO } from '../../data/timeEngine'
import { useLocale, useT } from '../../i18n'
import { EmptyState } from './StudentShared'
import { StudentShell } from './StudentShell'
import { relativeTime } from './studentFormat'
import { useToast } from '../../components/shared'
import { Button } from '../../components/shared/Button'
import { useNavigate } from 'react-router-dom'
import './student.css'

type IconTone = 'success' | 'danger' | 'info' | 'warning'

function iconFor(type: string): { icon: typeof Bell; tone: IconTone } {
  switch (type) {
    case 'booking_confirmed':
      return { icon: CheckCircle2, tone: 'success' }
    case 'booking_cancelled':
      return { icon: XCircle, tone: 'danger' }
    case 'booking_rescheduled':
      return { icon: CalendarClock, tone: 'info' }
    case 'reminder_2h':
      return { icon: Clock, tone: 'warning' }
    case 'day_closed':
      return { icon: CalendarX, tone: 'danger' }
    default:
      return { icon: Bell, tone: 'info' }
  }
}

export default function StudentNotificationsPage(): JSX.Element {
  return (
    <StudentShell>
      <StudentNotificationsContent />
    </StudentShell>
  )
}

function StudentNotificationsContent(): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const state = useAppState()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const session = getSession()
  const studentId = session.studentId ?? ''

  const notifications = state.notifications
    .filter((n) => n.role === 'student' && n.recipientId === studentId)
    .sort((a, b) => b.at.localeCompare(a.at))

  const handleMarkAllRead = (): void => {
    markAllRead()
    showToast('success', t('common.toast.saved'))
  }

  /** § P2: tapping a notification marks it read AND jumps to the related
   *  lesson — the dashboard's calendar auto-centres on the next booked day. */
  const openNotification = (n: { id: string; read: boolean }): void => {
    if (!n.read) markNotificationRead(n.id)
    navigate('/student')
  }

  return (
    <div className="student-page">
      <header className="student-page-head">
        <h1>{t('student.notifications.title')}</h1>
        {notifications.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
            {t('student.notifications.markAllRead')}
          </Button>
        )}
      </header>

      {notifications.length > 0 ? (
        <ul className="student-notif-list">
          {notifications.map((n) => {
            const { icon: Icon, tone } = iconFor(n.type)
            return (
              <li key={n.id}>
                <button
                  type="button"
                  className={`student-notif-card${n.read ? '' : ' unread'}`}
                  onClick={() => openNotification(n)}
                >
                  <span className={`student-notif-icon ${tone}`}>
                    <Icon size={16} />
                  </span>
                  <span className="student-notif-card-main">
                    <span className="student-notif-card-title">
                      <strong>{n.title[locale]}</strong>
                      <span className="student-notif-time">{relativeTime(locale, fromServerISO(n.at))}</span>
                    </span>
                    <span className="student-notif-card-body">{n.body[locale]}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <section className="student-card">
          <EmptyState icon={BellOff} title={t('student.notifications.empty')} body={t('student.notifications.emptyBody')} />
        </section>
      )}
    </div>
  )
}
