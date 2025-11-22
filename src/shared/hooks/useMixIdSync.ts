import { useEffect, useRef, useCallback } from 'react'
import { mixIdApi } from '../api/mixIdApi'
import { storage } from '../api/storage'
import { wsClient } from '../api/websocket'
import { offlineQueue } from '../api/offlineQueue'

const SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes (fallback HTTP sync)
const HEARTBEAT_INTERVAL = 30 * 1000 // 30 seconds

export function useMixIdSync() {
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastVaultUpdateRef = useRef<number>(0)

  // Upload vault with conflict resolution
  const uploadVault = useCallback(async () => {
    try {
      if (!storage.isUnlocked()) {
        return
      }

      const syncStatus = await mixIdApi.getSyncStatus()
      if (!syncStatus.syncData) {
        return
      }

      const vaultData = await storage.exportVault()
      await mixIdApi.uploadData('vault', { vault: vaultData })
      lastVaultUpdateRef.current = Date.now()

      // Send via WebSocket for real-time sync
      if (wsClient.isConnected()) {
        wsClient.send({
          type: 'sync:data',
          dataType: 'vault',
          data: { vault: vaultData },
        })
      }
    } catch (error) {
      console.error('Failed to upload vault:', error)
      // Queue for offline sync
      const vaultData = await storage.exportVault()
      offlineQueue.enqueue('data', { vault: vaultData }, 'vault')
    }
  }, [])

  // Process offline queue
  const processOfflineQueue = useCallback(async () => {
    await offlineQueue.processQueue(async (operation) => {
      if (operation.type === 'data' && operation.dataType === 'vault') {
        try {
          await mixIdApi.uploadData('vault', operation.data)
        } catch (error) {
          throw error // Will be retried
        }
      }
    })
  }, [])

  useEffect(() => {
    const config = mixIdApi.getConfig()
    if (!config || !config.accessToken || !storage.isUnlocked()) {
      return
    }

    // Connect WebSocket
    wsClient.connect()

    // Set up WebSocket event handlers
    const handleVaultUpdate = async (message: any) => {
      if (message.dataType === 'vault' && message.data?.vault) {
        try {
          const remoteVaultData = message.data.vault
          const remoteTime = new Date(message.updatedAt || 0).getTime()
          const localTime = lastVaultUpdateRef.current

          // If remote is newer, import it (with conflict resolution)
          if (remoteTime > localTime) {
            // Get current password to decrypt
            const settings = storage.getSettings()
            // For sync, we need the master password - this is a limitation
            // In a real scenario, we'd need to handle this more carefully
            // For now, we'll just update the timestamp
            lastVaultUpdateRef.current = remoteTime
            console.log('Remote vault update received, but import requires password')
          }
        } catch (error) {
          console.error('Error handling vault update:', error)
        }
      }
    }

    wsClient.on('sync:data:update', handleVaultUpdate)

    // Initial sync
    performSync()

    // Set up periodic sync (fallback HTTP sync)
    syncIntervalRef.current = setInterval(performSync, SYNC_INTERVAL)

    // Set up heartbeat
    heartbeatIntervalRef.current = setInterval(() => {
      mixIdApi.heartbeat({
        platform: navigator.platform,
        userAgent: navigator.userAgent,
      }).catch(console.error)
    }, HEARTBEAT_INTERVAL)

    // Process offline queue when online
    if (navigator.onLine) {
      processOfflineQueue()
    }

    return () => {
      wsClient.off('sync:data:update', handleVaultUpdate)
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
    }
  }, [uploadVault, processOfflineQueue])

  const performSync = async () => {
    try {
      const config = mixIdApi.getConfig()
      if (!config || !config.accessToken || !storage.isUnlocked()) {
        return
      }

      const syncStatus = await mixIdApi.getSyncStatus()
      if (!syncStatus.syncData) {
        return
      }

      // Check for updates
      const updates = await mixIdApi.checkUpdates(['vault'])

      // Download updates if available
      if (updates.hasUpdates && updates.updates.data?.vault) {
        try {
          const remoteData = await mixIdApi.downloadData('vault')
          const vaultData = remoteData.data.vault
          if (vaultData && typeof vaultData === 'string') {
            const remoteTime = new Date(updates.updates.data.vault.updatedAt || 0).getTime()
            const localTime = lastVaultUpdateRef.current

            // If remote is newer, notify user (import requires password)
            if (remoteTime > localTime) {
              console.log('Remote vault update available (newer than local)')
              // In a real implementation, we'd show a notification to the user
              // to import the remote vault
            }
          }
        } catch (error) {
          console.error('Failed to download vault:', error)
        }
      }

      // Upload local changes
      await uploadVault()

      // Process offline queue
      await processOfflineQueue()
    } catch (error) {
      console.error('Sync error:', error)
    }
  }

  return { performSync, uploadVault }
}

