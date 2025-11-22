import { useState, useMemo } from 'react'
import {
  Paper,
  Title,
  Text,
  Stack,
  Button,
  Group,
  TextInput,
  Card,
  Badge,
  ActionIcon,
  Menu,
  Anchor,
} from '@mantine/core'
import { IconPlus, IconSearch, IconEdit, IconTrash, IconCopy, IconDots, IconEye, IconEyeOff, IconExternalLink } from '@tabler/icons-react'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useVault } from '../shared/hooks/useVault'
import { PasswordEntry } from '../shared/types'
import EntryForm from '../components/EntryForm'
import dayjs from 'dayjs'

export default function PasswordsPage() {
  const { entries, saveEntry, deleteEntry } = useVault()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<PasswordEntry | null>(null)
  const [formOpened, { open: openForm, close: closeForm }] = useDisclosure(false)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())

  const passwords = useMemo(() => {
    return entries.filter((e): e is PasswordEntry => e.type === 'password')
  }, [entries])

  const filteredPasswords = useMemo(() => {
    if (!searchQuery) return passwords
    const query = searchQuery.toLowerCase()
    return passwords.filter(
      pwd =>
        pwd.title.toLowerCase().includes(query) ||
        (pwd.username && pwd.username.toLowerCase().includes(query)) ||
        (pwd.url && pwd.url.toLowerCase().includes(query)) ||
        pwd.tags.some(tag => tag.toLowerCase().includes(query)) ||
        (pwd.category && pwd.category.toLowerCase().includes(query))
    )
  }, [passwords, searchQuery])

  const handleNew = () => {
    setSelectedEntry(null)
    openForm()
  }

  const handleEdit = (entry: PasswordEntry) => {
    setSelectedEntry(entry)
    openForm()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот пароль?')) return
    await deleteEntry(id)
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    notifications.show({
      title: 'Скопировано',
      message: `${label} скопирован в буфер обмена`,
      color: 'green',
    })
  }

  const toggleVisibility = (id: string) => {
    const newSet = new Set(visiblePasswords)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setVisiblePasswords(newSet)
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={2}>Пароли</Title>
          <Text c="dimmed">Управление паролями и учетными записями</Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={handleNew}>
          Новый пароль
        </Button>
      </Group>

      <TextInput
        placeholder="Поиск паролей..."
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
      />

      {filteredPasswords.length === 0 ? (
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <Text c="dimmed">
              {searchQuery ? 'Пароли не найдены' : 'Нет паролей. Добавьте первый пароль!'}
            </Text>
          </Stack>
        </Paper>
      ) : (
        <Stack gap="md">
          {filteredPasswords.map((pwd) => (
            <Card key={pwd.id} withBorder p="md">
              <Group justify="space-between" align="flex-start" mb="md">
                <div style={{ flex: 1 }}>
                  <Group gap="xs" mb="xs">
                    <Text fw={500}>{pwd.title}</Text>
                    {pwd.category && (
                      <Badge size="sm" variant="outline">
                        {pwd.category}
                      </Badge>
                    )}
                  </Group>
                  {pwd.tags.length > 0 && (
                    <Group gap="xs" mb="xs">
                      {pwd.tags.map((tag) => (
                        <Badge key={tag} size="xs" variant="dot">
                          {tag}
                        </Badge>
                      ))}
                    </Group>
                  )}
                  {pwd.username && (
                    <Text size="sm" c="dimmed" mb="xs">
                      {pwd.username}
                    </Text>
                  )}
                  {pwd.url && (
                    <Anchor href={pwd.url} target="_blank" size="sm" c="blue">
                      {pwd.url} <IconExternalLink size={12} style={{ display: 'inline' }} />
                    </Anchor>
                  )}
                  <Text size="xs" c="dimmed" mt="xs">
                    {dayjs(pwd.updatedAt).format('DD.MM.YYYY HH:mm')}
                  </Text>
                </div>
                <Menu>
                  <Menu.Target>
                    <ActionIcon variant="subtle">
                      <IconDots size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => handleEdit(pwd)}>
                      Редактировать
                    </Menu.Item>
                    <Menu.Item
                      leftSection={visiblePasswords.has(pwd.id) ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                      onClick={() => toggleVisibility(pwd.id)}
                    >
                      {visiblePasswords.has(pwd.id) ? 'Скрыть пароль' : 'Показать пароль'}
                    </Menu.Item>
                    {pwd.username && (
                      <Menu.Item
                        leftSection={<IconCopy size={16} />}
                        onClick={() => handleCopy(pwd.username!, 'Имя пользователя')}
                      >
                        Копировать имя пользователя
                      </Menu.Item>
                    )}
                    <Menu.Item
                      leftSection={<IconCopy size={16} />}
                      onClick={() => handleCopy(pwd.password, 'Пароль')}
                    >
                      Копировать пароль
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconTrash size={16} />}
                      color="red"
                      onClick={() => handleDelete(pwd.id)}
                    >
                      Удалить
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
              <Stack gap="xs">
                <div>
                  <Text size="sm" fw={500} mb="xs">
                    Пароль:
                  </Text>
                  <Text
                    size="lg"
                    ff="monospace"
                    style={{
                      fontFamily: 'monospace',
                      letterSpacing: '2px',
                    }}
                  >
                    {visiblePasswords.has(pwd.id) ? pwd.password : '••••••••••••'}
                  </Text>
                </div>
                {pwd.notes && (
                  <div>
                    <Text size="sm" fw={500} mb="xs">
                      Заметки:
                    </Text>
                    <Text size="sm" c="dimmed">
                      {pwd.notes}
                    </Text>
                  </div>
                )}
              </Stack>
            </Card>
          ))}
        </Stack>
      )}

      <EntryForm
        opened={formOpened}
        onClose={closeForm}
        entry={selectedEntry}
        entryType="password"
        onSave={saveEntry}
      />
    </Stack>
  )
}

