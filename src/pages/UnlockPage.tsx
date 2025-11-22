import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Paper,
  PasswordInput,
  Button,
  Stack,
  Title,
  Text,
  Alert,
  Loader,
  Center,
} from '@mantine/core'
import { IconLock, IconShield } from '@tabler/icons-react'
import { useVault } from '../shared/hooks/useVault'

export default function UnlockPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isFirstTime, setIsFirstTime] = useState(false)
  const { unlock, isUnlocked, loading } = useVault()
  const navigate = useNavigate()

  useEffect(() => {
    const hasPassword = localStorage.getItem('keynotes-master-password-hash')
    setIsFirstTime(!hasPassword)
  }, [])

  const handleUnlock = async () => {
    console.log('[UnlockPage] handleUnlock() called')
    if (!password) {
      return
    }

    if (isFirstTime) {
      if (password !== confirmPassword) {
        return
      }
    }

    console.log('[UnlockPage] Calling unlock()...')
    const success = await unlock(password)
    console.log('[UnlockPage] unlock() returned:', success)
    if (success) {
      // Wait for state to update and ensure storage is unlocked
      console.log('[UnlockPage] Waiting for state update...')
      await new Promise(resolve => setTimeout(resolve, 100))
      // Double check that storage is actually unlocked
      const { storage } = await import('../shared/api/storage')
      const isActuallyUnlocked = storage.isUnlocked()
      console.log('[UnlockPage] Storage isUnlocked after wait:', isActuallyUnlocked)
      if (isActuallyUnlocked) {
        console.log('[UnlockPage] Navigating to /')
        navigate('/', { replace: true })
      } else {
        console.error('[UnlockPage] Storage is not unlocked after unlock()!')
      }
    } else {
      setPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <Center h="100vh" p="md">
      <Paper p="xl" maw={400} w="100%" withBorder>
        <Stack gap="md" align="center">
          <IconShield size={64} />
          <div style={{ textAlign: 'center' }}>
            <Title order={2} mb="xs">
              {isFirstTime ? 'Создание хранилища' : 'Разблокировка хранилища'}
            </Title>
            <Text c="dimmed" size="sm">
              {isFirstTime
                ? 'Создайте мастер-пароль для защиты ваших данных'
                : 'Введите мастер-пароль для доступа к хранилищу'}
            </Text>
          </div>

          {isFirstTime && (
            <Alert color="blue" title="Важно">
              <Text size="sm">
                Мастер-пароль не может быть восстановлен. Запомните его или сохраните в безопасном месте.
              </Text>
            </Alert>
          )}

          <Stack gap="md" w="100%">
            <PasswordInput
              label="Мастер-пароль"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUnlock()
                }
              }}
              disabled={loading}
              required
              autoFocus
            />

            {isFirstTime && (
              <PasswordInput
                label="Подтвердите пароль"
                placeholder="Повторите пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUnlock()
                  }
                }}
                disabled={loading}
                required
              />
            )}

            {isFirstTime && password && confirmPassword && password !== confirmPassword && (
              <Alert color="red" title="Ошибка">
                Пароли не совпадают
              </Alert>
            )}

            <Button
              onClick={handleUnlock}
              loading={loading}
              leftSection={<IconLock size={16} />}
              fullWidth
              disabled={!password || (isFirstTime && password !== confirmPassword)}
            >
              {isFirstTime ? 'Создать хранилище' : 'Разблокировать'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Center>
  )
}

