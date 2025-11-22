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
  Code,
  ScrollArea,
} from '@mantine/core'
import { IconPlus, IconSearch, IconEdit, IconTrash, IconCopy, IconDots, IconEye, IconEyeOff } from '@tabler/icons-react'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useVault } from '../shared/hooks/useVault'
import { KeyEntry } from '../shared/types'
import EntryForm from '../components/EntryForm'
import dayjs from 'dayjs'

export default function KeysPage() {
  const { entries, saveEntry, deleteEntry } = useVault()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<KeyEntry | null>(null)
  const [formOpened, { open: openForm, close: closeForm }] = useDisclosure(false)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  const keys = useMemo(() => {
    return entries.filter((e): e is KeyEntry => e.type === 'key')
  }, [entries])

  const filteredKeys = useMemo(() => {
    if (!searchQuery) return keys
    const query = searchQuery.toLowerCase()
    return keys.filter(
      key =>
        key.title.toLowerCase().includes(query) ||
        key.key.toLowerCase().includes(query) ||
        (key.publicKey && key.publicKey.toLowerCase().includes(query)) ||
        key.tags.some(tag => tag.toLowerCase().includes(query)) ||
        (key.category && key.category.toLowerCase().includes(query))
    )
  }, [keys, searchQuery])

  const handleNew = () => {
    setSelectedEntry(null)
    openForm()
  }

  const handleEdit = (entry: KeyEntry) => {
    setSelectedEntry(entry)
    openForm()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот ключ?')) return
    await deleteEntry(id)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    notifications.show({
      title: 'Скопировано',
      message: 'Ключ скопирован в буфер обмена',
      color: 'green',
    })
  }

  const toggleVisibility = (id: string) => {
    const newSet = new Set(visibleKeys)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setVisibleKeys(newSet)
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={2}>Ключи</Title>
          <Text c="dimmed">Управление SSH и другими ключами</Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={handleNew}>
          Новый ключ
        </Button>
      </Group>

      <TextInput
        placeholder="Поиск ключей..."
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
      />

      {filteredKeys.length === 0 ? (
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <Text c="dimmed">
              {searchQuery ? 'Ключи не найдены' : 'Нет ключей. Добавьте первый ключ!'}
            </Text>
          </Stack>
        </Paper>
      ) : (
        <Stack gap="md">
          {filteredKeys.map((key) => (
            <Card key={key.id} withBorder p="md">
              <Group justify="space-between" align="flex-start" mb="md">
                <div style={{ flex: 1 }}>
                  <Group gap="xs" mb="xs">
                    <Text fw={500}>{key.title}</Text>
                    {key.algorithm && (
                      <Badge size="sm" variant="light">
                        {key.algorithm}
                      </Badge>
                    )}
                    {key.keySize && (
                      <Badge size="sm" variant="outline">
                        {key.keySize} bits
                      </Badge>
                    )}
                    {key.category && (
                      <Badge size="sm" variant="outline">
                        {key.category}
                      </Badge>
                    )}
                  </Group>
                  {key.tags.length > 0 && (
                    <Group gap="xs" mb="xs">
                      {key.tags.map((tag) => (
                        <Badge key={tag} size="xs" variant="dot">
                          {tag}
                        </Badge>
                      ))}
                    </Group>
                  )}
                  <Text size="xs" c="dimmed">
                    {dayjs(key.updatedAt).format('DD.MM.YYYY HH:mm')}
                  </Text>
                </div>
                <Menu>
                  <Menu.Target>
                    <ActionIcon variant="subtle">
                      <IconDots size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => handleEdit(key)}>
                      Редактировать
                    </Menu.Item>
                    <Menu.Item
                      leftSection={visibleKeys.has(key.id) ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                      onClick={() => toggleVisibility(key.id)}
                    >
                      {visibleKeys.has(key.id) ? 'Скрыть' : 'Показать'}
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconCopy size={16} />}
                      onClick={() => handleCopy(key.key)}
                    >
                      Копировать ключ
                    </Menu.Item>
                    {key.publicKey && (
                      <Menu.Item
                        leftSection={<IconCopy size={16} />}
                        onClick={() => handleCopy(key.publicKey!)}
                      >
                        Копировать публичный ключ
                      </Menu.Item>
                    )}
                    <Menu.Item
                      leftSection={<IconTrash size={16} />}
                      color="red"
                      onClick={() => handleDelete(key.id)}
                    >
                      Удалить
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
              <Stack gap="md">
                <div>
                  <Text size="sm" fw={500} mb="xs">
                    Приватный ключ:
                  </Text>
                  <ScrollArea h={100}>
                    <Code block style={{ width: '100%', fontSize: '11px' }}>
                      {visibleKeys.has(key.id) ? key.key : '••••••••••••••••••••••••••••••••'}
                    </Code>
                  </ScrollArea>
                </div>
                {key.publicKey && (
                  <div>
                    <Text size="sm" fw={500} mb="xs">
                      Публичный ключ:
                    </Text>
                    <ScrollArea h={80}>
                      <Code block style={{ width: '100%', fontSize: '11px' }}>
                        {visibleKeys.has(key.id) ? key.publicKey : '••••••••••••••••••••••••••••••••'}
                      </Code>
                    </ScrollArea>
                  </div>
                )}
                {key.notes && (
                  <div>
                    <Text size="sm" fw={500} mb="xs">
                      Заметки:
                    </Text>
                    <Text size="sm" c="dimmed">
                      {key.notes}
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
        entryType="key"
        onSave={saveEntry}
      />
    </Stack>
  )
}

