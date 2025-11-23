import { Entry, Vault, AppSettings, NoteEntry, KeyEntry, PasswordEntry } from '../types'
import { encrypt, decrypt, hashPassword } from '../utils/encryption'

const STORAGE_KEYS = {
  VAULT: 'keynotes-vault',
  SETTINGS: 'keynotes-settings',
  MASTER_PASSWORD_HASH: 'keynotes-master-password-hash',
  LAST_UNLOCK_TIME: 'keynotes-last-unlock-time',
} as const

class Storage {
  private masterPassword: string | null = null
  private vault: Vault | null = null

  /**
   * Sets the master password and unlocks the vault
   */
  async unlock(password: string): Promise<boolean> {
    console.log('[Storage] unlock() called')
    try {
      const storedHash = localStorage.getItem(STORAGE_KEYS.MASTER_PASSWORD_HASH)
      
      if (!storedHash) {
        console.log('[Storage] First time setup - creating new vault')
        // First time setup - create new vault
        this.masterPassword = password
        const passwordHash = hashPassword(password)
        localStorage.setItem(STORAGE_KEYS.MASTER_PASSWORD_HASH, passwordHash)
        
        this.vault = {
          passwordHash,
          entries: [],
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        await this.saveVault()
        const unlockTime = Date.now().toString()
        localStorage.setItem(STORAGE_KEYS.LAST_UNLOCK_TIME, unlockTime)
        console.log('[Storage] Vault created and unlocked. Time:', unlockTime)
        console.log('[Storage] isUnlocked() after unlock:', this.isUnlocked())
        return true
      }

      // Verify password
      const passwordHash = hashPassword(password)
      if (passwordHash !== storedHash) {
        console.log('[Storage] Password verification failed')
        return false
      }

      console.log('[Storage] Password verified, loading vault')
      this.masterPassword = password
      try {
        await this.loadVault()
        const unlockTime = Date.now().toString()
        localStorage.setItem(STORAGE_KEYS.LAST_UNLOCK_TIME, unlockTime)
        console.log('[Storage] Vault loaded and unlocked. Time:', unlockTime)
        console.log('[Storage] isUnlocked() after unlock:', this.isUnlocked())
        return true
      } catch (error) {
        // If loading fails, clear the password and return false
        this.masterPassword = null
        this.vault = null
        console.error('[Storage] Failed to load vault:', error)
        throw error
      }
    } catch (error) {
      console.error('[Storage] Unlock error:', error)
      // Ensure state is cleared on error
      this.masterPassword = null
      this.vault = null
      return false
    }
  }

  /**
   * Locks the vault by clearing the master password from memory
   */
  lock(): void {
    console.log('[Storage] lock() called')
    this.masterPassword = null
    this.vault = null
    localStorage.removeItem(STORAGE_KEYS.LAST_UNLOCK_TIME)
    console.log('[Storage] Vault locked. isUnlocked():', this.isUnlocked())
  }

  /**
   * Checks if vault is unlocked
   */
  isUnlocked(): boolean {
    const unlocked = this.masterPassword !== null && this.vault !== null
    console.log('[Storage] isUnlocked() called, result:', unlocked, 'masterPassword:', !!this.masterPassword, 'vault:', !!this.vault)
    return unlocked
  }

  /**
   * Changes the master password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    if (!this.isUnlocked()) {
      return false
    }

    const oldHash = hashPassword(oldPassword)
    const storedHash = localStorage.getItem(STORAGE_KEYS.MASTER_PASSWORD_HASH)
    
    if (oldHash !== storedHash) {
      return false
    }

    // Re-encrypt all entries with new password
    if (this.vault) {
      const newHash = hashPassword(newPassword)
      const oldPassword = this.masterPassword
      
      // Decrypt all entries with old password, then encrypt with new
      const decryptedEntries = this.vault.entries.map(entry => this.decryptEntry(entry))
      
      // Update password
      this.masterPassword = newPassword
      this.vault.passwordHash = newHash
      
      // Re-encrypt all entries with new password
      this.vault.entries = decryptedEntries.map(entry => {
        if (entry.type === 'password') {
          const encrypted: PasswordEntry = {
            ...entry,
            encrypted: true,
            password: encrypt(entry.password, newPassword),
          }
          return encrypted
        } else if (entry.type === 'key') {
          const encrypted: KeyEntry = {
            ...entry,
            encrypted: true,
            key: encrypt(entry.key, newPassword),
            ...(entry.publicKey && { publicKey: encrypt(entry.publicKey, newPassword) }),
          }
          return encrypted
        } else {
          const encrypted: NoteEntry = {
            ...entry,
            encrypted: true,
            content: encrypt(entry.content, newPassword),
          }
          return encrypted
        }
      })
      
      await this.saveVault()
      localStorage.setItem(STORAGE_KEYS.MASTER_PASSWORD_HASH, newHash)
      return true
    }

    return false
  }

  /**
   * Loads vault from storage
   */
  private async loadVault(): Promise<void> {
    if (!this.masterPassword) {
      throw new Error('Vault is locked')
    }

    const stored = localStorage.getItem(STORAGE_KEYS.VAULT)
    if (!stored) {
      this.vault = {
        passwordHash: hashPassword(this.masterPassword),
        entries: [],
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      return
    }

    try {
      // Decrypt vault data
      const decrypted = decrypt(stored, this.masterPassword)
      this.vault = JSON.parse(decrypted) as Vault
    } catch (error) {
      console.error('Failed to load vault:', error)
      throw new Error('Failed to decrypt vault. Password may be incorrect.')
    }
  }

  /**
   * Saves vault to storage
   */
  private async saveVault(): Promise<void> {
    if (!this.masterPassword || !this.vault) {
      throw new Error('Vault is locked')
    }

    this.vault.updatedAt = new Date().toISOString()
    const encrypted = encrypt(JSON.stringify(this.vault), this.masterPassword)
    localStorage.setItem(STORAGE_KEYS.VAULT, encrypted)
    localStorage.setItem(STORAGE_KEYS.LAST_UNLOCK_TIME, Date.now().toString())
  }

  /**
   * Gets all entries
   */
  async getEntries(): Promise<Entry[]> {
    if (!this.isUnlocked()) {
      throw new Error('Vault is locked')
    }

    if (!this.vault) {
      return []
    }

    // Decrypt entries
    return this.vault.entries.map(entry => this.decryptEntry(entry))
  }

  /**
   * Gets entry by ID
   */
  async getEntry(id: string): Promise<Entry | null> {
    if (!this.isUnlocked()) {
      throw new Error('Vault is locked')
    }

    if (!this.vault) {
      return null
    }

    const entry = this.vault.entries.find(e => e.id === id)
    return entry ? this.decryptEntry(entry) : null
  }

  /**
   * Adds or updates an entry
   */
  async saveEntry(entry: Entry): Promise<void> {
    if (!this.isUnlocked()) {
      throw new Error('Vault is locked')
    }

    if (!this.vault) {
      throw new Error('Vault not initialized')
    }

    // Entry comes unencrypted from UI, encrypt it
    const encryptedEntry = this.encryptEntry(entry)
    
    const index = this.vault.entries.findIndex(e => e.id === entry.id)
    if (index >= 0) {
      this.vault.entries[index] = encryptedEntry
    } else {
      this.vault.entries.push(encryptedEntry)
    }

    await this.saveVault()
  }

  /**
   * Deletes an entry
   */
  async deleteEntry(id: string): Promise<void> {
    if (!this.isUnlocked()) {
      throw new Error('Vault is locked')
    }

    if (!this.vault) {
      throw new Error('Vault not initialized')
    }

    this.vault.entries = this.vault.entries.filter(e => e.id !== id)
    await this.saveVault()
  }

  /**
   * Encrypts entry sensitive data
   */
  private encryptEntry(entry: Entry): Entry {
    if (!this.masterPassword) {
      throw new Error('Vault is locked')
    }

    // Entry should come unencrypted from UI
    // If it's already encrypted (from storage), decrypt first then re-encrypt
    let entryToEncrypt = entry
    if (entry.encrypted) {
      try {
        entryToEncrypt = this.decryptEntry(entry)
      } catch {
        // If decryption fails, assume it's already in correct format
        entryToEncrypt = entry
      }
    }
    
    if (entryToEncrypt.type === 'password') {
      const encrypted: PasswordEntry = {
        ...entryToEncrypt,
        encrypted: true,
        password: encrypt(entryToEncrypt.password, this.masterPassword),
      }
      return encrypted
    } else if (entryToEncrypt.type === 'key') {
      const encrypted: KeyEntry = {
        ...entryToEncrypt,
        encrypted: true,
        key: encrypt(entryToEncrypt.key, this.masterPassword),
        ...(entryToEncrypt.publicKey && { publicKey: encrypt(entryToEncrypt.publicKey, this.masterPassword) }),
      }
      return encrypted
    } else {
      const encrypted: NoteEntry = {
        ...entryToEncrypt,
        encrypted: true,
        content: encrypt(entryToEncrypt.content, this.masterPassword),
      }
      return encrypted
    }
  }

  /**
   * Decrypts entry sensitive data
   */
  private decryptEntry(entry: Entry): Entry {
    if (!this.masterPassword) {
      throw new Error('Vault is locked')
    }

    // If not encrypted, return as is
    if (!entry.encrypted) {
      return entry
    }

    if (entry.type === 'password') {
      const decrypted: PasswordEntry = {
        ...entry,
        encrypted: false,
        password: decrypt(entry.password, this.masterPassword),
      }
      return decrypted
    } else if (entry.type === 'key') {
      const decrypted: KeyEntry = {
        ...entry,
        encrypted: false,
        key: decrypt(entry.key, this.masterPassword),
        ...(entry.publicKey && { publicKey: decrypt(entry.publicKey, this.masterPassword) }),
      }
      return decrypted
    } else {
      const decrypted: NoteEntry = {
        ...entry,
        encrypted: false,
        content: decrypt(entry.content, this.masterPassword),
      }
      return decrypted
    }
  }

  /**
   * Gets app settings
   */
  getSettings(): AppSettings {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS)
    if (!stored) {
      return {
        mixIdConnected: false,
        syncEnabled: false,
        autoLock: true,
        lockTimeout: 15,
      }
    }
    return JSON.parse(stored) as AppSettings
  }

  /**
   * Saves app settings
   */
  saveSettings(settings: AppSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
  }

  /**
   * Exports vault data (for backup/sync)
   */
  async exportVault(): Promise<string> {
    if (!this.isUnlocked()) {
      throw new Error('Vault is locked')
    }

    if (!this.vault) {
      throw new Error('Vault not initialized')
    }

    // Export encrypted vault
    return encrypt(JSON.stringify(this.vault), this.masterPassword!)
  }

  /**
   * Imports vault data (from backup/sync)
   */
  async importVault(encryptedData: string, password: string): Promise<boolean> {
    try {
      const decrypted = decrypt(encryptedData, password)
      const importedVault = JSON.parse(decrypted) as Vault
      
      // Verify password hash
      const passwordHash = hashPassword(password)
      if (importedVault.passwordHash !== passwordHash) {
        return false
      }

      // If current vault is unlocked with same password, import
      if (this.masterPassword === password) {
        this.vault = importedVault
        await this.saveVault()
        return true
      }

      // Otherwise, just store for later unlock
      localStorage.setItem(STORAGE_KEYS.VAULT, encryptedData)
      localStorage.setItem(STORAGE_KEYS.MASTER_PASSWORD_HASH, passwordHash)
      return true
    } catch (error) {
      console.error('Import error:', error)
      return false
    }
  }
}

export const storage = new Storage()

