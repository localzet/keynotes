import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/nprogress/styles.css'

import './global.css'

import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import { NavigationProgress } from '@mantine/nprogress'
import { theme } from './theme'
import { Router } from './router'
import { useMixIdSync } from './shared/hooks/useMixIdSync'
import { useMixIdSession } from '@localzet/data-connector/hooks'
import { notifications } from '@mantine/notifications'

function AppContent() {
  useMixIdSync()
  
  // Session management with mutual deletion
  useMixIdSession({
    onSessionDeleted: () => {
      notifications.show({
        title: 'Сессия удалена',
        message: 'Ваша сессия была удалена в личном кабинете. Приложение отключено.',
        color: 'red',
      })
    },
    onSessionExpired: () => {
      notifications.show({
        title: 'Сессия истекла',
        message: 'Ваша сессия истекла. Пожалуйста, войдите снова.',
        color: 'orange',
      })
    },
  })
  return <Router />
}

function App() {
  return (
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <ModalsProvider>
        <Notifications position="top-right" />
        <NavigationProgress />
        <AppContent />
      </ModalsProvider>
    </MantineProvider>
  )
}

export default App

