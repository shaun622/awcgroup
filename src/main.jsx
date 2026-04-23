import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { BusinessProvider } from './contexts/BusinessContext'
import { DivisionProvider } from './contexts/DivisionContext'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <BusinessProvider>
            <DivisionProvider>
              <App />
              <Toaster
                position="top-center"
                theme="system"
                richColors={false}
                closeButton
                toastOptions={{
                  classNames: {
                    toast: 'rounded-2xl border border-gray-200 dark:border-gray-800 shadow-soft-lift',
                    title: 'font-semibold',
                    description: 'text-gray-500 dark:text-gray-400',
                  },
                }}
              />
            </DivisionProvider>
          </BusinessProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
