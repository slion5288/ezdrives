// ============================================================================
// EZDRIVES — VideoPlayerModal (shared, shell-owned)
// Plays a TeachingVideo in a modal INSIDE the app window — no redirect to
// YouTube. YouTube videos embed via /embed/{id} (autoplay on), local uploads
// play with the native <video> controls.
//
// YouTube allows some uploaders to disable embedding (error 150/153). Before
// showing the player we probe the video with the oEmbed endpoint: allowed →
// in-app embed; blocked → a clear fallback card with an "Open on YouTube"
// button instead of a dead error frame. Escape / scrim click closes.
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import type { TeachingVideo } from '../../data/store'
import { useT } from '../../i18n'
import { ExternalLink, Loader2, X } from 'lucide-react'
import './video.css'

interface VideoPlayerModalProps {
  /** null = closed. */
  video: TeachingVideo | null
  onClose: () => void
}

type EmbedStatus = 'checking' | 'embeddable' | 'blocked'

/** oEmbed preflight: 401 means the uploader disabled embedding. Network errors fall back to "try the embed". */
function useEmbedStatus(video: TeachingVideo | null): EmbedStatus {
  const [status, setStatus] = useState<EmbedStatus>('checking')
  useEffect(() => {
    if (!video || video.kind !== 'youtube') {
      setStatus('embeddable')
      return
    }
    let cancelled = false
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 4000)
    setStatus('checking')
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(video.src)}`
    fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (cancelled) return
        setStatus(res.status === 401 ? 'blocked' : 'embeddable')
      })
      .catch(() => {
        if (!cancelled) setStatus('embeddable') // offline / file:// — let YouTube decide
      })
      .finally(() => window.clearTimeout(timer))
    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [video])
  return status
}

export function VideoPlayerModal({ video, onClose }: VideoPlayerModalProps): JSX.Element | null {
  const t = useT()
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  useEffect(() => {
    if (!video) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [video])

  const embedStatus = useEmbedStatus(video)

  if (!video) return null
  const title = video.title.en || video.title.zh

  return (
    <div className="vid-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={onClose}>
      <div className="vid-modal__card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="vid-modal__head">
          <span className="vid-modal__title">{title}</span>
          <button type="button" className="vid-modal__close" onClick={onClose} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>
        <div className="vid-modal__frame">
          {video.kind === 'youtube' && embedStatus === 'blocked' ? (
            <div className="vid-blocked">
              <span className="vid-blocked__icon" aria-hidden="true">
                <ExternalLink size={22} />
              </span>
              <p className="vid-blocked__title">{t('video.embedBlocked')}</p>
              <p className="vid-blocked__body">{t('video.embedBlockedBody')}</p>
              <a
                className="vid-blocked__btn"
                href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.src)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('video.openYoutube')}
                <ExternalLink size={15} />
              </a>
            </div>
          ) : video.kind === 'youtube' ? (
            <>
              {embedStatus === 'checking' ? (
                <div className="vid-loading" aria-hidden="true">
                  <Loader2 size={26} className="vid-loading__spin" />
                  <span>{t('video.loading')}</span>
                </div>
              ) : null}
              <iframe
                src={`https://www.youtube.com/embed/${video.src}?autoplay=1&rel=0&playsinline=1`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </>
          ) : (
            <video src={video.src} controls autoPlay playsInline />
          )}
        </div>
      </div>
    </div>
  )
}
