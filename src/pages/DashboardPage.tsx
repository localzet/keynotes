import { useEffect, useState } from 'react'
import { Paper, Title, Text, Stack, Group, Card, Badge, SimpleGrid } from '@mantine/core'
import { IconNotes, IconKey, IconLock, IconShield } from '@tabler/icons-react'
import { useVault } from '../shared/hooks/useVault'
import { EntryType } from '../shared/types'

export default function DashboardPage() {
  const { entries } = useVault()
  const [stats, setStats] = useState({
    notes: 0,
    keys: 0,
    passwords: 0,
    total: 0,
  })

  useEffect(() => {
    const notes = entries.filter(e => e.type === 'note').length
    const keys = entries.filter(e => e.type === 'key').length
    const passwords = entries.filter(e => e.type === 'password').length

    setStats({
      notes,
      keys,
      passwords,
      total: entries.length,
    })
  }, [entries])

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Главная</Title>
        <Text c="dimmed">Обзор вашего хранилища</Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        <Card withBorder p="md">
          <Group>
            <IconShield size={32} />
            <div>
              <Text size="xs" c="dimmed">
                Всего записей
              </Text>
              <Text size="xl" fw={700}>
                {stats.total}
              </Text>
            </div>
          </Group>
        </Card>

        <Card withBorder p="md">
          <Group>
            <IconNotes size={32} />
            <div>
              <Text size="xs" c="dimmed">
                Заметки
              </Text>
              <Text size="xl" fw={700}>
                {stats.notes}
              </Text>
            </div>
          </Group>
        </Card>

        <Card withBorder p="md">
          <Group>
            <IconKey size={32} />
            <div>
              <Text size="xs" c="dimmed">
                Ключи
              </Text>
              <Text size="xl" fw={700}>
                {stats.keys}
              </Text>
            </div>
          </Group>
        </Card>

        <Card withBorder p="md">
          <Group>
            <IconLock size={32} />
            <div>
              <Text size="xs" c="dimmed">
                Пароли
              </Text>
              <Text size="xl" fw={700}>
                {stats.passwords}
              </Text>
            </div>
          </Group>
        </Card>
      </SimpleGrid>

      {entries.length === 0 && (
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <IconShield size={64} opacity={0.5} />
            <Text c="dimmed" size="lg">
              Хранилище пусто
            </Text>
            <Text c="dimmed" size="sm" ta="center">
              Начните добавлять заметки, ключи или пароли для их безопасного хранения
            </Text>
          </Stack>
        </Paper>
      )}
    </Stack>
  )
}

