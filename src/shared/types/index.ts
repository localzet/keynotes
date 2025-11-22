export type EntryType = 'note' | 'key' | 'password'

export interface BaseEntry {
  id: string
  type: EntryType
  title: string
  category?: string
  tags: string[]
  createdAt: string
  updatedAt: string
  encrypted: boolean
}

export interface NoteEntry extends BaseEntry {
  type: 'note'
  content: string
  language?: string // For code snippets
}

export interface KeyEntry extends BaseEntry {
  type: 'key'
  key: string
  publicKey?: string
  algorithm?: string
  keySize?: number
  notes?: string
}

export interface PasswordEntry extends BaseEntry {
  type: 'password'
  username?: string
  password: string
  url?: string
  notes?: string
}

export type Entry = NoteEntry | KeyEntry | PasswordEntry

export interface Vault {
  passwordHash: string
  entries: Entry[]
  version: number
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  masterPasswordHash?: string
  mixIdConnected: boolean
  syncEnabled: boolean
  autoLock: boolean
  lockTimeout: number // in minutes
  lastUnlockTime?: number
}

