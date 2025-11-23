import { useMixIdSync as useLibraryMixIdSync } from '@localzet/data-connector/hooks'
import { storage } from '../api/storage'

export function useMixIdSync() {
  const { performSync, uploadData: uploadDataLib } = useLibraryMixIdSync({
    dataTypes: ['vault'],
    getLocalData: async (dataType: string) => {
      if (dataType === 'vault' && storage.isUnlocked()) {
        const vaultData = await storage.exportVault()
        return { vault: vaultData }
      }
      return {}
    },
    saveLocalData: async (dataType: string, data: Record<string, any>) => {
      if (dataType === 'vault' && data.vault && storage.isUnlocked()) {
        // Vault import requires password, so we just log it
        // In a real scenario, we'd show a notification to the user
        console.log('Remote vault update available, but import requires password')
      }
    },
    onDataUpdate: (dataType: string, data: Record<string, any>) => {
      if (dataType === 'vault' && data.vault) {
        console.log('Vault data updated:', data)
      }
    },
    mergeStrategy: 'newer-wins',
  })

  // Wrapper function for backward compatibility
  const uploadVault = async () => {
    if (!storage.isUnlocked()) {
      return
    }
    const vaultData = await storage.exportVault()
    await uploadDataLib('vault', { vault: vaultData })
  }

  return { performSync, uploadVault }
}
