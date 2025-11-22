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

function AppContent() {
  useMixIdSync()
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

