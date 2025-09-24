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
import TeamsPage from './modules/pages/TeamsPage.tsx'
import ManualPlacementPage from './modules/pages/ManualPlacementPage.tsx'
import ProtectedRoute from './modules/auth/ProtectedRoute.tsx'
import PublicSubmission from './modules/pages/PublicSubmission.tsx'

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
      { path: 'teams', element: <TeamsPage /> },
      { path: 'report', element: <ReportPage /> },
      { path: 'manual-placement', element: <ManualPlacementPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/s/:token', element: <PublicSubmission /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
