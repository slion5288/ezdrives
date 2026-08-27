// ============================================================================
// EZDRIVES — Public "Teaching videos" page (/videos)
// Reached from the homepage video section ("View all videos") and the shared
// sub-page menu. Lists every teaching video the instructor uploaded (YouTube
// or local), playing in the in-app player. Visitors get real data only.
// ============================================================================

import { useEffect, useState } from 'react'
import { ArrowLeft, Play } from 'lucide-react'
import { useLocale, useT } from '../../i18n'
import { getSession, initPublicHome, isPublicReady, useAppState } from '../../data/store'
import type { TeachingVideo } from '../../data/store'
import { LandingButton } from './primitives'
import LandingSubHeader from './LandingSubHeader'
import { VideoPlayerModal } from '../../components/video/VideoPlayerModal'
import './LandingPage.css'

export default function VideosPage(): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const state = useAppState()
  const [playingVideo, setPlayingVideo] = useState<TeachingVideo | null>(null)

  // Visitors load the real public catalogue (never the seed placeholder).
  useEffect(() => {
    if (!getSession().token) initPublicHome().catch(() => undefined)
  }, [])

  const videos = isPublicReady()
    ? state.videos.filter((v) => v.active).sort((a, b) => a.order - b.order || a.addedAt.localeCompare(b.addedAt))
    : []

  const pick = (pair: { en: string; zh: string }): string => (locale === 'zh' ? pair.zh : pair.en)

  return (
    <div className="landing-page landing-page--sub">
      <LandingSubHeader />

      <main>
        <section className="landing-section">
          <div className="container">
            <div className="landing-sub-head">
              <LandingButton variant="ghost" to="/" className="landing-sub-back">
                <ArrowLeft size={16} /> {t('nav.home')}
              </LandingButton>
              <h1 className="landing-sub-title">{t('landing.videos.title')}</h1>
              <p className="landing-sub-sub">{t('landing.videos.subtitle')}</p>
            </div>

            <div className="landing-panel">
              {videos.length === 0 ? (
                <p className="landing-section__empty">{t('landing.videos.empty')}</p>
              ) : (
                <div className="landing-videos">
                  {videos.map((video) => (
                    <figure className="landing-videos__card" key={video.id}>
                      <button
                        type="button"
                        className="landing-videos__media"
                        onClick={() => setPlayingVideo(video)}
                        aria-label={t('landing.videos.play', {
                          title: pick(video.title),
                        })}
                      >
                        {video.kind === 'youtube' ? (
                          <img
                            className="landing-videos__thumb"
                            src={`https://i.ytimg.com/vi/${video.src}/hqdefault.jpg`}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <video className="landing-videos__thumb" src={video.src} muted preload="metadata" />
                        )}
                        <span className="landing-videos__overlay" aria-hidden="true">
                          <Play size={22} fill="currentColor" />
                        </span>
                      </button>
                      <figcaption className="landing-videos__caption">
                        <span className="landing-videos__text">
                          <span className="landing-videos__title">{pick(video.title)}</span>
                          {video.description && (video.description.en || video.description.zh) ? (
                            <span className="landing-videos__desc">
                              {locale === 'zh' && video.description.zh
                                ? video.description.zh
                                : locale === 'en' && video.description.en
                                  ? video.description.en
                                  : video.description.en || video.description.zh}
                            </span>
                          ) : null}
                        </span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="container">
          <div className="landing-footer__bottom">
            <span>{t('landing.footer.rights')}</span>
          </div>
        </div>
      </footer>

      <VideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} />
    </div>
  )
}
