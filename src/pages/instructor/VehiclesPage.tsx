// ============================================================================
// EZDRIVES — Instructor VehiclesPage (instructor-owned)
// Vehicle card grid (photo or placeholder, make/model/plate/bilingual color)
// with active toggle, photo upload (FileReader → dataURL), add/edit modal
// and delete confirm.
// ============================================================================

import { useState } from 'react'
import type { ChangeEvent } from 'react'
import type { AppState, Vehicle } from '../../data/store'
import { deleteVehicle, saveVehicle } from '../../data/store'
import { useLocale, useT } from '../../i18n'
import { Camera, Car, Pencil, Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog, EmptyState, Modal, Toggle } from './ui'
import { useToast } from './toast'

interface VehicleForm {
  id: string
  make: string
  model: string
  plate: string
  colorEn: string
  colorZh: string
  photoUrl: string | null
  active: boolean
}

const emptyForm = (): VehicleForm => ({
  id: '',
  make: '',
  model: '',
  plate: '',
  colorEn: '',
  colorZh: '',
  photoUrl: null,
  active: true,
})

const formFromVehicle = (v: Vehicle): VehicleForm => ({
  id: v.id,
  make: v.make,
  model: v.model,
  plate: v.plate,
  colorEn: v.color.en,
  colorZh: v.color.zh,
  photoUrl: v.photoUrl,
  active: v.active,
})

export default function VehiclesPage({ state }: { state: AppState }): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const toast = useToast()

  const [form, setForm] = useState<VehicleForm | null>(null)
  const [formError, setFormError] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null)

  const openAdd = (): void => {
    setFormError(false)
    setForm(emptyForm())
  }

  const openEdit = (v: Vehicle): void => {
    setFormError(false)
    setForm(formFromVehicle(v))
  }

  const handlePhoto = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (): void => {
      const result = reader.result
      if (typeof result === 'string') {
        setForm((f) => (f ? { ...f, photoUrl: result } : f))
      }
    }
    reader.readAsDataURL(file)
  }

  const submitForm = (): void => {
    if (!form) return
    if (!form.make.trim() || !form.model.trim() || !form.plate.trim() || !form.colorEn.trim() || !form.colorZh.trim()) {
      setFormError(true)
      return
    }
    saveVehicle({
      id: form.id,
      make: form.make.trim(),
      model: form.model.trim(),
      plate: form.plate.trim(),
      color: { en: form.colorEn.trim(), zh: form.colorZh.trim() },
      photoUrl: form.photoUrl,
      active: form.active,
    })
    toast({ tone: 'success', title: t('instructor.vehicles.saved') })
    setForm(null)
  }

  const toggleActive = (v: Vehicle): void => {
    saveVehicle({ ...v, active: !v.active })
  }

  const confirmDelete = (): void => {
    if (!deleteTarget) return
    deleteVehicle(deleteTarget.id)
    toast({ tone: 'success', title: t('common.toast.deleted') })
    setDeleteTarget(null)
  }

  return (
    <div className="ins-vehicles">
      <div className="ins-page-actions">
        <button type="button" className="ins-btn ins-btn--primary" onClick={openAdd}>
          <Plus size={16} /> {t('instructor.vehicles.add')}
        </button>
      </div>

      {state.vehicles.length === 0 ? (
        <div className="ins-panel">
          <EmptyState icon={<Car size={24} />} title={t('instructor.vehicles.empty')} />
        </div>
      ) : (
        <div className="ins-vehicle-grid">
          {state.vehicles.map((v) => (
            <div key={v.id} className={`ins-vehicle-card${v.active ? '' : ' is-inactive'}`}>
              <div className="ins-vehicle-photo">
                {v.photoUrl ? (
                  <img src={v.photoUrl} alt="" />
                ) : (
                  <span className="ins-vehicle-photo-ph">
                    <Car size={30} />
                  </span>
                )}
              </div>
              {v.photos && v.photos.length > 1 ? (
                <div className="ins-vehicle-gallery">
                  {v.photos.map((src, i) => (
                    <img key={i} src={src} alt="" loading="lazy" />
                  ))}
                </div>
              ) : null}
              <div className="ins-vehicle-body">
                <span className="ins-vehicle-name">
                  {v.make} {v.model}
                </span>
                <span className="ins-vehicle-plate tabular-nums">{v.plate}</span>
                <span className="ins-vehicle-color">{locale === 'zh' ? v.color.zh : v.color.en}</span>
              </div>
              <div className="ins-vehicle-foot">
                <div className="ins-vehicle-toggle">
                  <span className="ins-vehicle-toggle-label">{t('instructor.vehicles.active')}</span>
                  <Toggle checked={v.active} onChange={() => toggleActive(v)} label={`${v.make} ${v.model}`} />
                </div>
                <div className="ins-vehicle-btns">
                  <button type="button" className="ins-icon-btn" aria-label={t('common.edit')} onClick={() => openEdit(v)}>
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="ins-icon-btn is-danger"
                    aria-label={t('common.delete')}
                    onClick={() => setDeleteTarget(v)}
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
          title={form.id ? t('instructor.vehicles.edit') : t('instructor.vehicles.add')}
          onClose={() => setForm(null)}
          footer={
            <>
              <button type="button" className="ins-btn ins-btn--secondary" onClick={() => setForm(null)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="ins-btn ins-btn--primary" onClick={submitForm}>
                {t('instructor.vehicles.save')}
              </button>
            </>
          }
        >
          <div className="ins-form-grid">
            <div className="ins-field">
              <span className="ins-field-label">{t('instructor.vehicles.make')}</span>
              <input className="ins-input" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
            </div>
            <div className="ins-field">
              <span className="ins-field-label">{t('instructor.vehicles.model')}</span>
              <input className="ins-input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
            <div className="ins-field">
              <span className="ins-field-label">{t('instructor.vehicles.plate')}</span>
              <input className="ins-input tabular-nums" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} />
            </div>
            <div className="ins-field">
              <span className="ins-field-label">{t('instructor.vehicles.color')} (EN)</span>
              <input className="ins-input" value={form.colorEn} onChange={(e) => setForm({ ...form, colorEn: e.target.value })} />
            </div>
            <div className="ins-field">
              <span className="ins-field-label">{t('instructor.vehicles.color')} (中文)</span>
              <input className="ins-input" value={form.colorZh} onChange={(e) => setForm({ ...form, colorZh: e.target.value })} />
            </div>
            <div className="ins-field ins-field--wide ins-photo-field">
              <span className="ins-field-label">{t('instructor.vehicles.photo')}</span>
              <label className="ins-photo-upload">
                {form.photoUrl ? (
                  <img src={form.photoUrl} alt="" className="ins-photo-preview" />
                ) : (
                  <span className="ins-photo-placeholder">
                    <Camera size={20} />
                    {t('instructor.vehicles.photo')}
                  </span>
                )}
                <input type="file" accept="image/*" className="visually-hidden" onChange={handlePhoto} />
              </label>
            </div>
            <div className="ins-field ins-toggle-row">
              <span className="ins-field-label">{t('instructor.vehicles.active')}</span>
              <Toggle checked={form.active} onChange={() => setForm({ ...form, active: !form.active })} label={t('instructor.vehicles.active')} />
            </div>
          </div>
          {formError ? <p className="ins-field-error">{t('common.required')}</p> : null}
        </Modal>
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title={t('common.confirm.title')}
          body={t('instructor.vehicles.deleteConfirm')}
          confirmLabel={t('common.delete')}
          danger
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  )
}
