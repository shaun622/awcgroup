import { Routes, Route } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import ProtectedRoute from './components/layout/ProtectedRoute'
import BusinessGuard from './components/layout/BusinessGuard'

import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Schedule from './pages/Schedule'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import PremisesDetail from './pages/PremisesDetail'
import FireDoorDetail from './pages/FireDoorDetail'
import FireDoorAssessment from './pages/FireDoorAssessment'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import NewJobReport from './pages/NewJobReport'
import Recurring from './pages/Recurring'
import Quotes from './pages/Quotes'
import QuoteBuilder from './pages/QuoteBuilder'
import PublicQuote from './pages/PublicQuote'
import Portal from './pages/Portal'
import Invoices from './pages/Invoices'
import InvoiceBuilder from './pages/InvoiceBuilder'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import BusinessSettings from './pages/settings/BusinessSettings'
import DivisionsSettings from './pages/settings/DivisionsSettings'
import ProductsLibrary from './pages/settings/ProductsLibrary'
import Staff from './pages/Staff'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/login"            element={<Login />} />
      <Route path="/signup"           element={<Signup />} />
      <Route path="/forgot-password"  element={<ForgotPassword />} />
      <Route path="/reset-password"   element={<ResetPassword />} />
      <Route path="/quote/:token"     element={<PublicQuote />} />
      <Route path="/portal/:token"    element={<Portal />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<BusinessGuard />}>
          <Route path="/onboarding" element={<Onboarding />} />

          <Route element={<AppShell />}>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/schedule"   element={<Schedule />} />
            <Route path="/clients"     element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/premises/:id" element={<PremisesDetail />} />
            <Route path="/premises/:premisesId/doors/:doorId" element={<FireDoorDetail />} />
            <Route path="/premises/:premisesId/doors/:doorId/assess/:assessmentId" element={<FireDoorAssessment />} />
            <Route path="/jobs"        element={<Jobs />} />
            <Route path="/jobs/:id"         element={<JobDetail />} />
            <Route path="/jobs/:id/report"  element={<NewJobReport />} />
            <Route path="/recurring"        element={<Recurring />} />
            <Route path="/quotes"        element={<Quotes />} />
            <Route path="/quotes/new"    element={<QuoteBuilder />} />
            <Route path="/quotes/:id"    element={<QuoteBuilder />} />
            <Route path="/invoices"       element={<Invoices />} />
            <Route path="/invoices/new"   element={<InvoiceBuilder />} />
            <Route path="/invoices/:id"   element={<InvoiceBuilder />} />
            <Route path="/analytics"  element={<Analytics />} />
            <Route path="/settings" element={<Settings />}>
              {/* /settings (index) renders the Organisation pane (BusinessSettings).
                  Sub-routes render the matching sub-page inside Settings' shell. */}
              <Route index             element={<BusinessSettings />} />
              <Route path="divisions"  element={<DivisionsSettings />} />
              <Route path="products"   element={<ProductsLibrary />} />
              <Route path="staff"      element={<Staff />} />
            </Route>
            {/* Legacy redirect: /settings/business → /settings (now the index) */}
            <Route path="/settings/business" element={<Settings />}>
              <Route index element={<BusinessSettings />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
