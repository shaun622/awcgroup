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
      <Route path="/login"  element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/quote/:token"  element={<PublicQuote />} />
      <Route path="/portal/:token" element={<Portal />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<BusinessGuard />}>
          <Route path="/onboarding" element={<Onboarding />} />

          <Route element={<AppShell />}>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/schedule"   element={<Schedule />} />
            <Route path="/clients"     element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
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
            <Route path="/settings"           element={<Settings />} />
            <Route path="/settings/business"  element={<BusinessSettings />} />
            <Route path="/settings/divisions" element={<DivisionsSettings />} />
            <Route path="/settings/products"  element={<ProductsLibrary />} />
            <Route path="/settings/staff"     element={<Staff />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
