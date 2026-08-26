// ============================================================================
// EZDRIVES — Instructor SettingsPage (设置, instructor-owned)
// One place for everything the instructor configures: vehicles, teaching
// videos, payment methods (which ones students may use) and receive settings
// (WeChat QR / e-Transfer / bank / API credentials).
// ============================================================================

import type { AppState } from '../../data/store'
import { useT } from '../../i18n'
import { Car } from 'lucide-react'
import WorkingHoursPage from './WorkingHoursPage'
import VehiclesPage from './VehiclesPage'
import VideoManager from './VideoManager'
import PaymentMethodsManager from './PaymentMethodsManager'
import ReceiveSettings from './ReceiveSettings'

export default function SettingsPage({ state }: { state: AppState }): JSX.Element {
  const t = useT()

  return (
    <div className="ins-settings-page">
      {/* 0. Working hours — weekly rules + exceptions + break */}
      <WorkingHoursPage state={state} />

      {/* 1. Vehicles */}
      <section className="ins-panel ins-settings">
        <div className="ins-panel-head">
          <h2 className="ins-panel-title">
            <Car size={16} /> {t('instructor.settings.vehicles')}
          </h2>
        </div>
        <VehiclesPage state={state} />
      </section>

      {/* 2. Teaching videos — own panel with heading + add button */}
      <VideoManager state={state} />

      {/* 3. Payment methods — what students see when paying */}
      <PaymentMethodsManager />

      {/* 4. Receive settings — where the money actually goes */}
      <div className="ins-settings-receive-head">
        <span className="ins-settings-receive-title">{t('instructor.settings.receive')}</span>
      </div>
      <ReceiveSettings />
    </div>
  )
}
