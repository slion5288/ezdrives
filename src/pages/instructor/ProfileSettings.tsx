// ============================================================================
// EZDRIVES — Instructor ProfileSettings (instructor-owned local component)
// Edits the instructor's public profile (name / phone / email / bilingual bio)
// shown on the homepage 认识你的教练 section. Saved via mutate → PUT /api/state.
//
// Edit/save pattern (mainstream): read-only summary + 编辑 button. Clicking 编辑
// opens the form PRE-FILLED with the current values plus 保存 / 取消 buttons —
// 取消 discards the edits and returns to the summary untouched, so accidental
// clicks can never lose existing information.
// ============================================================================

import { useState } from 'react'
import type { AppState } from '../../data/store'
import { updateInstructorProfile } from '../../data/store'
import { useT } from '../../i18n'
import { useToast } from './toast'
import { Pencil, User } from 'lucide-react'

export default function ProfileSettings({ state }: { state: AppState }): JSX.Element {
  const t = useT()
  const toast = useToast()
  const inst = state.instructor
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [bioEn, setBioEn] = useState('')
  const [bioZh, setBioZh] = useState('')
  const [busy, setBusy] = useState(false)

  const startEdit = (): void => {
    setName(inst.name)
    setPhone(inst.phone)
    setEmail(inst.email)
    setBioEn(inst.bio?.en ?? '')
    setBioZh(inst.bio?.zh ?? '')
    setEditing(true)
  }

  const cancel = (): void => {
    setEditing(false)
  }

  const save = (): void => {
    setBusy(true)
    updateInstructorProfile({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      bio: { en: bioEn.trim(), zh: bioZh.trim() },
    })
    setBusy(false)
    setEditing(false)
    toast({ tone: 'success', title: t('common.toast.saved') })
  }

  return (
    <section className="ins-panel ins-settings">
      <div className="ins-panel-head">
        <h2 className="ins-panel-title">
          <User size={16} /> {t('instructor.settings.profile')}
        </h2>
        {!editing ? (
          <button type="button" className="ins-btn ins-btn--secondary ins-btn--sm" onClick={startEdit}>
            <Pencil size={14} /> {t('common.edit')}
          </button>
        ) : null}
      </div>

      {editing ? (
        <>
          <div className="ins-form-grid">
            <div className="ins-field">
              <label className="ins-field-label" htmlFor="prof-name">
                {t('student.profile.name')}
              </label>
              <input id="prof-name" className="ins-input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="ins-field">
              <label className="ins-field-label" htmlFor="prof-phone">
                {t('student.profile.phone')}
              </label>
              <input id="prof-phone" className="ins-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="ins-field">
              <label className="ins-field-label" htmlFor="prof-email">
                {t('student.profile.email')}
              </label>
              <input id="prof-email" className="ins-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="ins-field ins-field--wide">
              <label className="ins-field-label" htmlFor="prof-bio-en">
                {t('instructor.settings.bioEn')}
              </label>
              <input id="prof-bio-en" className="ins-input" value={bioEn} onChange={(e) => setBioEn(e.target.value)} />
            </div>
            <div className="ins-field ins-field--wide">
              <label className="ins-field-label" htmlFor="prof-bio-zh">
                {t('instructor.settings.bioZh')}
              </label>
              <input id="prof-bio-zh" className="ins-input" value={bioZh} onChange={(e) => setBioZh(e.target.value)} />
            </div>
          </div>
          <div className="ins-settings-actions">
            <button type="button" className="ins-btn ins-btn--secondary ins-btn--sm" onClick={cancel}>
              {t('common.cancel')}
            </button>
            <button type="button" className="ins-btn ins-btn--primary ins-btn--sm" disabled={busy} onClick={save}>
              {t('common.save')}
            </button>
          </div>
        </>
      ) : (
        <div className="ins-profile-view">
          <div className="ins-view-row">
            <span className="ins-view-label">{t('student.profile.name')}</span>
            <span className="ins-view-value">{inst.name}</span>
          </div>
          <div className="ins-view-row">
            <span className="ins-view-label">{t('student.profile.phone')}</span>
            <span className="ins-view-value">{inst.phone}</span>
          </div>
          <div className="ins-view-row">
            <span className="ins-view-label">{t('student.profile.email')}</span>
            <span className="ins-view-value">{inst.email || '—'}</span>
          </div>
          <div className="ins-view-row">
            <span className="ins-view-label">{t('instructor.settings.bioEn')}</span>
            <span className="ins-view-value">{inst.bio?.en || '—'}</span>
          </div>
          <div className="ins-view-row">
            <span className="ins-view-label">{t('instructor.settings.bioZh')}</span>
            <span className="ins-view-value">{inst.bio?.zh || '—'}</span>
          </div>
        </div>
      )}
    </section>
  )
}
