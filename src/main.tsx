import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './modules/auth/AuthContext.tsx'
import LoginPage from './modules/auth/LoginPage.tsx'
import JudgesPage from './modules/pages/JudgesPage.tsx'
import StagesPage from './modules/pages/StagesPage.tsx'
import DistributionPage from './modules/pages/DistributionPage.tsx'
import ReportPage from './modules/pages/ReportPage.tsx'
import ProtectedRoute from './modules/auth/ProtectedRoute.tsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <JudgesPage /> },
      { path: 'judges', element: <JudgesPage /> },
      { path: 'stages', element: <StagesPage /> },
      { path: 'distribution', element: <DistributionPage /> },
      { path: 'report', element: <ReportPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
