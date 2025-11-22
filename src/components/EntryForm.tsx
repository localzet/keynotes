import { useState, useEffect } from 'react'
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Stack,
  Select,
  TagsInput,
  Group,
  Tabs,
  Code,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { Entry, NoteEntry, KeyEntry, PasswordEntry } from '../shared/types'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

interface EntryFormProps {
  opened: boolean
  onClose: () => void
  entry?: Entry | null
  entryType: 'note' | 'key' | 'password'
  onSave: (entry: Entry) => Promise<void>
}

export default function EntryForm({ opened, onClose, entry, entryType, onSave }: EntryFormProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm({
    initialValues: {
      title: '',
      category: '',
      tags: [] as string[],
      // Note fields
      content: '',
      language: '',
      // Key fields
      key: '',
      publicKey: '',
      algorithm: '',
      keySize: '',
      keyNotes: '',
      // Password fields
      username: '',
      password: '',
      url: '',
      passwordNotes: '',
    },
  })

  useEffect(() => {
    if (entry) {
      if (entry.type === 'note') {
        form.setValues({
          title: entry.title,
          category: entry.category || '',
          tags: entry.tags,
          content: entry.content,
          language: entry.language || '',
        })
      } else if (entry.type === 'key') {
        form.setValues({
          title: entry.title,
          category: entry.category || '',
          tags: entry.tags,
          key: entry.key,
          publicKey: entry.publicKey || '',
          algorithm: entry.algorithm || '',
          keySize: entry.keySize?.toString() || '',
          keyNotes: entry.notes || '',
        })
      } else if (entry.type === 'password') {
        form.setValues({
          title: entry.title,
          category: entry.category || '',
          tags: entry.tags,
          username: entry.username || '',
          password: entry.password,
          url: entry.url || '',
          passwordNotes: entry.notes || '',
        })
      }
    } else {
      form.reset()
    }
  }, [entry, opened])

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true)
    try {
      let newEntry: Entry

      if (entryType === 'note') {
        newEntry = {
          id: entry?.id || generateId(),
          type: 'note',
          title: values.title,
          category: values.category || undefined,
          tags: values.tags,
          content: values.content,
          language: values.language || undefined,
          createdAt: entry?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          encrypted: false,
        } as NoteEntry
      } else if (entryType === 'key') {
        newEntry = {
          id: entry?.id || generateId(),
          type: 'key',
          title: values.title,
          category: values.category || undefined,
          tags: values.tags,
          key: values.key,
          publicKey: values.publicKey || undefined,
          algorithm: values.algorithm || undefined,
          keySize: values.keySize ? parseInt(values.keySize) : undefined,
          notes: values.keyNotes || undefined,
          createdAt: entry?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          encrypted: false,
        } as KeyEntry
      } else {
        newEntry = {
          id: entry?.id || generateId(),
          type: 'password',
          title: values.title,
          category: values.category || undefined,
          tags: values.tags,
          username: values.username || undefined,
          password: values.password,
          url: values.url || undefined,
          notes: values.passwordNotes || undefined,
          createdAt: entry?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          encrypted: false,
        } as PasswordEntry
      }

      await onSave(newEntry)
      form.reset()
      onClose()
    } catch (error) {
      console.error('Failed to save entry:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={entry ? 'Редактировать запись' : 'Новая запись'}
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Название"
            placeholder="Введите название"
            required
            {...form.getInputProps('title')}
          />

          <TextInput
            label="Категория"
            placeholder="Категория (необязательно)"
            {...form.getInputProps('category')}
          />

          <TagsInput
            label="Теги"
            placeholder="Добавить тег"
            {...form.getInputProps('tags')}
          />

          {entryType === 'note' && (
            <>
              <Select
                label="Язык программирования"
                placeholder="Выберите язык"
                data={[
                  { value: '', label: 'Текст' },
                  { value: 'javascript', label: 'JavaScript' },
                  { value: 'typescript', label: 'TypeScript' },
                  { value: 'python', label: 'Python' },
                  { value: 'java', label: 'Java' },
                  { value: 'cpp', label: 'C++' },
                  { value: 'c', label: 'C' },
                  { value: 'rust', label: 'Rust' },
                  { value: 'go', label: 'Go' },
                  { value: 'php', label: 'PHP' },
                  { value: 'ruby', label: 'Ruby' },
                  { value: 'sql', label: 'SQL' },
                  { value: 'bash', label: 'Bash' },
                  { value: 'yaml', label: 'YAML' },
                  { value: 'json', label: 'JSON' },
                ]}
                {...form.getInputProps('language')}
              />
              <Textarea
                label="Содержимое"
                placeholder="Введите текст заметки или код"
                required
                minRows={10}
                styles={{
                  input: {
                    fontFamily: form.values.language ? 'monospace' : 'inherit',
                  },
                }}
                {...form.getInputProps('content')}
              />
            </>
          )}

          {entryType === 'key' && (
            <>
              <Textarea
                label="Приватный ключ"
                placeholder="Вставьте приватный ключ"
                required
                minRows={5}
                styles={{
                  input: {
                    fontFamily: 'monospace',
                    fontSize: '12px',
                  },
                }}
                {...form.getInputProps('key')}
              />
              <Textarea
                label="Публичный ключ (необязательно)"
                placeholder="Вставьте публичный ключ"
                minRows={3}
                styles={{
                  input: {
                    fontFamily: 'monospace',
                    fontSize: '12px',
                  },
                }}
                {...form.getInputProps('publicKey')}
              />
              <Group grow>
                <TextInput
                  label="Алгоритм"
                  placeholder="RSA, ED25519, etc."
                  {...form.getInputProps('algorithm')}
                />
                <TextInput
                  label="Размер ключа"
                  placeholder="2048, 4096, etc."
                  {...form.getInputProps('keySize')}
                />
              </Group>
              <Textarea
                label="Заметки"
                placeholder="Дополнительная информация"
                minRows={3}
                {...form.getInputProps('keyNotes')}
              />
            </>
          )}

          {entryType === 'password' && (
            <>
              <TextInput
                label="Имя пользователя / Email"
                placeholder="username@example.com"
                {...form.getInputProps('username')}
              />
              <TextInput
                label="Пароль"
                type="password"
                placeholder="Введите пароль"
                required
                {...form.getInputProps('password')}
              />
              <TextInput
                label="URL / Сайт"
                placeholder="https://example.com"
                {...form.getInputProps('url')}
              />
              <Textarea
                label="Заметки"
                placeholder="Дополнительная информация"
                minRows={3}
                {...form.getInputProps('passwordNotes')}
              />
            </>
          )}

          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" loading={loading}>
              Сохранить
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

