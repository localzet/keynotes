import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AppShell, NavLink, Group, Text, Button, Burger, Center, Loader } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconHome, IconNotes, IconKey, IconLock, IconSettings, IconLogout } from '@tabler/icons-react'
import { useVault } from './shared/hooks/useVault'
import { storage } from './shared/api/storage'
import { Suspense, useEffect } from 'react'

export function MainLayout() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure()
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true)
  const { isUnlocked, lock, loading } = useVault()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Check storage directly, not just React state (state might not be updated yet)
    const storageUnlocked = storage.isUnlocked()
    console.log('[MainLayout] useEffect: isUnlocked =', isUnlocked, 'storage.isUnlocked() =', storageUnlocked, 'pathname =', location.pathname, 'loading =', loading)
    
    // Only redirect if vault is locked and we're trying to access protected routes
    // Don't redirect if we're already on unlock or callback pages
    const isProtectedRoute = location.pathname !== '/unlock' && location.pathname !== '/mixid-callback'
    
    // Check both React state and storage - if storage says unlocked, don't redirect
    if (!storageUnlocked && !isUnlocked && isProtectedRoute && !loading) {
      console.log('[MainLayout] Redirecting to /unlock')
      navigate('/unlock', { replace: true })
    }
  }, [isUnlocked, location.pathname, navigate, loading])

  // Check storage directly as well, not just React state
  const storageUnlocked = storage.isUnlocked()
  console.log('[MainLayout] Render check: isUnlocked =', isUnlocked, 'storage.isUnlocked() =', storageUnlocked)
  
  // If not unlocked, don't render the layout (let UnlockPage handle it)
  // But show loader if we're loading
  // Also check storage directly - if storage says unlocked, render even if state hasn't updated
  if (!storageUnlocked && !isUnlocked) {
    if (loading) {
      return (
        <Center h="100vh">
          <Loader />
        </Center>
      )
    }
    return null
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
            <Burger opened={desktopOpened} onClick={toggleDesktop} visibleFrom="sm" size="sm" />
            <Text fw={700} size="lg">
              Keynotes
            </Text>
          </Group>
          <Button variant="subtle" leftSection={<IconLogout size={16} />} onClick={lock}>
            Заблокировать
          </Button>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          label="Главная"
          leftSection={<IconHome size={16} />}
          active={location.pathname === '/'}
          variant="subtle"
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer' }}
        />
        <NavLink
          label="Заметки"
          leftSection={<IconNotes size={16} />}
          active={location.pathname === '/notes'}
          variant="subtle"
          onClick={() => navigate('/notes')}
          style={{ cursor: 'pointer' }}
        />
        <NavLink
          label="Ключи"
          leftSection={<IconKey size={16} />}
          active={location.pathname === '/keys'}
          variant="subtle"
          onClick={() => navigate('/keys')}
          style={{ cursor: 'pointer' }}
        />
        <NavLink
          label="Пароли"
          leftSection={<IconLock size={16} />}
          active={location.pathname === '/passwords'}
          variant="subtle"
          onClick={() => navigate('/passwords')}
          style={{ cursor: 'pointer' }}
        />
        <NavLink
          label="Настройки"
          leftSection={<IconSettings size={16} />}
          active={location.pathname === '/settings'}
          variant="subtle"
          onClick={() => navigate('/settings')}
          style={{ cursor: 'pointer' }}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Suspense
          fallback={
            <Center h="100%">
              <Loader />
            </Center>
          }
        >
          <Outlet />
        </Suspense>
      </AppShell.Main>
    </AppShell>
  )
}

