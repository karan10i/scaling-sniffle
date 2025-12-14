/**
 * Olm Encryption Service
 * 
 * This module handles Matrix-style End-to-End Encryption using the Olm library.
 * The encryption happens client-side; the server only sees encrypted blobs.
 * 
 * Key Concepts:
 * - Identity Keys: Long-term public keys for user identification
 * - One-Time Keys (OTK): Disposable keys for initial session establishment
 * - Olm Sessions: Encrypted channels between two users
 */

import Olm from "@matrix-org/olm";

// ============ STATE ============
let olmAccount = null;
let isInitialized = false;

// Storage keys for localStorage persistence
const STORAGE_KEYS = {
  ACCOUNT: 'olm_account',
  IDENTITY_KEYS: 'olm_identity_keys',
};

// ============ INITIALIZATION ============

/**
 * Initialize the Olm library and create/restore an account.
 * Call this once when the app starts (after user logs in).
 */
export async function initializeOlm() {
  if (isInitialized) {
    console.log('Olm already initialized');
    return;
  }

  try {
    // Initialize the Olm WASM module
    await Olm.init();
    console.log('Olm WASM loaded successfully');

    // Create a new Olm account
    olmAccount = new Olm.Account();

    // Try to restore existing account from localStorage
    const savedAccount = localStorage.getItem(STORAGE_KEYS.ACCOUNT);
    if (savedAccount) {
      olmAccount.unpickle('DEFAULT_KEY', savedAccount);
      console.log('Olm account restored from storage');
    } else {
      // Create a new account (generates identity keys)
      olmAccount.create();
      console.log('New Olm account created');
      // Save to localStorage
      saveAccount();
    }

    isInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize Olm:', error);
    throw error;
  }
}

/**
 * Save the current account state to localStorage.
 * Called after any operation that modifies account state.
 */
function saveAccount() {
  if (olmAccount) {
    const pickled = olmAccount.pickle('DEFAULT_KEY');
    localStorage.setItem(STORAGE_KEYS.ACCOUNT, pickled);
  }
}

/**
 * Clear all Olm data (call on logout).
 */
export function clearOlmData() {
  if (olmAccount) {
    olmAccount.free();
    olmAccount = null;
  }
  localStorage.removeItem(STORAGE_KEYS.ACCOUNT);
  localStorage.removeItem(STORAGE_KEYS.IDENTITY_KEYS);
  isInitialized = false;
  console.log('Olm data cleared');
}

// ============ KEY MANAGEMENT ============

/**
 * Get the user's identity keys.
 * These are long-term public keys that identify the user.
 * 
 * @returns {Object} { curve25519: "...", ed25519: "..." }
 */
export function getIdentityKeys() {
  if (!olmAccount) {
    throw new Error('Olm not initialized. Call initializeOlm() first.');
  }
  
  const keys = JSON.parse(olmAccount.identity_keys());
  return {
    identityKey: keys.curve25519,  // For encryption
    signingKey: keys.ed25519,      // For signatures
  };
}

/**
 * Generate one-time keys (OTKs) for initial session establishment.
 * Each OTK can only be used once by another user to start a conversation.
 * 
 * @param {number} count - Number of OTKs to generate (default: 10)
 * @returns {Object} { keyId: keyValue, ... }
 */
export function generateOneTimeKeys(count = 10) {
  if (!olmAccount) {
    throw new Error('Olm not initialized. Call initializeOlm() first.');
  }
  
  olmAccount.generate_one_time_keys(count);
  const otks = JSON.parse(olmAccount.one_time_keys());
  
  // Save account after generating keys
  saveAccount();
  
  return otks.curve25519;
}

/**
 * Mark one-time keys as published (sent to server).
 * This prevents re-uploading the same keys.
 */
export function markKeysAsPublished() {
  if (!olmAccount) {
    throw new Error('Olm not initialized. Call initializeOlm() first.');
  }
  
  olmAccount.mark_keys_as_published();
  saveAccount();
}

/**
 * Get the maximum number of one-time keys the account can store.
 */
export function maxNumberOfOneTimeKeys() {
  if (!olmAccount) {
    throw new Error('Olm not initialized. Call initializeOlm() first.');
  }
  
  return olmAccount.max_number_of_one_time_keys();
}

// ============ UTILITY ============

/**
 * Check if Olm is initialized.
 */
export function isOlmInitialized() {
  return isInitialized;
}

/**
 * Get the raw Olm account (for advanced use cases).
 */
export function getOlmAccount() {
  return olmAccount;
}