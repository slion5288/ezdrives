// ============================================================================
// EZDRIVES — LegalPage (public: /legal/privacy | /legal/terms | /legal/cancellation)
// Simple bilingual legal documents rendered with the public sub-page header
// and footer. Chinese is the authored original; English comes from the site's
// own translation chain (see src/pages/legal/content.ts).
// ============================================================================

import { ArrowLeft } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useLocale, useT } from '../../i18n'
import { Link } from 'react-router-dom'
import { LEGAL_DOCS } from './content'
import LandingSubHeader from '../landing/LandingSubHeader'
import { Button } from '../../components/shared/Button'
import '../landing/LandingPage.css'
import './legal.css'

export default function LegalPage(): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const { doc } = useParams<{ doc: string }>()
  const found = LEGAL_DOCS.find((d) => d.key === doc)
  const document = found ?? LEGAL_DOCS[0]

  return (
    <div className="landing-page landing-page--sub">
      <LandingSubHeader />
      <main>
        <section className="landing-section">
          <div className="container container--narrow">
            <div className="landing-sub-head">
              <Button variant="ghost" to="/" className="landing-sub-back">
                <ArrowLeft size={16} /> {t('nav.home')}
              </Button>
              <h1 className="landing-sub-title">{document.title[locale]}</h1>
            </div>
            <article className="legal-doc">
              <p className="legal-doc__intro">{document.intro[locale]}</p>
              {document.sections.map((s) => (
                <section key={s.title.zh} className="legal-doc__section">
                  <h2>{s.title[locale]}</h2>
                  <p>{s.body[locale]}</p>
                </section>
              ))}
              <p className="legal-doc__updated">
                {t('legal.updated')} · © {new Date().getFullYear()} EZDRIVES
              </p>
            </article>
            <p className="legal-doc__back">
              <Link to="/">{t('nav.home')}</Link>
              {' · '}
              <Link to="/courses">{t('landing.courses.title')}</Link>
              {' · '}
              <Link to="/login">{t('nav.studentLogin')}</Link>
            </p>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <div className="container">
          <div className="landing-footer__bottom">
            <span>{t('landing.footer.rights')}</span>
            <span className="landing-footer__legal">
              <Link to="/legal/privacy">{t('legal.privacy')}</Link>
              <span aria-hidden="true">·</span>
              <Link to="/legal/terms">{t('legal.terms')}</Link>
              <span aria-hidden="true">·</span>
              <Link to="/legal/cancellation">{t('legal.cancellation')}</Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
