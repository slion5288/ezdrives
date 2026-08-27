// ============================================================================
// EZDRIVES — Instructor VideoManager (instructor-owned)
// Shown on the Settings page (设置). The instructor adds teaching videos
// that appear on the homepage: either a YouTube link (embedded in the app —
// never redirects to YouTube) or a local file stored as a data URL in the
// browser. No fixed size limit: any clip that fits browser storage is kept;
// oversized files get a clear storage warning. Clicking a thumbnail previews
// the video in the in-app player.
// ============================================================================

import { useRef, useState } from 'react'
import type { AppState, TeachingVideo } from '../../data/store'
import { deleteVideo, saveVideo } from '../../data/store'
import { useLocale, useT } from '../../i18n'
import { ArrowDown, ArrowUp, Pencil, Play, Plus, Trash2, Upload, Youtube } from 'lucide-react'
import { Badge, ConfirmDialog, EmptyState, Modal, Toggle } from './ui'
import { useToast } from './toast'
import { toLocalISO } from '../../data/timeEngine'
import { VideoPlayerModal } from '../../components/video/VideoPlayerModal'

/** Extract a YouTube video id from common URL shapes; null when not a YouTube link. */
export function parseYouTubeId(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  const m = trimmed.match(
    /(?:youtube\.com\/(?:watch\?[^#]*v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/,
  )
  return m ? m[1] : null
}

/** Probe whether a data URL fits in localStorage (no fixed size limit — the browser decides). */
function fitsLocalStorage(dataUrl: string): boolean {
  try {
    localStorage.setItem('dw.quota-probe', dataUrl)
    localStorage.removeItem('dw.quota-probe')
    return true
  } catch {
    return false
  }
}

interface VideoForm {
  id: string
  titleEn: string
  titleZh: string
  descEn: string
  descZh: string
  kind: 'youtube' | 'local'
  youtubeUrl: string
  localDataUrl: string
  localName: string
  active: boolean
}

const emptyForm = (): VideoForm => ({
  id: '',
  titleEn: '',
  titleZh: '',
  descEn: '',
  descZh: '',
  kind: 'youtube',
  youtubeUrl: '',
  localDataUrl: '',
  localName: '',
  active: true,
})

const formFromVideo = (v: TeachingVideo): VideoForm => ({
  id: v.id,
  titleEn: v.title.en,
  titleZh: v.title.zh,
  descEn: v.description?.en ?? '',
  descZh: v.description?.zh ?? '',
  kind: v.kind,
  youtubeUrl: v.kind === 'youtube' ? `https://www.youtube.com/watch?v=${v.src}` : '',
  localDataUrl: v.kind === 'local' ? v.src : '',
  localName: v.kind === 'local' ? 'video' : '',
  active: v.active,
})

function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

export default function VideoManager({ state }: { state: AppState }): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<VideoForm | null>(null)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<TeachingVideo | null>(null)
  const [preview, setPreview] = useState<TeachingVideo | null>(null)

  const videos = [...state.videos].sort((a, b) => a.order - b.order || a.addedAt.localeCompare(b.addedAt))

  const openAdd = (): void => {
    setError('')
    setForm(emptyForm())
  }

  const openEdit = (video: TeachingVideo): void => {
    setError('')
    setForm(formFromVideo(video))
  }

  const onPickFile = (file: File | undefined): void => {
    if (!file || !form) return
    const reader = new FileReader()
    reader.onload = () => {
      if (!form) return
      const dataUrl = String(reader.result ?? '')
      if (!fitsLocalStorage(dataUrl)) {
        setError(t('instructor.videos.localTooBig'))
        return
      }
      setForm({ ...form, localDataUrl: dataUrl, localName: file.name })
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const move = (idx: number, delta: -1 | 1): void => {
    const target = idx + delta
    if (target < 0 || target >= videos.length) return
    const a = videos[idx]
    const b = videos[target]
    saveVideo({ ...a, order: b.order })
    saveVideo({ ...b, order: a.order })
  }

  const submit = (): void => {
    if (!form) return
    if (!form.titleEn.trim() || !form.titleZh.trim()) {
      setError(t('common.required'))
      return
    }
    let src = ''
    if (form.kind === 'youtube') {
      const id = parseYouTubeId(form.youtubeUrl)
      if (!id) {
        setError(t('instructor.videos.invalidUrl'))
        return
      }
      src = id
    } else {
      if (!form.localDataUrl) {
        setError(t('instructor.videos.fileEmpty'))
        return
      }
      src = form.localDataUrl
    }
    const existing = state.videos.find((v) => v.id === form.id)
    saveVideo({
      id: form.id,
      title: { en: form.titleEn.trim(), zh: form.titleZh.trim() },
      description: { en: form.descEn.trim(), zh: form.descZh.trim() },
      kind: form.kind,
      src,
      order:
        form.id === ''
          ? Math.max(0, ...state.videos.map((v) => v.order)) + 1
          : existing?.order ?? 0,
      active: form.active,
      addedAt: existing?.addedAt ?? toLocalISO(new Date()),
    })
    toast({ tone: 'success', title: t('instructor.videos.saved') })
    setForm(null)
  }

  const confirmDelete = (): void => {
    if (!deleteTarget) return
    deleteVideo(deleteTarget.id)
    toast({ tone: 'success', title: t('instructor.videos.deleted') })
    setDeleteTarget(null)
  }

  return (
    <section className="ins-panel ins-videos">
      <div className="ins-panel-head">
        <h2 className="ins-panel-title">
          <Play size={16} /> {t('instructor.videos.title')}
          <Badge tone="info">{t('landing.videos.title')}</Badge>
        </h2>
        <button type="button" className="ins-btn ins-btn--primary ins-btn--sm" onClick={openAdd}>
          <Plus size={14} /> {t('instructor.videos.add')}
        </button>
      </div>

      {videos.length === 0 ? (
        <EmptyState
          icon={<Youtube size={24} />}
          title={t('instructor.videos.empty')}
          action={
            <button type="button" className="ins-btn ins-btn--secondary" onClick={openAdd}>
              <Plus size={14} /> {t('instructor.videos.add')}
            </button>
          }
        />
      ) : (
        <div className="ins-video-list">
          {videos.map((video, idx) => (
            <div key={video.id} className={`ins-video-row${video.active ? '' : ' is-inactive'}`}>
              <button
                type="button"
                className="ins-video-thumb"
                onClick={() => setPreview(video)}
                aria-label={t('instructor.videos.preview', {
                  title: locale === 'zh' ? video.title.zh : video.title.en,
                })}
              >
                {video.kind === 'youtube' ? (
                  <img src={youtubeThumb(video.src)} alt="" loading="lazy" />
                ) : (
                  <video src={video.src} muted preload="metadata" />
                )}
                <span className="ins-video-thumb-play" aria-hidden="true">
                  <Play size={16} fill="currentColor" />
                </span>
              </button>
              <div className="ins-video-info">
                <div className="ins-video-title">{locale === 'zh' ? video.title.zh : video.title.en}</div>
                {video.description && (video.description.en || video.description.zh) ? (
                  <div className="ins-video-desc">
                    {locale === 'zh' && video.description.zh
                      ? video.description.zh
                      : locale === 'en' && video.description.en
                        ? video.description.en
                        : video.description.en || video.description.zh}
                  </div>
                ) : null}
                <div className="ins-video-meta">
                  <Badge tone={video.kind === 'youtube' ? 'danger' : 'neutral'}>
                    {video.kind === 'youtube' ? t('instructor.videos.youtubeBadge') : t('instructor.videos.localBadge')}
                  </Badge>
                  <Badge tone={video.active ? 'success' : 'neutral'}>
                    {t(video.active ? 'instructor.videos.active' : 'instructor.videos.inactive')}
                  </Badge>
                </div>
              </div>
              <div className="ins-video-actions">
                <div className="ins-video-order">
                  <button
                    type="button"
                    className="ins-icon-btn"
                    aria-label={t('instructor.videos.moveUp')}
                    disabled={idx === 0}
                    onClick={() => move(idx, -1)}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    className="ins-icon-btn"
                    aria-label={t('instructor.videos.moveDown')}
                    disabled={idx === videos.length - 1}
                    onClick={() => move(idx, 1)}
                  >
                    <ArrowDown size={15} />
                  </button>
                </div>
                <Toggle checked={video.active} onChange={() => saveVideo({ ...video, active: !video.active })} label={t('instructor.videos.active')} />
                <button type="button" className="ins-icon-btn" aria-label={t('common.edit')} onClick={() => openEdit(video)}>
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  className="ins-icon-btn is-danger"
                  aria-label={t('common.delete')}
                  onClick={() => setDeleteTarget(video)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form ? (
        <Modal
          title={form.id ? t('instructor.videos.edit') : t('instructor.videos.add')}
          onClose={() => setForm(null)}
          maxWidth={560}
          footer={
            <>
              <button type="button" className="ins-btn ins-btn--secondary" onClick={() => setForm(null)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="ins-btn ins-btn--primary" onClick={submit}>
                {t('instructor.videos.save')}
              </button>
            </>
          }
        >
          <div className="ins-form-grid">
            <div className="ins-field">
              <label className="ins-field-label" htmlFor="video-title-en">{t('instructor.videos.nameEn')}</label>
              <input id="video-title-en" className="ins-input" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} />
            </div>
            <div className="ins-field">
              <label className="ins-field-label" htmlFor="video-title-zh">{t('instructor.videos.nameZh')}</label>
              <input id="video-title-zh" className="ins-input" value={form.titleZh} onChange={(e) => setForm({ ...form, titleZh: e.target.value })} />
            </div>
            <div className="ins-field ins-field--wide">
              <label className="ins-field-label" htmlFor="video-desc-en">{t('instructor.videos.descEn')}</label>
              <textarea id="video-desc-en" className="ins-input" rows={2} value={form.descEn} onChange={(e) => setForm({ ...form, descEn: e.target.value })} />
            </div>
            <div className="ins-field ins-field--wide">
              <label className="ins-field-label" htmlFor="video-desc-zh">{t('instructor.videos.descZh')}</label>
              <textarea id="video-desc-zh" className="ins-input" rows={2} value={form.descZh} onChange={(e) => setForm({ ...form, descZh: e.target.value })} />
            </div>

            <div className="ins-field ins-field--wide">
              <span className="ins-field-label">{t('instructor.videos.source')}</span>
              <div className="ins-radio-row">
                <label className="ins-radio">
                  <input
                    type="radio"
                    name="video-source"
                    checked={form.kind === 'youtube'}
                    onChange={() => setForm({ ...form, kind: 'youtube' })}
                  />
                  <span>{t('instructor.videos.youtube')}</span>
                </label>
                <label className="ins-radio">
                  <input
                    type="radio"
                    name="video-source"
                    checked={form.kind === 'local'}
                    onChange={() => setForm({ ...form, kind: 'local' })}
                  />
                  <span>{t('instructor.videos.local')}</span>
                </label>
              </div>
            </div>

            {form.kind === 'youtube' ? (
              <div className="ins-field ins-field--wide">
                <label className="ins-field-label" htmlFor="video-url">{t('instructor.videos.youtubeUrl')}</label>
                <input
                  id="video-url"
                  className="ins-input"
                  placeholder="https://www.youtube.com/watch?v=…"
                  value={form.youtubeUrl}
                  onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                />
                <p className="ins-field-hint">{t('instructor.videos.youtubeHint')}</p>
              </div>
            ) : (
              <div className="ins-field ins-field--wide">
                <span className="ins-field-label">{t('instructor.videos.local')}</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*"
                  className="visually-hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0])}
                />
                <div className="ins-video-file-row">
                  <button type="button" className="ins-btn ins-btn--secondary" onClick={() => fileRef.current?.click()}>
                    <Upload size={14} /> {t('instructor.videos.chooseFile')}
                  </button>
                  <span className="ins-video-file-name">
                    {form.localName ? t('instructor.videos.fileSelected', { name: form.localName }) : t('instructor.videos.fileEmpty')}
                  </span>
                </div>
                <p className="ins-field-hint">{t('instructor.videos.localHint')}</p>
                {form.localDataUrl ? (
                  <div className="ins-video-preview">
                    <video src={form.localDataUrl} controls muted style={{ maxHeight: 180 }} />
                  </div>
                ) : null}
              </div>
            )}

            <div className="ins-field ins-toggle-row">
              <span className="ins-field-label">{t('instructor.videos.active')}</span>
              <Toggle
                checked={form.active}
                onChange={() => setForm({ ...form, active: !form.active })}
                label={t('instructor.videos.active')}
              />
            </div>
          </div>
          {error ? <p className="ins-field-error">{error}</p> : null}
        </Modal>
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title={t('common.confirm.title')}
          body={t('instructor.videos.deleteConfirm')}
          confirmLabel={t('common.delete')}
          danger
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}

      {/* In-app preview player — click a thumbnail to play, no redirect */}
      <VideoPlayerModal video={preview} onClose={() => setPreview(null)} />
    </section>
  )
}
