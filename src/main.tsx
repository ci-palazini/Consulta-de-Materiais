import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import './index.css'
import { App } from './App'
import { queryClient } from './lib/queryClient'
import { LoginPage } from './pages/auth/LoginPage'
import { LoadingFallback } from './components/layout/LoadingFallback'
import { AuthProvider } from './providers/AuthProvider'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <App />,
    errorElement: <div className="flex items-center justify-center min-h-screen">Erro ao carregar página</div>,
    children: [
      {
        index: true,
        lazy: () => import('./pages/dashboard/DashboardPage').then(m => ({ Component: m.DashboardPage })),
        HydrateFallback: LoadingFallback,
      },
      {
        path: 'dashboard',
        lazy: () => import('./pages/dashboard/DashboardPage').then(m => ({ Component: m.DashboardPage })),
        HydrateFallback: LoadingFallback,
      },
      {
        path: 'cms',
        lazy: () => import('./pages/cms/CMListPage').then(m => ({ Component: m.CMListPage })),
        HydrateFallback: LoadingFallback,
      },
      {
        path: 'cms/new',
        lazy: () => import('./pages/cms/CMNewPage').then(m => ({ Component: m.CMNewPage })),
        HydrateFallback: LoadingFallback,
      },
      {
        path: 'cms/:id',
        lazy: () => import('./pages/cms/CMDetailPage').then(m => ({ Component: m.CMDetailPage })),
        HydrateFallback: LoadingFallback,
      },
      {
        path: 'profile',
        lazy: () => import('./pages/profile/ProfilePage').then(m => ({ Component: m.ProfilePage })),
        HydrateFallback: LoadingFallback,
      },
      {
        path: 'admin',
        lazy: () => import('./pages/admin/AdminPage').then(m => ({ Component: m.AdminPage })),
        HydrateFallback: LoadingFallback,
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
