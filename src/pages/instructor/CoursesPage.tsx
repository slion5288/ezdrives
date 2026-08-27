// ============================================================================
// EZDRIVES — Instructor CoursesPage (instructor-owned)
// Course cards with active toggle, add/edit modal. Each course is either a
// SINGLE hourly lesson (1h / 2h) or a PACKAGE (套餐) of exactly 10 lessons,
// where every lesson has its own editable name, description and price. The
// package price is the sum of its lessons.
// ============================================================================

import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { AppState, Course, CourseLesson } from '../../data/store'
import { deleteCourse, saveCourse, toggleCourse } from '../../data/store'
import { useLocale, useT } from '../../i18n'
import { Camera, GraduationCap, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Badge, ConfirmDialog, EmptyState, Modal, Toggle } from './ui'
import { useToast } from './toast'
import { formatMoney } from './helpers'

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
  type: 'single' | 'package'
  durationMin: 60 | 120
  active: boolean
  examCar: boolean
  imageUrl: string
  lessons: LessonForm[]
}

const emptyLesson = (): LessonForm => ({ nameEn: '', nameZh: '', descEn: '', descZh: '', price: '50' })

const emptyForm = (): CourseForm => ({
  id: '',
  nameEn: '',
  nameZh: '',
  descEn: '',
  descZh: '',
  price: '60',
  type: 'single',
  durationMin: 60,
  active: true,
  examCar: false,
  imageUrl: '',
  lessons: Array.from({ length: 10 }, emptyLesson),
})

const lessonFrom = (l: CourseLesson): LessonForm => ({
  nameEn: l.name.en,
  nameZh: l.name.zh,
  descEn: l.description.en,
  descZh: l.description.zh,
  price: String(l.price),
})

const formFromCourse = (c: Course): CourseForm => ({
  id: c.id,
  nameEn: c.name.en,
  nameZh: c.name.zh,
  descEn: c.description.en,
  descZh: c.description.zh,
  price: String(c.price),
  type: c.type ?? 'single',
  durationMin: c.durationMin,
  active: c.active,
  examCar: c.examCar ?? false,
  imageUrl: c.imageUrl ?? '',
  lessons:
    c.lessons && c.lessons.length > 0
      ? c.lessons.map(lessonFrom)
      : Array.from({ length: 10 }, emptyLesson),
})

export default function CoursesPage({ state }: { state: AppState }): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const toast = useToast()

  const [form, setForm] = useState<CourseForm | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ nameEn?: boolean; nameZh?: boolean; lessons?: boolean }>({})
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null)
  const imageRef = useRef<HTMLInputElement>(null)

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

  const clearError = (key: 'nameEn' | 'nameZh' | 'lessons'): void => {
    setFieldErrors((prev) => ({ ...prev, [key]: false }))
  }

  const openAdd = (): void => {
    setFieldErrors({})
    setForm(emptyForm())
  }

  const openEdit = (course: Course): void => {
    setFieldErrors({})
    setForm(formFromCourse(course))
  }

  const patchLesson = (idx: number, patch: Partial<LessonForm>): void => {
    if (!form) return
    const lessons = form.lessons.map((l, i) => (i === idx ? { ...l, ...patch } : l))
    setForm({ ...form, lessons })
  }

  const submitForm = (): void => {
    if (!form) return
    const errors: { nameEn?: boolean; nameZh?: boolean; lessons?: boolean } = {}
    if (!form.nameEn.trim()) errors.nameEn = true
    if (!form.nameZh.trim()) errors.nameZh = true
    const isPackage = form.type === 'package'
    if (isPackage && form.lessons.some((l) => !l.nameEn.trim() || !l.nameZh.trim())) errors.lessons = true
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      const first = document.querySelector<HTMLInputElement>('#course-name-en, #course-name-zh')
      first?.focus()
      return
    }
    const lessons: CourseLesson[] | undefined = isPackage
      ? form.lessons.map((l) => ({
          name: { en: l.nameEn.trim(), zh: l.nameZh.trim() },
          description: { en: l.descEn.trim(), zh: l.descZh.trim() },
          price: Math.max(0, Number(l.price) || 0),
        }))
      : undefined
    const price = isPackage
      ? (lessons ?? []).reduce((sum, l) => sum + l.price, 0)
      : Math.max(0, Number(form.price) || 0)
    saveCourse({
      id: form.id,
      name: { en: form.nameEn.trim(), zh: form.nameZh.trim() },
      description: { en: form.descEn.trim(), zh: form.descZh.trim() },
      type: form.type,
      price,
      durationMin: isPackage ? 60 : form.durationMin,
      active: form.active,
      examCar: form.examCar,
      imageUrl: form.imageUrl || undefined,
      lessons,
    })
    toast({ tone: 'success', title: t('instructor.courses.saved') })
    setForm(null)
  }

  const confirmDelete = (): void => {
    if (!deleteTarget) return
    deleteCourse(deleteTarget.id)
    toast({ tone: 'success', title: t('instructor.courses.deleted') })
    setDeleteTarget(null)
  }

  return (
    <div className="ins-courses">
      <div className="ins-page-actions">
        <button type="button" className="ins-btn ins-btn--primary" onClick={openAdd}>
          <Plus size={16} /> {t('instructor.courses.add')}
        </button>
      </div>

      {state.courses.length === 0 ? (
        <div className="ins-panel">
          <EmptyState icon={<GraduationCap size={24} />} title={t('instructor.courses.empty')} />
        </div>
      ) : (
        <div className="ins-course-grid">
          {state.courses.map((course) => (
            <div key={course.id} className={`ins-course-card${course.active ? '' : ' is-inactive'}`}>
              <div className="ins-course-head">
                <span className="ins-course-name">{locale === 'zh' ? course.name.zh : course.name.en}</span>
                <div className="ins-course-badges">
                  {course.type === 'package' ? <Badge tone="info">{t('instructor.courses.typePackage')}</Badge> : null}
                  {course.examCar ? <Badge tone="warning">{t('instructor.courses.examCar')}</Badge> : null}
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
                  {course.type === 'package'
                    ? t('courses.lessons', { count: course.lessons?.length ?? 10 })
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
          ))}
        </div>
      )}

      {form ? (
        <Modal
          title={form.id ? t('instructor.courses.edit') : t('instructor.courses.add')}
          onClose={() => setForm(null)}
          maxWidth={form.type === 'package' ? 820 : 480}
          footer={
            <>
              <button type="button" className="ins-btn ins-btn--secondary" onClick={() => setForm(null)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="ins-btn ins-btn--primary" onClick={submitForm}>
                {t('instructor.courses.save')}
              </button>
            </>
          }
        >
          <div className="ins-form-grid">
            <div className="ins-field">
              <label className="ins-field-label" htmlFor="course-name-en">{t('instructor.courses.nameEn')}</label>
              <input id="course-name-en" className="ins-input" aria-invalid={!!fieldErrors.nameEn} value={form.nameEn} onChange={(e) => { setForm({ ...form, nameEn: e.target.value }); clearError('nameEn') }} />
              {fieldErrors.nameEn ? <p className="ins-field-error">{t('common.required')}</p> : null}
            </div>
            <div className="ins-field">
              <label className="ins-field-label" htmlFor="course-name-zh">{t('instructor.courses.nameZh')}</label>
              <input id="course-name-zh" className="ins-input" aria-invalid={!!fieldErrors.nameZh} value={form.nameZh} onChange={(e) => { setForm({ ...form, nameZh: e.target.value }); clearError('nameZh') }} />
              {fieldErrors.nameZh ? <p className="ins-field-error">{t('common.required')}</p> : null}
            </div>
            <div className="ins-field ins-field--wide">
              <label className="ins-field-label" htmlFor="course-desc-en">{t('instructor.courses.descEn')}</label>
              <textarea id="course-desc-en" className="ins-input" rows={2} value={form.descEn} onChange={(e) => setForm({ ...form, descEn: e.target.value })} />
            </div>
            <div className="ins-field ins-field--wide">
              <label className="ins-field-label" htmlFor="course-desc-zh">{t('instructor.courses.descZh')}</label>
              <textarea id="course-desc-zh" className="ins-input" rows={2} value={form.descZh} onChange={(e) => setForm({ ...form, descZh: e.target.value })} />
            </div>

            <div className="ins-field ins-field--wide">
              <span className="ins-field-label">{t('instructor.courses.type')}</span>
              <div className="ins-radio-row">
                <label className="ins-radio">
                  <input
                    type="radio"
                    name="course-type"
                    checked={form.type === 'single'}
                    onChange={() => setForm({ ...form, type: 'single' })}
                  />
                  <span>{t('instructor.courses.typeSingle')}</span>
                </label>
                <label className="ins-radio">
                  <input
                    type="radio"
                    name="course-type"
                    checked={form.type === 'package'}
                    onChange={() => setForm({ ...form, type: 'package' })}
                  />
                  <span>{t('instructor.courses.typePackage')}</span>
                </label>
              </div>
            </div>

            {form.type === 'single' ? (
              <>
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
                </div>
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
              </>
            ) : (
              <div className="ins-field ins-field--wide">
                <label className="ins-field-label" htmlFor="course-lesson-0">{t('instructor.courses.lessons')}</label>
                <div className="ins-package-editor">
                  {form.lessons.map((lesson, i) => (
                    <div key={i} className="ins-package-row">
                      <span className="ins-package-row-num tabular-nums">{i + 1}</span>
                      <input
                        className="ins-input"
                        placeholder={t('instructor.courses.lessonNameEn')}
                        aria-label={t('instructor.courses.lessonNameEn') + ` (${i + 1})`}
                        value={lesson.nameEn}
                        onChange={(e) => patchLesson(i, { nameEn: e.target.value })}
                      />
                      <input
                        className="ins-input"
                        placeholder={t('instructor.courses.lessonNameZh')}
                        aria-label={t('instructor.courses.lessonNameZh') + ` (${i + 1})`}
                        value={lesson.nameZh}
                        onChange={(e) => patchLesson(i, { nameZh: e.target.value })}
                      />
                      <input
                        className="ins-input"
                        placeholder={t('instructor.courses.lessonDescEn')}
                        aria-label={t('instructor.courses.lessonDescEn') + ` (${i + 1})`}
                        value={lesson.descEn}
                        onChange={(e) => patchLesson(i, { descEn: e.target.value })}
                      />
                      <input
                        className="ins-input"
                        placeholder={t('instructor.courses.lessonDescZh')}
                        aria-label={t('instructor.courses.lessonDescZh') + ` (${i + 1})`}
                        value={lesson.descZh}
                        onChange={(e) => patchLesson(i, { descZh: e.target.value })}
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
                </div>
                <p className="ins-field-hint">
                  {t('instructor.courses.packageTotal', {
                    total: form.lessons.reduce((sum, l) => sum + (Math.max(0, Number(l.price) || 0)), 0),
                  })}
                </p>
                {fieldErrors.lessons ? <p className="ins-field-error">{t('common.required')}</p> : null}
              </div>
            )}

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

            <div className="ins-field ins-toggle-row">
              <span className="ins-field-label">{t('instructor.courses.examCar')}</span>
              <Toggle
                checked={form.examCar}
                onChange={() => setForm({ ...form, examCar: !form.examCar })}
                label={t('instructor.courses.examCar')}
              />
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
