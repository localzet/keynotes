import CryptoJS from 'crypto-js'

/**
 * Encrypts data using AES encryption with a password
 */
export function encrypt(data: string, password: string): string {
  return CryptoJS.AES.encrypt(data, password).toString()
}

/**
 * Decrypts data using AES decryption with a password
 */
export function decrypt(encryptedData: string, password: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, password)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    if (!decrypted) {
      throw new Error('Invalid password or corrupted data')
    }
    return decrypted
  } catch (error) {
    throw new Error('Failed to decrypt data. Invalid password or corrupted data.')
  }
}

/**
 * Generates a hash from password for verification
 */
export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString()
}

/**
 * Verifies password against hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

