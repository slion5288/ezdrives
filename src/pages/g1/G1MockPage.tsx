// ============================================================================
// EZDRIVES — G1 Mock Test page (public, no login required)
// Two question banks scraped from ccdriving.ca: Chinese (205) and English
// (188), images inlined as base64. Practice flow: pick a bank → answer 4
// options one by one with instant correct/wrong feedback → score screen
// (G1 pass threshold note: 80% per section).
// ============================================================================

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Check, ChevronLeft, ChevronRight, GraduationCap, RotateCcw, X } from 'lucide-react'
import { G1_BANK_EN, G1_BANK_ZH, G1_IMAGES } from '../../data/g1'
import type { G1Question } from '../../data/g1'
import { useT } from '../../i18n'
import { LanguageSwitcher } from '../../components/shared/LanguageSwitcher'
import { ThemeToggle } from '../../components/shared/ThemeToggle'
import { Logo } from '../../components/shared/Logo'
import './g1.css'

type BankId = 'zh' | 'en'
type Screen = 'intro' | 'quiz' | 'result'

const LETTERS = ['A', 'B', 'C', 'D']

export default function G1MockPage(): JSX.Element {
  const t = useT()
  const [bank, setBank] = useState<BankId>('zh')
  const [screen, setScreen] = useState<Screen>('intro')
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [correctCount, setCorrectCount] = useState(0)
  // Randomized question order per run (shuffled once when the bank starts).
  const [order, setOrder] = useState<number[]>([])

  const questions = useMemo(() => (bank === 'zh' ? G1_BANK_ZH : G1_BANK_EN), [bank])
  const total = questions.length
  /** Current question after applying the shuffled order. */
  const q: G1Question | undefined = order.length > 0 ? questions[order[idx]] : questions[idx]
  const answered = picked !== null

  const start = (b: BankId): void => {
    setBank(b)
    // Fisher–Yates shuffle so every practice run is a fresh order.
    const arr = Array.from({ length: (b === 'zh' ? G1_BANK_ZH : G1_BANK_EN).length }, (_, i) => i)
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    setOrder(arr)
    setIdx(0)
    setPicked(null)
    setAnswers([])
    setCorrectCount(0)
    setScreen('quiz')
  }

  const pick = (optIdx: number): void => {
    if (answered || !q) return
    setPicked(optIdx)
    setAnswers((prev) => [...prev, optIdx])
    if (optIdx === q.answer) setCorrectCount((n) => n + 1)
  }

  const next = (): void => {
    if (!answered) return
    if (idx >= total - 1) {
      setScreen('result')
    } else {
      setIdx((i) => i + 1)
      setPicked(null)
    }
  }

  const accuracy = total === 0 ? 0 : Math.round((correctCount / total) * 100)
  const passed = accuracy >= 80
  const mistakes = questions
    .map((question, i) => ({ question, index: i, picked: answers[i] }))
    .filter((m) => m.picked !== undefined && m.picked !== m.question.answer)

  const bankName = bank === 'zh' ? t('g1.zh') : t('g1.en')

  return (
    <div className="g1-page">
      {/* ---- Sticky top bar ---- */}
      <header className="g1-header">
        <div className="g1-header__inner">
          <Link to="/" className="g1-header__home" aria-label={t('g1.back')}>
            <Logo size="sm" />
          </Link>
          <div className="g1-header__actions">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="g1-main container" id="g1-title">
        {screen === 'intro' ? (
          <div className="g1-intro">
            <div className="g1-intro__hero">
              <span className="g1-intro__icon">
                <GraduationCap size={30} />
              </span>
              <h1 className="g1-intro__title">{t('g1.title')}</h1>
              <p className="g1-intro__sub">{t('g1.subtitle')}</p>
            </div>

            <div className="g1-banks">
              <button type="button" className="g1-bank g1-bank--zh" onClick={() => start('zh')}>
                <span className="g1-bank__name">{t('g1.zh')}</span>
                <span className="g1-bank__desc">{t('g1.zhBody', { count: G1_BANK_ZH.length })}</span>
                <span className="g1-bank__cta">
                  {t('g1.start')} <ChevronRight size={16} />
                </span>
              </button>
              <button type="button" className="g1-bank g1-bank--en" onClick={() => start('en')}>
                <span className="g1-bank__name">{t('g1.en')}</span>
                <span className="g1-bank__desc">{t('g1.enBody', { count: G1_BANK_EN.length })}</span>
                <span className="g1-bank__cta">
                  {t('g1.start')} <ChevronRight size={16} />
                </span>
              </button>
            </div>

            <p className="g1-intro__note">{t('g1.passNote')}</p>
          </div>
        ) : null}

        {screen === 'quiz' && q ? (
          <div className="g1-quiz">
            <div className="g1-quiz__top">
              <span className="g1-quiz__bank">
                <BookOpen size={14} /> {bankName}
              </span>
              <span className="g1-quiz__progress tabular-nums">
                {t('g1.progress', { current: idx + 1, total })}
              </span>
            </div>
            <div className="g1-quiz__bar" role="progressbar" aria-valuenow={idx + 1} aria-valuemin={1} aria-valuemax={total}>
              <div className="g1-quiz__bar-fill" style={{ width: `${((idx + 1) / total) * 100}%` }} />
            </div>

            <div className="g1-card g1-question">
              {q.img ? (
                <div className="g1-question__imgwrap">
                  <img className="g1-question__img" src={G1_IMAGES[q.img]} alt="" loading="lazy" />
                </div>
              ) : null}
              {q.question ? <h2 className="g1-question__text">{q.question}</h2> : null}

              <div className="g1-options">
                {q.options.map((opt, i) => {
                  const isCorrect = i === q.answer
                  const isPicked = i === picked
                  let cls = 'g1-option'
                  if (answered) {
                    if (isCorrect) cls += ' g1-option--correct'
                    else if (isPicked) cls += ' g1-option--wrong'
                    else cls += ' g1-option--dim'
                  }
                  return (
                    <button key={i} type="button" className={cls} onClick={() => pick(i)} disabled={answered}>
                      <span className="g1-option__letter">{LETTERS[i]}</span>
                      <span className="g1-option__text">{opt}</span>
                      {answered && isCorrect ? <Check size={18} className="g1-option__icon" /> : null}
                      {answered && isPicked && !isCorrect ? <X size={18} className="g1-option__icon" /> : null}
                    </button>
                  )
                })}
              </div>

              {answered ? (
                <div className={`g1-feedback${picked === q.answer ? ' g1-feedback--ok' : ' g1-feedback--no'}`} role="status">
                  {picked === q.answer ? (
                    <>
                      <Check size={18} />
                      <span>{t('g1.youCorrect')}</span>
                    </>
                  ) : (
                    <>
                      <X size={18} />
                      <span>{t('g1.youWrong')}</span>
                    </>
                  )}
                </div>
              ) : null}
            </div>

            <div className="g1-quiz__foot">
              <button
                type="button"
                className="g1-btn g1-btn--primary"
                onClick={next}
                disabled={!answered}
              >
                {idx >= total - 1 ? t('g1.result') : t('g1.next')}
                <ChevronRight size={16} />
              </button>
              <button type="button" className="g1-btn g1-btn--ghost" onClick={() => setScreen('intro')}>
                <RotateCcw size={14} /> {t('g1.switch')}
              </button>
            </div>
          </div>
        ) : null}

        {screen === 'result' ? (
          <div className="g1-card g1-result">
            <div className={`g1-result__ring${passed ? ' g1-result__ring--pass' : ' g1-result__ring--fail'}`}>
              <span className="g1-result__pct tabular-nums">{accuracy}%</span>
              <span className="g1-result__label">{t('g1.accuracy')}</span>
            </div>
            <h2 className="g1-result__title">{passed ? t('g1.pass') : t('g1.fail')}</h2>
            <p className="g1-result__sub">{bankName} · {t('g1.score')}</p>
            <div className="g1-result__stats">
              <span className="g1-result__stat g1-result__stat--ok">
                <Check size={15} /> {t('g1.correctCount', { count: correctCount })}
              </span>
              <span className="g1-result__stat g1-result__stat--no">
                <X size={15} /> {t('g1.incorrectCount', { count: total - correctCount })}
              </span>
              <span className="g1-result__stat">
                {t('g1.total', { count: total })}
              </span>
            </div>
            <p className="g1-result__note">{t('g1.passNote')}</p>

            <div className="g1-review">
              <h3 className="g1-review__title">
                {t('g1.reviewTitle')} ({mistakes.length})
              </h3>
              {mistakes.length === 0 ? (
                <p className="g1-review__empty">{t('g1.noMistakes')}</p>
              ) : (
                <ul className="g1-review__list">
                  {mistakes.map((m) => (
                    <li key={m.question.id} className="g1-review__item">
                      {m.question.img ? (
                        <img className="g1-review__img" src={G1_IMAGES[m.question.img]} alt="" loading="lazy" />
                      ) : null}
                      <p className="g1-review__q">{m.question.question || `#${m.index + 1}`}</p>
                      <p className="g1-review__line g1-review__line--wrong">
                        {t('g1.yourAnswer')}: {LETTERS[m.picked!]} · {m.question.options[m.picked!]}
                      </p>
                      <p className="g1-review__line g1-review__line--right">
                        {t('g1.correctAnswer')}: {LETTERS[m.question.answer]} · {m.question.options[m.question.answer]}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="g1-result__actions">
              <button type="button" className="g1-btn g1-btn--primary" onClick={() => start(bank)}>
                <RotateCcw size={15} /> {t('g1.restart')}
              </button>
              <button type="button" className="g1-btn g1-btn--secondary" onClick={() => setScreen('intro')}>
                {t('g1.switch')}
              </button>
              <Link to="/" className="g1-btn g1-btn--ghost">
                <ChevronLeft size={15} /> {t('g1.back')}
              </Link>
            </div>
          </div>
        ) : null}
      </main>

      {/* Always-available back-to-home link (bottom-left) */}
      <Link to="/" className="g1-back-home">
        <ChevronLeft size={16} /> {t('g1.back')}
      </Link>
    </div>
  )
}
