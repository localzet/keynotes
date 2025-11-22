import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { lazy } from 'react'

const UnlockPage = lazy(() => import('./pages/UnlockPage'))
const MainLayout = lazy(() => import('./layout').then(module => ({ default: module.MainLayout })))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const NotesPage = lazy(() => import('./pages/NotesPage'))
const KeysPage = lazy(() => import('./pages/KeysPage'))
const PasswordsPage = lazy(() => import('./pages/PasswordsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const MixIdCallbackPage = lazy(() => import('./pages/MixIdCallbackPage'))

const router = createBrowserRouter([
  {
    path: '/unlock',
    element: <UnlockPage />,
  },
  {
    path: '/mixid-callback',
    element: <MixIdCallbackPage />,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'notes',
        element: <NotesPage />,
      },
      {
        path: 'keys',
        element: <KeysPage />,
      },
      {
        path: 'passwords',
        element: <PasswordsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
])

export function Router() {
  return <RouterProvider router={router} />
}

