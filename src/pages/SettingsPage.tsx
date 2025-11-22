import { useState } from 'react'
import {
  Paper,
  Title,
  Text,
  Stack,
  Switch,
  NumberInput,
  Button,
  Group,
  Divider,
  Modal,
  PasswordInput,
  Alert,
  FileButton,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconPlug, IconSettings, IconLogout, IconDownload, IconUpload } from '@tabler/icons-react'
import { useVault } from '../shared/hooks/useVault'
import { mixIdApi } from '../shared/api/mixIdApi'
import { storage } from '../shared/api/storage'
import MixIdConnection from '../components/MixIdConnection'

export default function SettingsPage() {
  const { settings, updateSettings, changePassword } = useVault()
  const [changePasswordModalOpened, { open: openChangePassword, close: closeChangePassword }] = useDisclosure(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      notifications.show({
        title: 'Ошибка',
        message: 'Пароли не совпадают',
        color: 'red',
      })
      return
    }

    if (newPassword.length < 8) {
      notifications.show({
        title: 'Ошибка',
        message: 'Пароль должен содержать минимум 8 символов',
        color: 'red',
      })
      return
    }

    setChangingPassword(true)
    const success = await changePassword(oldPassword, newPassword)
    setChangingPassword(false)

    if (success) {
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      closeChangePassword()
    }
  }

  const handleExport = async () => {
    try {
      const vaultData = await storage.exportVault()
      const blob = new Blob([vaultData], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `keynotes-backup-${new Date().toISOString().split('T')[0]}.encrypted`
      a.click()
      URL.revokeObjectURL(url)
      notifications.show({
        title: 'Успешно',
        message: 'Резервная копия экспортирована',
        color: 'green',
      })
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: error instanceof Error ? error.message : 'Не удалось экспортировать хранилище',
        color: 'red',
      })
    }
  }

  const handleImport = async (file: File | null) => {
    if (!file) return

    try {
      const text = await file.text()
      // For import, user will need to unlock with the password used to encrypt
      notifications.show({
        title: 'Импорт',
        message: 'Для импорта необходимо разблокировать хранилище с паролем, использованным при экспорте',
        color: 'blue',
      })
      // In a real implementation, you'd need to handle import with password verification
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: error instanceof Error ? error.message : 'Не удалось импортировать хранилище',
        color: 'red',
      })
    }
  }

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Настройки</Title>
        <Text c="dimmed">Управление настройками приложения</Text>
      </div>

      <MixIdConnection />

      <Paper p="xl" withBorder>
        <Stack gap="md">
          <Title order={4}>Безопасность</Title>

          <Switch
            label="Автоматическая блокировка"
            description="Автоматически блокировать хранилище после периода бездействия"
            checked={settings.autoLock}
            onChange={(e) => updateSettings({ autoLock: e.currentTarget.checked })}
          />

          {settings.autoLock && (
            <NumberInput
              label="Таймаут блокировки (минуты)"
              description="Время бездействия до автоматической блокировки"
              min={1}
              max={1440}
              value={settings.lockTimeout}
              onChange={(value) => updateSettings({ lockTimeout: Number(value) || 15 })}
            />
          )}

          <Divider />

          <Group>
            <Button variant="light" onClick={openChangePassword}>
              Изменить мастер-пароль
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper p="xl" withBorder>
        <Stack gap="md">
          <Title order={4}>Резервное копирование</Title>

          <Group>
            <Button leftSection={<IconDownload size={16} />} onClick={handleExport}>
              Экспортировать хранилище
            </Button>
            <FileButton onChange={handleImport} accept=".encrypted,text/plain">
              {(props) => (
                <Button {...props} leftSection={<IconUpload size={16} />} variant="light">
                  Импортировать хранилище
                </Button>
              )}
            </FileButton>
          </Group>

          <Alert color="blue">
            <Text size="sm">
              Экспортированное хранилище зашифровано. Для импорта потребуется мастер-пароль, использованный при экспорте.
            </Text>
          </Alert>
        </Stack>
      </Paper>

      <Modal opened={changePasswordModalOpened} onClose={closeChangePassword} title="Изменить мастер-пароль">
        <Stack gap="md">
          <Alert color="yellow">
            <Text size="sm">
              При изменении пароля все данные будут перешифрованы. Убедитесь, что вы запомнили новый пароль.
            </Text>
          </Alert>

          <PasswordInput
            label="Текущий пароль"
            placeholder="Введите текущий пароль"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.currentTarget.value)}
            required
          />

          <PasswordInput
            label="Новый пароль"
            placeholder="Введите новый пароль"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
            required
          />

          <PasswordInput
            label="Подтвердите новый пароль"
            placeholder="Повторите новый пароль"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.currentTarget.value)}
            required
          />

          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <Alert color="red">
              Пароли не совпадают
            </Alert>
          )}

          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeChangePassword}>
              Отмена
            </Button>
            <Button
              onClick={handleChangePassword}
              loading={changingPassword}
              disabled={!oldPassword || !newPassword || newPassword !== confirmPassword}
            >
              Изменить пароль
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}

