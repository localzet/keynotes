import { createHashRouter, RouterProvider, useRouteError, useNavigate } from 'react-router-dom'
import { lazy } from 'react'
import { Container, Title, Text, Button } from '@mantine/core'

const UnlockPage = lazy(() => import('./pages/UnlockPage'))
const MainLayout = lazy(() => import('./layout').then(module => ({ default: module.MainLayout })))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const NotesPage = lazy(() => import('./pages/NotesPage'))
const KeysPage = lazy(() => import('./pages/KeysPage'))
const PasswordsPage = lazy(() => import('./pages/PasswordsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const MixIdCallbackPage = lazy(() => import('@localzet/data-connector/components').then(m => ({ default: m.MixIdCallbackPage })))

function ErrorPage() {
  const error = useRouteError() as Error
  const navigate = useNavigate()

  return (
    <Container size="sm" style={{ paddingTop: '2rem' }}>
      <Title order={1} mb="md">Unexpected Application Error!</Title>
      <Text size="lg" mb="lg" c="red">
        {error?.message || 'An unexpected error occurred'}
      </Text>
      <Button onClick={() => navigate('/')} variant="filled">
        Go to Home
      </Button>
    </Container>
  )
}

function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Container size="sm" style={{ paddingTop: '2rem' }}>
      <Title order={1} mb="md">404 Not Found</Title>
      <Text size="lg" mb="lg">
        The page you're looking for doesn't exist.
      </Text>
      <Button onClick={() => navigate('/')} variant="filled">
        Go to Home
      </Button>
    </Container>
  )
}

const router = createHashRouter([
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
    errorElement: <ErrorPage />,
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
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export function Router() {
  return <RouterProvider router={router} />
}

