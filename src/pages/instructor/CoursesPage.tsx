// ============================================================================
// EZDRIVES — Instructor CoursesPage (instructor-owned)
// Course cards with active toggle, add/edit modal. Structured course types:
// INDIVIDUAL_LESSON / TEN_HOUR_PACKAGE / TRIAL_LESSON / ROAD_TEST_CAR /
// FULL_COURSE_CERTIFICATE. The instructor types CHINESE ONLY; English is
// auto-translated on save (may stay empty on failure — never blocks saving).
// Each course can configure Student / Referral discounts.
// ============================================================================

import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { AppState, Course, CourseLesson, CourseType, DiscountConfig, LicenseClass } from '../../data/store'
import { courseTypeOf, deleteCourse, getSession, licenseOf, saveCourse, toggleCourse } from '../../data/store'
import { useLocale, useT } from '../../i18n'
import { Camera, GraduationCap, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Badge, ConfirmDialog, EmptyState, Modal, Toggle } from './ui'
import { useToast } from '../../components/shared'
import { formatMoney } from './helpers'
import { Button } from '../../components/shared/Button'
import { apiCourseTranslate } from '../../data/api'

interface LessonForm {
  nameEn: string
  nameZh: string
  descEn: string
  descZh: string
  price: string
}

interface CourseForm {
  id: string
  nameEn: string
  nameZh: string
  descEn: string
  descZh: string
  price: string
  courseType: CourseType
  licenseClass: LicenseClass
  durationMin: number
  active: boolean
  imageUrl: string
  lessons: LessonForm[]
  hourlyRate: string
  studentDiscountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  studentDiscountValue: string
  referralDiscountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  referralDiscountValue: string
}

const emptyLesson = (): LessonForm => ({ nameEn: '', nameZh: '', descEn: '', descZh: '', price: '50' })

const emptyForm = (): CourseForm => ({
  id: '',
  nameEn: '',
  nameZh: '',
  descEn: '',
  descZh: '',
  price: '60',
  courseType: 'INDIVIDUAL_LESSON',
  licenseClass: 'G2',
  durationMin: 60,
  active: true,
  imageUrl: '',
  lessons: Array.from({ length: 10 }, emptyLesson),
  hourlyRate: '60',
  studentDiscountType: 'PERCENTAGE',
  studentDiscountValue: '',
  referralDiscountType: 'PERCENTAGE',
  referralDiscountValue: '',
})

const lessonFrom = (l: CourseLesson): LessonForm => ({
  nameEn: l.name.en,
  nameZh: l.name.zh,
  descEn: l.description.en,
  descZh: l.description.zh,
  price: String(l.price),
})

const formFromCourse = (c: Course): CourseForm => {
  const t = courseTypeOf(c)
  const lic = licenseOf(c)
  return {
    id: c.id,
    nameEn: c.name.en,
    nameZh: c.name.zh,
    descEn: c.description.en,
    descZh: c.description.zh,
    price: String(c.price),
    courseType: t,
    licenseClass: lic,
    durationMin: c.durationMin,
    active: c.active,
    imageUrl: c.imageUrl ?? '',
    lessons:
      c.lessons && c.lessons.length > 0
        ? c.lessons.map(lessonFrom)
        : Array.from({ length: 10 }, emptyLesson),
    hourlyRate: String(c.hourlyRate ?? 60),
    studentDiscountType: c.studentDiscount?.type ?? 'PERCENTAGE',
    studentDiscountValue: c.studentDiscount ? String(c.studentDiscount.value) : '',
    referralDiscountType: c.referralDiscount?.type ?? 'PERCENTAGE',
    referralDiscountValue: c.referralDiscount ? String(c.referralDiscount.value) : '',
  }
}

/** Map course type → whether it is a licence-linked driving course. */
const LICENSE_TYPES: CourseType[] = ['INDIVIDUAL_LESSON', 'TEN_HOUR_PACKAGE']

/** Human label helper for course types (list cards). */
function courseTypeLabel(t: CourseType, zh: boolean): string {
  switch (t) {
    case 'INDIVIDUAL_LESSON': return zh ? '单课时' : 'Individual'
    case 'TEN_HOUR_PACKAGE': return zh ? '10 小时套餐' : '10-hour package'
    case 'TRIAL_LESSON': return zh ? '体验课' : 'Trial'
    case 'ROAD_TEST_CAR': return zh ? '考试用车' : 'Road test car'
    case 'FULL_COURSE_CERTIFICATE': return zh ? '全课程证书' : 'Certificate'
  }
}

export default function CoursesPage({ state }: { state: AppState }): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const toast = useToast()

  const [form, setForm] = useState<CourseForm | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ nameZh?: boolean; lessons?: boolean }>({})
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null)
  const [translating, setTranslating] = useState(false)
  const imageRef = useRef<HTMLInputElement>(null)

  // Translation cache: zh text → last translated en (only retranslate on change).
  const [zhCache, setZhCache] = useState<Record<string, string>>({})

  const clearError = (key: 'nameZh' | 'lessons'): void => {
    setFieldErrors((prev) => ({ ...prev, [key]: false }))
  }

  const openAdd = (): void => {
    setFieldErrors({})
    setForm(emptyForm())
    setZhCache({})
  }

  const openEdit = (course: Course): void => {
    setFieldErrors({})
    setForm(formFromCourse(course))
    setZhCache({})
  }

  const patchLesson = (idx: number, patch: Partial<LessonForm>): void => {
    setForm((prev) => {
      if (!prev) return prev
      const lessons = prev.lessons.map((l, i) => (i === idx ? { ...l, ...patch } : l))
      return { ...prev, lessons }
    })
  }

  const isPackageType = form?.courseType === 'TEN_HOUR_PACKAGE'

  /** Auto-translate all Chinese fields → English (cache-aware, §47). */
  const handleImage = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file || !form) return
    const reader = new FileReader()
    reader.onload = (): void => {
      const result = reader.result
      if (typeof result === 'string') setForm((f) => (f ? { ...f, imageUrl: result } : f))
    }
    reader.readAsDataURL(file)
  }

  const autoTranslate = async (): Promise<void> => {
    if (!form) return
    const texts: string[] = []
    const targets: Array<{ set: (v: string) => void }> = []
    const push = (zh: string, set: (v: string) => void): void => {
      const key = zh.trim()
      if (!key) return
      const cached = zhCache[key]
      if (cached) {
        set(cached)
        return
      }
      texts.push(key)
      targets.push({ set })
    }
    push(form.nameZh, (v) => setForm((f) => (f ? { ...f, nameEn: v } : f)))
    push(form.descZh, (v) => setForm((f) => (f ? { ...f, descEn: v } : f)))
    if (isPackageType) {
      form.lessons.forEach((l, i) => {
        push(l.nameZh, (v) => patchLesson(i, { nameEn: v }))
        push(l.descZh, (v) => patchLesson(i, { descEn: v }))
      })
    }
    if (texts.length === 0) return
    const session = getSession()
    if (!session.token) return
    setTranslating(true)
    try {
      const res = await apiCourseTranslate(session.token, texts)
      let list: string[] = []
      if (res.ok && Array.isArray(res.translations)) list = res.translations
      // §E: browser-direct MyMemory fallback when the server translation
      // returns empty (Cloudflare Workers egress is rate-limited in prod).
      if (list.length === 0 || list.some((v) => !v)) {
        const direct: string[] = []
        let cursor = 0
        const worker = async (): Promise<void> => {
          while (cursor < texts.length) {
            const i = cursor++
            try {
              const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(texts[i])}&langpair=zh-CN|en`)
              if (!r.ok) throw new Error('http ' + r.status)
              const d = await r.json()
              if (d?.responseStatus !== 200) throw new Error('resp ' + d?.responseStatus)
              direct[i] = (d?.responseData?.translatedText || '').trim()
            } catch {
              direct[i] = ''
            }
          }
        }
        await worker()
        // merge: prefer server result where non-empty, else direct.
        list = texts.map((_, i) => list[i] || direct[i] || '')
      }
      targets.forEach((target, i) => {
        const value = list[i]
        if (value) {
          target.set(value)
          setZhCache((prev) => ({ ...prev, [texts[i]]: value }))
        }
      })
    } catch {
      // translate failed — English stays empty; save still allowed (§46)
    } finally {
      setTranslating(false)
    }
  }

  const submitForm = (): void => {
    if (!form) return
    const errors: { nameZh?: boolean; lessons?: boolean } = {}
    if (!form.nameZh.trim()) errors.nameZh = true
    if (isPackageType && form.lessons.some((l) => !l.nameZh.trim())) errors.lessons = true
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      const first = document.querySelector<HTMLInputElement>('#course-name-zh')
      first?.focus()
      return
    }
    const discount = (type: 'PERCENTAGE' | 'FIXED_AMOUNT', value: string): DiscountConfig | null => {
      const v = Number(value)
      if (!value.trim() || isNaN(v) || v <= 0) return null
      return { type, value: v }
    }
    const lessons: CourseLesson[] | undefined = isPackageType
      ? form.lessons.map((l, i) => ({
          sequence_number: i + 1,
          name: { en: l.nameEn.trim(), zh: l.nameZh.trim() },
          description: { en: l.descEn.trim(), zh: l.descZh.trim() },
          price: Math.max(0, Number(l.price) || 0),
        }))
      : undefined
    const price = isPackageType
      ? (lessons ?? []).reduce((sum, l) => sum + l.price, 0)
      : Math.max(0, Number(form.price) || 0)
    // Trial: price = hourlyRate × 50% unless instructor overrode.
    const finalPrice =
      form.courseType === 'TRIAL_LESSON' && (!form.price || Number(form.price) <= 0)
        ? Math.round((Number(form.hourlyRate) || 60) * 0.5)
        : price
    const course: Course = {
      id: form.id,
      name: { en: form.nameEn.trim(), zh: form.nameZh.trim() },
      description: { en: form.descEn.trim(), zh: form.descZh.trim() },
      course_type: form.courseType,
      license_class: form.courseType === 'ROAD_TEST_CAR' || form.courseType === 'FULL_COURSE_CERTIFICATE' || form.courseType === 'TRIAL_LESSON'
        ? 'NONE'
        : form.licenseClass,
      type: isPackageType ? 'package' : 'single',
      price: finalPrice,
      durationMin:
        form.courseType === 'ROAD_TEST_CAR' ? 240 :
        isPackageType ? 60 : form.durationMin,
      active: form.active,
      imageUrl: form.imageUrl || undefined,
      lessons,
      hourlyRate: form.courseType === 'TRIAL_LESSON' ? Math.max(0, Number(form.hourlyRate) || 60) : undefined,
      studentDiscount: form.courseType === 'TRIAL_LESSON' || form.courseType === 'FULL_COURSE_CERTIFICATE'
        ? null
        : discount(form.studentDiscountType, form.studentDiscountValue),
      referralDiscount: form.courseType === 'TRIAL_LESSON' || form.courseType === 'FULL_COURSE_CERTIFICATE'
        ? null
        : discount(form.referralDiscountType, form.referralDiscountValue),
    }
    saveCourse(course)
    toast.push({ tone: 'success', title: t('instructor.courses.saved') })
    setForm(null)
  }

  const confirmDelete = (): void => {
    if (!deleteTarget) return
    deleteCourse(deleteTarget.id)
    toast.push({ tone: 'success', title: t('instructor.courses.deleted') })
    setDeleteTarget(null)
  }

  const showLicensePicker = form ? LICENSE_TYPES.includes(form.courseType) : false
  const showHourlyRate = form?.courseType === 'TRIAL_LESSON'

  return (
    <div className="ins-courses">
      <div className="ins-page-actions">
        <Button variant="primary" onClick={openAdd}>
          <Plus size={16} /> {t('instructor.courses.add')}
        </Button>
      </div>

      {state.courses.length === 0 ? (
        <div className="ins-panel">
          <EmptyState icon={<GraduationCap size={24} />} title={t('instructor.courses.empty')} />
        </div>
      ) : (
        <div className="ins-course-grid">
          {state.courses.map((course) => {
            const ct = courseTypeOf(course)
            const lic = licenseOf(course)
            return (
              <div key={course.id} className={`ins-course-card${course.active ? '' : ' is-inactive'}`}>
                <div className="ins-course-head">
                  <span className="ins-course-name">{locale === 'zh' ? course.name.zh : course.name.en}</span>
                  <div className="ins-course-badges">
                    <Badge tone="info">{courseTypeLabel(ct, locale === 'zh')}</Badge>
                    {lic !== 'NONE' ? <Badge tone="neutral">{lic}</Badge> : null}
                    {ct === 'TRIAL_LESSON' ? <Badge tone="warning">{t('instructor.courses.discountNone')}</Badge> : null}
                    <Badge tone={course.active ? 'success' : 'neutral'}>
                      {t(course.active ? 'instructor.courses.active' : 'instructor.courses.inactive')}
                    </Badge>
                  </div>
                </div>
                <p className="ins-course-desc">{locale === 'zh' ? course.description.zh : course.description.en}</p>
                <div className="ins-course-meta">
                  <span className="ins-course-price tabular-nums">
                    {formatMoney(course.price)} <span className="ins-course-cad">{t('common.cad')}</span>
                  </span>
                  <span className="ins-course-duration">
                    {ct === 'TEN_HOUR_PACKAGE'
                      ? t('courses.lessons', { count: course.lessons?.length ?? 11 })
                      : ct === 'ROAD_TEST_CAR'
                        ? `4h · ${t('instructor.courses.duration')}`
                        : t(`instructor.courses.duration${course.durationMin}`)}
                  </span>
                </div>
                <div className="ins-course-actions">
                  <div className="ins-course-toggle">
                    <span className="ins-course-toggle-label">{t('instructor.courses.active')}</span>
                    <Toggle checked={course.active} onChange={() => toggleCourse(course.id)} label={course.name.en} />
                  </div>
                  <div className="ins-course-btns">
                    <button type="button" className="ins-icon-btn" aria-label={t('common.edit')} onClick={() => openEdit(course)}>
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="ins-icon-btn is-danger"
                      aria-label={t('common.delete')}
                      onClick={() => setDeleteTarget(course)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {form ? (
        <Modal
          title={form.id ? t('instructor.courses.edit') : t('instructor.courses.add')}
          onClose={() => setForm(null)}
          maxWidth={isPackageType ? 820 : 560}
          footer={
            <>
              <Button variant="secondary" onClick={() => setForm(null)}>
                {t('common.cancel')}
              </Button>
              <Button variant="secondary" loading={translating} onClick={() => void autoTranslate()}>
                {t('instructor.courses.autoTranslate')}
              </Button>
              <Button variant="primary" onClick={submitForm}>
                {t('instructor.courses.save')}
              </Button>
            </>
          }
        >
          <div className="ins-form-grid">
            {/* Course type + license */}
            <div className="ins-field ins-field--wide">
              <span className="ins-field-label">{t('instructor.courses.type')}</span>
              <div className="ins-radio-row ins-radio-row--wrap">
                {(['INDIVIDUAL_LESSON', 'TEN_HOUR_PACKAGE', 'TRIAL_LESSON', 'ROAD_TEST_CAR', 'FULL_COURSE_CERTIFICATE'] as CourseType[]).map((ct) => (
                  <label key={ct} className="ins-radio">
                    <input
                      type="radio"
                      name="course-type-new"
                      checked={form.courseType === ct}
                      onChange={() =>
                        setForm({
                          ...form,
                          courseType: ct,
                          licenseClass: LICENSE_TYPES.includes(ct) ? (form.licenseClass === 'NONE' ? 'G2' : form.licenseClass) : 'NONE',
                        })
                      }
                    />
                    <span>{t(`instructor.courses.type${ct === 'INDIVIDUAL_LESSON' ? 'Individual' : ct === 'TEN_HOUR_PACKAGE' ? 'Package' : ct === 'TRIAL_LESSON' ? 'Trial' : ct === 'ROAD_TEST_CAR' ? 'RoadTest' : 'Certificate'}`)}</span>
                  </label>
                ))}
              </div>
            </div>

            {showLicensePicker ? (
              <div className="ins-field">
                <span className="ins-field-label">{t('instructor.courses.license')}</span>
                <div className="ins-radio-row">
                  {(['G2', 'G'] as LicenseClass[]).map((lic) => (
                    <label key={lic} className="ins-radio">
                      <input
                        type="radio"
                        name="course-license"
                        checked={form.licenseClass === lic}
                        onChange={() => setForm({ ...form, licenseClass: lic })}
                      />
                      <span>{t(`instructor.courses.license${lic}`)}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Name + description: Chinese primary, English auto */}
            <div className="ins-field">
              <label className="ins-field-label" htmlFor="course-name-zh">{t('instructor.courses.nameZh')}</label>
              <input id="course-name-zh" className="ins-input" aria-invalid={!!fieldErrors.nameZh} value={form.nameZh} onChange={(e) => { setForm({ ...form, nameZh: e.target.value }); clearError('nameZh') }} />
              {fieldErrors.nameZh ? <p className="ins-field-error">{t('common.required')}</p> : null}
            </div>
            <div className="ins-field">
              <label className="ins-field-label" htmlFor="course-name-en">{t('instructor.courses.nameEn')}</label>
              <input id="course-name-en" className="ins-input" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} placeholder="Auto-translated" />
            </div>
            <div className="ins-field ins-field--wide">
              <label className="ins-field-label" htmlFor="course-desc-zh">{t('instructor.courses.descZh')}</label>
              <textarea id="course-desc-zh" className="ins-input" rows={2} value={form.descZh} onChange={(e) => setForm({ ...form, descZh: e.target.value })} />
            </div>
            <div className="ins-field ins-field--wide">
              <label className="ins-field-label" htmlFor="course-desc-en">{t('instructor.courses.descEn')}</label>
              <textarea id="course-desc-en" className="ins-input" rows={2} value={form.descEn} onChange={(e) => setForm({ ...form, descEn: e.target.value })} placeholder="Auto-translated" />
            </div>
            <p className="ins-field-hint ins-field--wide">{t('instructor.courses.autoTranslate')}</p>

            {/* Pricing */}
            {form.courseType !== 'TEN_HOUR_PACKAGE' ? (
              <div className="ins-field">
                <label className="ins-field-label" htmlFor="course-price">{t('instructor.courses.price')}</label>
                <input
                  id="course-price"
                  className="ins-input tabular-nums"
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
                {form.courseType === 'TRIAL_LESSON' ? (
                  <p className="ins-field-hint">
                    {t('instructor.courses.trialPriceNote')}: ${Math.round((Number(form.hourlyRate) || 60) * 0.5)}
                  </p>
                ) : null}
              </div>
            ) : null}

            {showHourlyRate ? (
              <div className="ins-field">
                <label className="ins-field-label" htmlFor="course-hourly">{t('instructor.courses.hourlyRate')}</label>
                <input
                  id="course-hourly"
                  className="ins-input tabular-nums"
                  type="number"
                  min={0}
                  value={form.hourlyRate}
                  onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                />
              </div>
            ) : null}

            {form.courseType === 'INDIVIDUAL_LESSON' ? (
              <div className="ins-field">
                <span className="ins-field-label">{t('instructor.courses.duration')}</span>
                <div className="ins-radio-row">
                  <label className="ins-radio">
                    <input type="radio" name="course-duration" checked={form.durationMin === 60} onChange={() => setForm({ ...form, durationMin: 60 })} />
                    <span>{t('instructor.courses.duration60')}</span>
                  </label>
                  <label className="ins-radio">
                    <input type="radio" name="course-duration" checked={form.durationMin === 120} onChange={() => setForm({ ...form, durationMin: 120 })} />
                    <span>{t('instructor.courses.duration120')}</span>
                  </label>
                </div>
              </div>
            ) : null}

            {form.courseType === 'ROAD_TEST_CAR' ? (
              <p className="ins-field-hint ins-field--wide">{t('instructor.courses.roadTestHint')}</p>
            ) : null}
            {form.courseType === 'FULL_COURSE_CERTIFICATE' ? (
              <p className="ins-field-hint ins-field--wide">{t('instructor.courses.certificateHint')}</p>
            ) : null}

            {/* Package lessons 1-10 + 11 mock test */}
            {isPackageType ? (
              <div className="ins-field ins-field--wide">
                <label className="ins-field-label">{t('instructor.courses.lessons')}</label>
                <div className="ins-package-editor">
                  {form.lessons.map((lesson, i) => (
                    <div key={i} className="ins-package-row">
                      <span className="ins-package-row-num tabular-nums">{i + 1}</span>
                      <input
                        className="ins-input"
                        placeholder={t('instructor.courses.lessonNameZh')}
                        aria-label={t('instructor.courses.lessonNameZh') + ` (${i + 1})`}
                        value={lesson.nameZh}
                        onChange={(e) => patchLesson(i, { nameZh: e.target.value })}
                      />
                      <input
                        className="ins-input"
                        placeholder="Auto-translated EN"
                        aria-label={t('instructor.courses.lessonNameEn') + ` (${i + 1})`}
                        value={lesson.nameEn}
                        onChange={(e) => patchLesson(i, { nameEn: e.target.value })}
                      />
                      <input
                        className="ins-input"
                        placeholder={t('instructor.courses.lessonDescZh')}
                        aria-label={t('instructor.courses.lessonDescZh') + ` (${i + 1})`}
                        value={lesson.descZh}
                        onChange={(e) => patchLesson(i, { descZh: e.target.value })}
                      />
                      <input
                        className="ins-input"
                        placeholder="Desc EN"
                        aria-label={t('instructor.courses.lessonDescEn') + ` (${i + 1})`}
                        value={lesson.descEn}
                        onChange={(e) => patchLesson(i, { descEn: e.target.value })}
                      />
                      <input
                        className="ins-input ins-input--price tabular-nums"
                        type="number"
                        min={0}
                        placeholder="$"
                        aria-label={t('instructor.courses.price') + ` (${i + 1})`}
                        value={lesson.price}
                        onChange={(e) => patchLesson(i, { price: e.target.value })}
                      />
                    </div>
                  ))}
                  <div className="ins-package-row ins-package-row--mock">
                    <span className="ins-package-row-num tabular-nums">11</span>
                    <span className="ins-package-mock-label">🔒 {t('instructor.courses.mockTest')}</span>
                  </div>
                </div>
                <p className="ins-field-hint">
                  {t('instructor.courses.packageTotal', {
                    total: form.lessons.reduce((sum, l) => sum + (Math.max(0, Number(l.price) || 0)), 0),
                  })}
                </p>
                {fieldErrors.lessons ? <p className="ins-field-error">{t('common.required')}</p> : null}
              </div>
            ) : null}

            {/* Discounts (not for Trial / Certificate) */}
            {form.courseType !== 'TRIAL_LESSON' && form.courseType !== 'FULL_COURSE_CERTIFICATE' ? (
              <>
                <div className="ins-field">
                  <span className="ins-field-label">{t('instructor.courses.studentDiscount')}</span>
                  <div className="ins-radio-row">
                    <label className="ins-radio">
                      <input type="radio" name="stu-dtype" checked={form.studentDiscountType === 'PERCENTAGE'} onChange={() => setForm({ ...form, studentDiscountType: 'PERCENTAGE' })} />
                      <span>{t('instructor.courses.discountPercent')}</span>
                    </label>
                    <label className="ins-radio">
                      <input type="radio" name="stu-dtype" checked={form.studentDiscountType === 'FIXED_AMOUNT'} onChange={() => setForm({ ...form, studentDiscountType: 'FIXED_AMOUNT' })} />
                      <span>{t('instructor.courses.discountFixed')}</span>
                    </label>
                  </div>
                  <input
                    className="ins-input tabular-nums"
                    type="number"
                    min={0}
                    placeholder={t('instructor.courses.discountValue')}
                    value={form.studentDiscountValue}
                    onChange={(e) => setForm({ ...form, studentDiscountValue: e.target.value })}
                  />
                </div>
                <div className="ins-field">
                  <span className="ins-field-label">{t('instructor.courses.referralDiscount')}</span>
                  <div className="ins-radio-row">
                    <label className="ins-radio">
                      <input type="radio" name="ref-dtype" checked={form.referralDiscountType === 'PERCENTAGE'} onChange={() => setForm({ ...form, referralDiscountType: 'PERCENTAGE' })} />
                      <span>{t('instructor.courses.discountPercent')}</span>
                    </label>
                    <label className="ins-radio">
                      <input type="radio" name="ref-dtype" checked={form.referralDiscountType === 'FIXED_AMOUNT'} onChange={() => setForm({ ...form, referralDiscountType: 'FIXED_AMOUNT' })} />
                      <span>{t('instructor.courses.discountFixed')}</span>
                    </label>
                  </div>
                  <input
                    className="ins-input tabular-nums"
                    type="number"
                    min={0}
                    placeholder={t('instructor.courses.discountValue')}
                    value={form.referralDiscountValue}
                    onChange={(e) => setForm({ ...form, referralDiscountValue: e.target.value })}
                  />
                </div>
              </>
            ) : null}

            {/* Image */}
            <div className="ins-field ins-field--wide">
              <span className="ins-field-label">{t('instructor.courses.image')}</span>
              <div className="ins-course-image-row">
                <label className="ins-photo-upload">
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="" className="ins-photo-preview ins-photo-preview--course" />
                  ) : (
                    <span className="ins-photo-placeholder">
                      <Camera size={20} />
                      {t('instructor.courses.image')}
                    </span>
                  )}
                  <input ref={imageRef} type="file" accept="image/*" className="visually-hidden" onChange={handleImage} />
                </label>
                {form.imageUrl ? (
                  <button
                    type="button"
                    className="ins-icon-btn is-danger"
                    aria-label={t('common.delete')}
                    onClick={() => setForm({ ...form, imageUrl: '' })}
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          {Object.values(fieldErrors).some(Boolean) ? <p className="ins-field-error">{t('common.required')}</p> : null}
        </Modal>
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title={t('common.confirm.title')}
          body={t('instructor.courses.deleteConfirm')}
          confirmLabel={t('common.delete')}
          danger
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  )
}
