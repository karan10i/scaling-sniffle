/**
 * Olm Session Management Service
 * 
 * This module manages encrypted sessions between users.
 * Each session is a secure channel for message encryption/decryption.
 * 
 * Flow:
 * 1. User A wants to message User B
 * 2. User A fetches User B's public keys from server
 * 3. User A creates an "outbound" session using B's keys
 * 4. User A encrypts message and sends it
 * 5. User B receives encrypted message
 * 6. User B creates an "inbound" session from the message
 * 7. User B decrypts the message
 */

import Olm from "@matrix-org/olm";
import { getOlmAccount, isOlmInitialized } from "./encryption";

// ============ STATE ============

// Map of friendId -> pickled session string
const olmSessions = {};

// Storage key prefix for localStorage persistence
const SESSION_STORAGE_PREFIX = 'olm_session_';

// ============ SESSION MANAGEMENT ============

/**
 * Create an outbound session to send messages to a friend.
 * Call this before sending the first message to a friend.
 * 
 * @param {string} friendId - The friend's user ID
 * @param {string} friendIdentityKey - Friend's Curve25519 identity key
 * @param {string} friendOneTimeKey - Friend's one-time key (consumed after use)
 * @returns {Olm.Session} The created session
 */
export function createOutboundSession(friendId, friendIdentityKey, friendOneTimeKey) {
  if (!isOlmInitialized()) {
    throw new Error('Olm not initialized. Call initializeOlm() first.');
  }

  const account = getOlmAccount();
  const session = new Olm.Session();
  
  try {
    // Create outbound session using friend's keys
    session.create_outbound(account, friendIdentityKey, friendOneTimeKey);
    
    // Store the session
    olmSessions[friendId] = session;
    saveSession(friendId, session);
    
    console.log(`Created outbound session with friend ${friendId}`);
    return session;
  } catch (error) {
    console.error('Failed to create outbound session:', error);
    session.free();
    throw error;
  }
}

/**
 * Create an inbound session from a received message.
 * Call this when receiving a "pre-key" message (type 0) from a new sender.
 * 
 * @param {string} friendId - The friend's user ID
 * @param {string} friendIdentityKey - Friend's Curve25519 identity key
 * @param {string} messageBody - The encrypted message body (pre-key message)
 * @returns {Olm.Session} The created session
 */
export function createInboundSession(friendId, friendIdentityKey, messageBody) {
  if (!isOlmInitialized()) {
    throw new Error('Olm not initialized. Call initializeOlm() first.');
  }

  const account = getOlmAccount();
  const session = new Olm.Session();
  
  try {
    // Create inbound session from the pre-key message
    session.create_inbound_from(account, friendIdentityKey, messageBody);
    
    // Remove the one-time key that was used (prevents replay attacks)
    account.remove_one_time_keys(session);
    
    // Store the session
    olmSessions[friendId] = session;
    saveSession(friendId, session);
    
    console.log(`Created inbound session with friend ${friendId}`);
    return session;
  } catch (error) {
    console.error('Failed to create inbound session:', error);
    session.free();
    throw error;
  }
}

/**
 * Get an existing session with a friend.
 * 
 * @param {string} friendId - The friend's user ID
 * @returns {Olm.Session|null} The session, or null if none exists
 */
export function getSession(friendId) {
  // Check in-memory cache first
  if (olmSessions[friendId]) {
    return olmSessions[friendId];
  }
  
  // Try to restore from localStorage
  const restored = restoreSession(friendId);
  if (restored) {
    olmSessions[friendId] = restored;
    return restored;
  }
  
  return null;
}

/**
 * Check if a session exists with a friend.
 * 
 * @param {string} friendId - The friend's user ID
 * @returns {boolean}
 */
export function hasSession(friendId) {
  return getSession(friendId) !== null;
}

/**
 * Clear a session with a friend.
 * 
 * @param {string} friendId - The friend's user ID
 */
export function clearSession(friendId) {
  if (olmSessions[friendId]) {
    olmSessions[friendId].free();
    delete olmSessions[friendId];
  }
  localStorage.removeItem(SESSION_STORAGE_PREFIX + friendId);
  console.log(`Cleared session with friend ${friendId}`);
}

/**
 * Clear all sessions (call on logout).
 */
export function clearAllSessions() {
  Object.keys(olmSessions).forEach(friendId => {
    olmSessions[friendId].free();
    localStorage.removeItem(SESSION_STORAGE_PREFIX + friendId);
  });
  Object.keys(olmSessions).forEach(key => delete olmSessions[key]);
  console.log('Cleared all Olm sessions');
}

// ============ ENCRYPTION / DECRYPTION ============

/**
 * Encrypt a message for a friend.
 * 
 * @param {string} friendId - The friend's user ID
 * @param {string} plaintext - The message to encrypt
 * @returns {Object} { type: 0|1, body: "..." }
 *   - type 0: Pre-key message (first message, contains session setup data)
 *   - type 1: Normal message
 */
export function encryptMessage(friendId, plaintext) {
  const session = getSession(friendId);
  if (!session) {
    throw new Error(`No session exists with friend ${friendId}. Create one first.`);
  }
  
  const encrypted = session.encrypt(plaintext);
  
  // Save session state after encryption (ratchet advances)
  saveSession(friendId, session);
  
  return {
    type: encrypted.type,
    body: encrypted.body,
  };
}

/**
 * Decrypt a message from a friend.
 * 
 * @param {string} friendId - The friend's user ID
 * @param {number} messageType - 0 for pre-key message, 1 for normal message
 * @param {string} messageBody - The encrypted message body
 * @param {string} senderIdentityKey - Sender's identity key (needed for type 0 messages)
 * @returns {string} The decrypted plaintext
 */
export function decryptMessage(friendId, messageType, messageBody, senderIdentityKey = null) {
  let session = getSession(friendId);
  
  // If this is a pre-key message (type 0) and we don't have a session,
  // create an inbound session from it
  if (messageType === 0 && !session) {
    if (!senderIdentityKey) {
      throw new Error('senderIdentityKey required for pre-key messages without existing session');
    }
    session = createInboundSession(friendId, senderIdentityKey, messageBody);
  }
  
  if (!session) {
    throw new Error(`No session exists with friend ${friendId}`);
  }
  
  try {
    const plaintext = session.decrypt(messageType, messageBody);
    
    // Save session state after decryption (ratchet advances)
    saveSession(friendId, session);
    
    return plaintext;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw error;
  }
}

// ============ PERSISTENCE ============

/**
 * Save a session to localStorage.
 */
function saveSession(friendId, session) {
  try {
    const pickled = session.pickle('DEFAULT_KEY');
    localStorage.setItem(SESSION_STORAGE_PREFIX + friendId, pickled);
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

/**
 * Restore a session from localStorage.
 */
function restoreSession(friendId) {
  try {
    const pickled = localStorage.getItem(SESSION_STORAGE_PREFIX + friendId);
    if (!pickled) return null;
    
    const session = new Olm.Session();
    session.unpickle('DEFAULT_KEY', pickled);
    return session;
  } catch (error) {
    console.error('Failed to restore session:', error);
    return null;
  }
}

// ============ UTILITY ============

/**
 * Check if a message matches our session (for inbound session creation).
 */
export function matchesInboundSession(friendId, messageBody) {
  const session = getSession(friendId);
  if (!session) return false;
  
  return session.matches_inbound(messageBody);
}
