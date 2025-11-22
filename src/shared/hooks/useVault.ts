import { useState, useEffect, useCallback } from 'react'
import { storage } from '../api/storage'
import { Entry, AppSettings } from '../types'
import { notifications } from '@mantine/notifications'

export function useVault() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings())

  const loadEntries = useCallback(async () => {
    if (!storage.isUnlocked()) return

    try {
      const loadedEntries = await storage.getEntries()
      setEntries(loadedEntries)
    } catch (error) {
      console.error('Failed to load entries:', error)
    }
  }, [])

  const lock = useCallback(() => {
    console.log('[useVault] lock() called')
    storage.lock()
    setIsUnlocked(false)
    setEntries([])
    console.log('[useVault] lock() completed, isUnlocked set to false')
    notifications.show({
      title: 'Хранилище заблокировано',
      message: 'Все данные защищены',
      color: 'blue',
    })
  }, [])

  useEffect(() => {
    // Check if vault is already unlocked (only on mount)
    console.log('[useVault] useEffect: checkUnlocked on mount, current isUnlocked:', isUnlocked)
    const isStorageUnlocked = storage.isUnlocked()
    console.log('[useVault] checkUnlocked: storage.isUnlocked() =', isStorageUnlocked, 'current state isUnlocked:', isUnlocked)
    
    // Set state synchronously first
    if (isStorageUnlocked) {
      console.log('[useVault] Setting isUnlocked to true (synchronously)')
      setIsUnlocked(true)
      // Load entries asynchronously
      loadEntries().then(() => {
        console.log('[useVault] After loadEntries, state should be updated')
      })
    } else {
      console.log('[useVault] Setting isUnlocked to false')
      setIsUnlocked(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount - loadEntries is stable

  useEffect(() => {
    // Check auto-lock
    console.log('[useVault] useEffect: auto-lock check, isUnlocked:', isUnlocked, 'storage.isUnlocked():', storage.isUnlocked())
    // First, sync with storage if needed
    const storageUnlocked = storage.isUnlocked()
    if (storageUnlocked && !isUnlocked) {
      console.log('[useVault] Storage is unlocked but state is not, syncing...')
      setIsUnlocked(true)
      loadEntries()
      return // Exit early, will re-run when state updates
    }
    if (!isUnlocked) return

    const checkAutoLock = () => {
      console.log('[useVault] checkAutoLock: checking...')
      const storageUnlocked = storage.isUnlocked()
      console.log('[useVault] checkAutoLock: storage.isUnlocked() =', storageUnlocked)
      
      if (!storageUnlocked) {
        console.log('[useVault] checkAutoLock: storage says locked, setting isUnlocked to false')
        setIsUnlocked(false)
        return
      }

      const lastUnlock = localStorage.getItem('keynotes-last-unlock-time')
      console.log('[useVault] checkAutoLock: lastUnlock time =', lastUnlock)
      
      if (!lastUnlock) {
        // If no unlock time, don't lock (might be just unlocked)
        console.log('[useVault] checkAutoLock: no unlock time, skipping')
        return
      }

      const lockTimeout = settings.lockTimeout * 60 * 1000 // Convert to milliseconds
      const lastUnlockTime = parseInt(lastUnlock, 10)
      const timeSinceUnlock = Date.now() - lastUnlockTime
      console.log('[useVault] checkAutoLock: timeSinceUnlock =', timeSinceUnlock, 'ms, lockTimeout =', lockTimeout, 'ms, autoLock =', settings.autoLock)

      // Don't lock if less than 1 second has passed (just unlocked)
      // This prevents immediate locking due to timing issues
      if (timeSinceUnlock < 1000) {
        console.log('[useVault] checkAutoLock: less than 1 second passed, skipping')
        return
      }

      // Only lock if timeout has passed and auto-lock is enabled
      // Also check that timeSinceUnlock is positive (not in the future due to timezone issues)
      if (settings.autoLock && timeSinceUnlock > 0 && timeSinceUnlock > lockTimeout) {
        console.log('[useVault] checkAutoLock: LOCKING due to timeout')
        lock()
      } else {
        console.log('[useVault] checkAutoLock: not locking (conditions not met)')
      }
    }

    // Don't check immediately - wait a bit to avoid locking right after unlock
    // Set interval to check every minute
    console.log('[useVault] Setting up auto-lock interval')
    const interval = setInterval(checkAutoLock, 60000) // Check every minute
    return () => {
      console.log('[useVault] Clearing auto-lock interval')
      clearInterval(interval)
    }
  }, [isUnlocked, settings.autoLock, settings.lockTimeout, lock])

  const unlock = useCallback(async (password: string): Promise<boolean> => {
    console.log('[useVault] unlock() called')
    setLoading(true)
    try {
      const success = await storage.unlock(password)
      console.log('[useVault] unlock() storage.unlock() returned:', success)
      if (success) {
        console.log('[useVault] unlock() success, setting isUnlocked to true')
        setIsUnlocked(true)
        try {
          await loadEntries()
          console.log('[useVault] unlock() entries loaded')
        } catch (error) {
          console.error('[useVault] unlock() Failed to load entries after unlock:', error)
          // Don't fail unlock if entries loading fails
        }
        notifications.show({
          title: 'Успешно',
          message: 'Хранилище разблокировано',
          color: 'green',
        })
      } else {
        console.log('[useVault] unlock() failed - wrong password')
        notifications.show({
          title: 'Ошибка',
          message: 'Неверный пароль',
          color: 'red',
        })
      }
      return success
    } catch (error) {
      console.error('[useVault] unlock() error:', error)
      notifications.show({
        title: 'Ошибка',
        message: error instanceof Error ? error.message : 'Не удалось разблокировать хранилище',
        color: 'red',
      })
      return false
    } finally {
      setLoading(false)
      console.log('[useVault] unlock() finished, loading set to false')
    }
  }, [loadEntries])

  const saveEntry = useCallback(async (entry: Entry) => {
    if (!storage.isUnlocked()) {
      throw new Error('Vault is locked')
    }

    try {
      await storage.saveEntry(entry)
      await loadEntries()
      notifications.show({
        title: 'Успешно',
        message: 'Запись сохранена',
        color: 'green',
      })
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: error instanceof Error ? error.message : 'Не удалось сохранить запись',
        color: 'red',
      })
      throw error
    }
  }, [loadEntries])

  const deleteEntry = useCallback(async (id: string) => {
    if (!storage.isUnlocked()) {
      throw new Error('Vault is locked')
    }

    try {
      await storage.deleteEntry(id)
      await loadEntries()
      notifications.show({
        title: 'Успешно',
        message: 'Запись удалена',
        color: 'green',
      })
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: error instanceof Error ? error.message : 'Не удалось удалить запись',
        color: 'red',
      })
      throw error
    }
  }, [loadEntries])

  const changePassword = useCallback(async (oldPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const success = await storage.changePassword(oldPassword, newPassword)
      if (success) {
        notifications.show({
          title: 'Успешно',
          message: 'Пароль изменен',
          color: 'green',
        })
      } else {
        notifications.show({
          title: 'Ошибка',
          message: 'Неверный старый пароль',
          color: 'red',
        })
      }
      return success
    } catch (error) {
      notifications.show({
        title: 'Ошибка',
        message: error instanceof Error ? error.message : 'Не удалось изменить пароль',
        color: 'red',
      })
      return false
    }
  }, [])

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings }
    storage.saveSettings(updated)
    setSettings(updated)
  }, [settings])

  return {
    isUnlocked,
    entries,
    loading,
    settings,
    unlock,
    lock,
    saveEntry,
    deleteEntry,
    changePassword,
    updateSettings,
    refreshEntries: loadEntries,
  }
}

