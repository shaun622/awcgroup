import { Routes, Route } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import ProtectedRoute from './components/layout/ProtectedRoute'
import BusinessGuard from './components/layout/BusinessGuard'

import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Schedule from './pages/Schedule'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import Quotes from './pages/Quotes'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/login"  element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<BusinessGuard />}>
          <Route path="/onboarding" element={<Onboarding />} />

          <Route element={<AppShell />}>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/schedule"   element={<Schedule />} />
            <Route path="/clients"     element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/jobs"        element={<Jobs />} />
            <Route path="/jobs/:id"    element={<JobDetail />} />
            <Route path="/quotes"     element={<Quotes />} />
            <Route path="/analytics"  element={<Analytics />} />
            <Route path="/settings/*" element={<Settings />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
