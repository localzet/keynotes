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
import { IconPlus, IconSearch, IconEdit, IconTrash, IconCopy, IconDots } from '@tabler/icons-react'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useVault } from '../shared/hooks/useVault'
import { NoteEntry } from '../shared/types'
import EntryForm from '../components/EntryForm'
import dayjs from 'dayjs'

export default function NotesPage() {
  const { entries, saveEntry, deleteEntry } = useVault()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<NoteEntry | null>(null)
  const [formOpened, { open: openForm, close: closeForm }] = useDisclosure(false)

  const notes = useMemo(() => {
    return entries.filter((e): e is NoteEntry => e.type === 'note')
  }, [entries])

  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes
    const query = searchQuery.toLowerCase()
    return notes.filter(
      note =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.toLowerCase().includes(query)) ||
        (note.category && note.category.toLowerCase().includes(query))
    )
  }, [notes, searchQuery])

  const handleNew = () => {
    setSelectedEntry(null)
    openForm()
  }

  const handleEdit = (entry: NoteEntry) => {
    setSelectedEntry(entry)
    openForm()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту заметку?')) return
    await deleteEntry(id)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    notifications.show({
      title: 'Скопировано',
      message: 'Текст скопирован в буфер обмена',
      color: 'green',
    })
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={2}>Заметки</Title>
          <Text c="dimmed">Управление заметками и кодом</Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={handleNew}>
          Новая заметка
        </Button>
      </Group>

      <TextInput
        placeholder="Поиск заметок..."
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
      />

      {filteredNotes.length === 0 ? (
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <Text c="dimmed">
              {searchQuery ? 'Заметки не найдены' : 'Нет заметок. Создайте первую заметку!'}
            </Text>
          </Stack>
        </Paper>
      ) : (
        <Stack gap="md">
          {filteredNotes.map((note) => (
            <Card key={note.id} withBorder p="md">
              <Group justify="space-between" align="flex-start" mb="md">
                <div style={{ flex: 1 }}>
                  <Group gap="xs" mb="xs">
                    <Text fw={500}>{note.title}</Text>
                    {note.language && (
                      <Badge size="sm" variant="light">
                        {note.language}
                      </Badge>
                    )}
                    {note.category && (
                      <Badge size="sm" variant="outline">
                        {note.category}
                      </Badge>
                    )}
                  </Group>
                  {note.tags.length > 0 && (
                    <Group gap="xs" mb="xs">
                      {note.tags.map((tag) => (
                        <Badge key={tag} size="xs" variant="dot">
                          {tag}
                        </Badge>
                      ))}
                    </Group>
                  )}
                  <Text size="xs" c="dimmed">
                    {dayjs(note.updatedAt).format('DD.MM.YYYY HH:mm')}
                  </Text>
                </div>
                <Menu>
                  <Menu.Target>
                    <ActionIcon variant="subtle">
                      <IconDots size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => handleEdit(note)}>
                      Редактировать
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconCopy size={16} />}
                      onClick={() => handleCopy(note.content)}
                    >
                      Копировать
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconTrash size={16} />}
                      color="red"
                      onClick={() => handleDelete(note.id)}
                    >
                      Удалить
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
              <ScrollArea h={200}>
                {note.language ? (
                  <Code block style={{ width: '100%', fontSize: '12px' }}>
                    {note.content}
                  </Code>
                ) : (
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {note.content}
                  </Text>
                )}
              </ScrollArea>
            </Card>
          ))}
        </Stack>
      )}

      <EntryForm
        opened={formOpened}
        onClose={closeForm}
        entry={selectedEntry}
        entryType="note"
        onSave={saveEntry}
      />
    </Stack>
  )
}

