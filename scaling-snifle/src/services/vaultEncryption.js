/**
 * Vault Encryption Service
 * 
 * This module handles encryption for messages saved to the vault (PostgreSQL).
 * It uses AES-256-GCM symmetric encryption, which is separate from the Olm
 * transport encryption used for ephemeral messages.
 * 
 * Why separate encryption?
 * - Olm keys are for transport (they rotate with the ratchet)
 * - Vault keys are for long-term storage (they persist)
 * 
 * The vault key is derived from the user's password or stored securely
 * in localStorage. Only the user can decrypt their vault messages.
 */

// ============ CONSTANTS ============

const VAULT_KEY_STORAGE = 'vault_encryption_key';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

// ============ KEY MANAGEMENT ============

/**
 * Generate a new vault encryption key.
 * Called once when user first uses the vault feature.
 * 
 * @returns {Promise<CryptoKey>} The generated key
 */
export async function generateVaultKey() {
  const key = await window.crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // extractable (so we can export/import it)
    ['encrypt', 'decrypt']
  );
  
  // Export and store the key
  await saveVaultKey(key);
  
  return key;
}

/**
 * Derive a vault key from the user's password.
 * Alternative to generateVaultKey() - ties encryption to password.
 * 
 * @param {string} password - User's password
 * @param {Uint8Array} salt - Salt for key derivation (store with user data)
 * @returns {Promise<CryptoKey>} The derived key
 */
export async function deriveVaultKeyFromPassword(password, salt) {
  // Convert password to key material
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Derive the actual encryption key
  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
  
  return key;
}

/**
 * Save the vault key to localStorage (exported as JWK).
 * 
 * @param {CryptoKey} key - The key to save
 */
async function saveVaultKey(key) {
  const exported = await window.crypto.subtle.exportKey('jwk', key);
  localStorage.setItem(VAULT_KEY_STORAGE, JSON.stringify(exported));
}

/**
 * Load the vault key from localStorage.
 * 
 * @returns {Promise<CryptoKey|null>} The key, or null if not found
 */
export async function loadVaultKey() {
  const stored = localStorage.getItem(VAULT_KEY_STORAGE);
  if (!stored) return null;
  
  try {
    const jwk = JSON.parse(stored);
    const key = await window.crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: ALGORITHM },
      true,
      ['encrypt', 'decrypt']
    );
    return key;
  } catch (error) {
    console.error('Failed to load vault key:', error);
    return null;
  }
}

/**
 * Get or create the vault key.
 * 
 * @returns {Promise<CryptoKey>} The vault key
 */
export async function getOrCreateVaultKey() {
  let key = await loadVaultKey();
  if (!key) {
    key = await generateVaultKey();
  }
  return key;
}

/**
 * Clear the vault key (call on logout).
 */
export function clearVaultKey() {
  localStorage.removeItem(VAULT_KEY_STORAGE);
}

// ============ ENCRYPTION / DECRYPTION ============

/**
 * Encrypt a message for vault storage.
 * 
 * @param {string} plaintext - The message to encrypt
 * @param {CryptoKey} key - The vault encryption key (optional, will load if not provided)
 * @returns {Promise<string>} Base64-encoded encrypted data (IV + ciphertext)
 */
export async function encryptForVault(plaintext, key = null) {
  if (!key) {
    key = await getOrCreateVaultKey();
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Generate a random IV for each encryption
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the data
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    data
  );
  
  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return arrayBufferToBase64(combined);
}

/**
 * Decrypt a message from vault storage.
 * 
 * @param {string} encryptedBase64 - Base64-encoded encrypted data (IV + ciphertext)
 * @param {CryptoKey} key - The vault encryption key (optional, will load if not provided)
 * @returns {Promise<string>} The decrypted plaintext
 */
export async function decryptFromVault(encryptedBase64, key = null) {
  if (!key) {
    key = await loadVaultKey();
    if (!key) {
      throw new Error('No vault key found. Cannot decrypt.');
    }
  }
  
  // Decode from base64
  const combined = base64ToArrayBuffer(encryptedBase64);
  
  // Extract IV and ciphertext
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  // Decrypt the data
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    ciphertext
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// ============ UTILITY FUNCTIONS ============

/**
 * Convert ArrayBuffer to base64 string.
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Convert base64 string to Uint8Array.
 */
function base64ToArrayBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a random salt for password-based key derivation.
 * Store this with the user's data on the server.
 * 
 * @returns {string} Base64-encoded salt
 */
export function generateSalt() {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  return arrayBufferToBase64(salt);
}
