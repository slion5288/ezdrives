// ============================================================================
// EZDRIVES — Application router (shell-owned)
// Source of truth: docs/ARCHITECTURE.md §8 routing table. Role guards live
// inside each page component (they redirect via getSession()); this file only
// wires paths to the exact page components named in the contract. The pages
// are written by their owning agents — imported here and trusted as-is.
//
// HashRouter is used (instead of BrowserRouter) so the app also works when
// opened directly from disk via file:// (double-click on Preview.html) —
// hash-based routing needs no server. It works identically under `npm run dev`.
// ============================================================================

import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ToastProvider } from './components/shared'
import InstructorDashboardPage from './pages/instructor/InstructorDashboardPage'
import G1MockPage from './pages/g1/G1MockPage'
import LandingPage from './pages/landing/LandingPage'
import CoursesPage from './pages/landing/CoursesPage'
import LoginPage from './pages/auth/LoginPage'
import StudentBookingPage from './pages/student/StudentBookingPage'
import StudentDashboardPage from './pages/student/StudentDashboardPage'
import StudentNotificationsPage from './pages/student/StudentNotificationsPage'
import StudentProfilePage from './pages/student/StudentProfilePage'
import AdminPage from './pages/admin/AdminPage'

/** Reset scroll position on every route change. */
function ScrollToTop(): null {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App(): JSX.Element {
  return (
    <HashRouter>
      <ScrollToTop />
      <ToastProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/g1" element={<G1MockPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/student" element={<StudentDashboardPage />} />
          <Route path="/student/book" element={<StudentBookingPage />} />
          <Route path="/student/profile" element={<StudentProfilePage />} />
          <Route path="/student/notifications" element={<StudentNotificationsPage />} />
          <Route path="/instructor" element={<InstructorDashboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </HashRouter>
  )
}
