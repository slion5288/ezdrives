// ============================================================================
// EZDRIVES — Instructor ProfileSettings (instructor-owned local component)
// Edits the instructor's public profile (name / phone / email / bilingual bio)
// shown on the homepage 认识你的教练 section. Saved via mutate → PUT /api/state.
// ============================================================================

import { useState } from 'react'
import type { AppState } from '../../data/store'
import { updateInstructorProfile } from '../../data/store'
import { useT } from '../../i18n'
import { useToast } from './toast'
import { User } from 'lucide-react'

export default function ProfileSettings({ state }: { state: AppState }): JSX.Element {
  const t = useT()
  const toast = useToast()
  const inst = state.instructor
  const [name, setName] = useState(inst.name)
  const [phone, setPhone] = useState(inst.phone)
  const [email, setEmail] = useState(inst.email)
  const [bioEn, setBioEn] = useState(inst.bio?.en ?? '')
  const [bioZh, setBioZh] = useState(inst.bio?.zh ?? '')
  const [busy, setBusy] = useState(false)

  const dirty =
    name.trim() !== inst.name ||
    phone.trim() !== inst.phone ||
    email.trim() !== inst.email ||
    bioEn.trim() !== (inst.bio?.en ?? '') ||
    bioZh.trim() !== (inst.bio?.zh ?? '')

  const save = (): void => {
    setBusy(true)
    updateInstructorProfile({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      bio: { en: bioEn.trim(), zh: bioZh.trim() },
    })
    setBusy(false)
    toast({ tone: 'success', title: t('common.toast.saved') })
  }

  return (
    <section className="ins-panel ins-settings">
      <div className="ins-panel-head">
        <h2 className="ins-panel-title">
          <User size={16} /> {t('instructor.settings.profile')}
        </h2>
      </div>
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
        <button type="button" className="ins-btn ins-btn--primary ins-btn--sm" disabled={busy || !dirty} onClick={save}>
          {t('common.save')}
        </button>
      </div>
    </section>
  )
}
