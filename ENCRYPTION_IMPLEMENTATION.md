# End-to-End Encryption Implementation

## Overview

This document describes the Matrix.org Olm-based E2EE implementation integrated into the Ghost Protocol Chat App.

## Architecture

### High-Level Flow

```
┌─────────────┐                                      ┌─────────────┐
│   User A    │                                      │   User B    │
└──────┬──────┘                                      └──────┬──────┘
       │                                                    │
       │ 1. Generate Olm keys                             │
       │    - Identity Key (Curve25519)                   │
       │    - Signing Key (Ed25519)                       │
       │    - 10 One-Time Keys                            │
       │                                                    │
       ├──────────────────────────────────────────────────┤
       │ 2. Upload keys to /api/keys/upload/              │
       │    (Server: No decryption, just storage)         │
       │                                                    │
       ├─────────────────────────────────────────────────►│
       │ 3. Want to send message                          │
       │    GET /api/keys/query/userB/                    │
       │    (Get B's identity key + one OTK)              │
       │                                                    │
       │ 4. Create Olm outbound session                   │
       │                                                    │
       │ 5. Encrypt: plaintext → {type, body}             │
       │    Send to /api/send-message/                    │
       │    Content: JSON.stringify({type, body})         │
       │                                                    │
       │ Server: Stores encrypted JSON in Redis           │
       │         (TTL: 7 days)                            │
       │                                                    │
       │                     (encrypted)                  │
       │◄──────────────────────────────────────────────────┤
       │                                                    │
       │                                                   │ 6. Fetch from
       │                                                   │    /api/get-messages/
       │                                                   │
       │                                                   │ 7. Parse encrypted
       │                                                   │    JSON {type, body}
       │                                                   │
       │                                                   │ 8. Create inbound
       │                                                   │    session (if needed)
       │                                                   │
       │                                                   │ 9. Decrypt message
       │                                                   │    plaintext ← {type, body}
       │                                                   │
       │                                                   │ 10. Display plaintext
       │                                                   │     in UI
```

## Implementation Details

### Backend (Django)

#### New Models

**UserKeys** - Stores public keys for encryption
```python
class UserKeys(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    identity_key = models.CharField(max_length=255)  # Curve25519
    signing_key = models.CharField(max_length=255)   # Ed25519
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**OneTimeKeys** - Disposable keys for X3DH handshake
```python
class OneTimeKeys(models.Model):
    user = models.ForeignKey(User, related_name='one_time_keys', on_delete=models.CASCADE)
    key_id = models.CharField(max_length=50)
    key_value = models.CharField(max_length=255)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
```

#### New API Endpoints

**1. `POST /api/keys/upload/`**
- Upload user's identity keys + one-time keys after login
- Called once per login session
- Generates 10 OTKs for other users to use

**Request:**
```json
{
  "identityKey": "base64...",
  "signingKey": "base64...",
  "oneTimeKeys": {
    "AAAAAQ": "base64...",
    "AAAAAg": "base64...",
    // ... 10 total
  }
}
```

**Response:**
```json
{
  "message": "Keys registered successfully",
  "oneTimeKeysAdded": 10
}
```

**2. `GET /api/keys/query/<username>/`**
- Fetch user's public keys to establish session
- Returns their identity key + one available OTK
- Marks OTK as used (prevents replay)

**Response:**
```json
{
  "identityKey": "base64...",
  "signingKey": "base64...",
  "oneTimeKey": "base64...",
  "oneTimeKeyId": "AAAAAQ"
}
```

**3. `GET /api/keys/me/`**
- Check own key status
- Returns available OTK count
- Used to trigger replenishment if count < threshold

### Frontend (React)

#### Service: `encryption.js`
**Purpose:** Core Olm library initialization and key management

**Key Functions:**
- `initializeOlm()` - Load WASM, create/restore account
- `getIdentityKeys()` - Get user's public keys
- `generateOneTimeKeys(count)` - Generate new OTKs
- `markKeysAsPublished()` - Mark OTKs as uploaded
- `clearOlmData()` - Clean up on logout

**Storage:**
- Account pickled to `localStorage: olm_account`
- Survives page refresh within same browser
- Cleared on logout

#### Service: `olmSession.js`
**Purpose:** Manage encrypted sessions between users

**Key Functions:**

**Session Creation:**
- `createOutboundSession(friendId, friendIdentityKey, friendOTK)`
  - Called before sending first message
  - Stores session in `olmSessions[friendId]`
  - Persists to localStorage

- `createInboundSession(friendId, friendIdentityKey, messageBody)`
  - Called on receiving pre-key message (type 0)
  - Extracts setup from message itself
  - One-time key consumed (prevents replay)

**Encryption/Decryption:**
- `encryptMessage(friendId, plaintext)` → `{type, body}`
  - type 0: Pre-key message (session setup data included)
  - type 1: Normal message (setup already done)
  - Advances ratchet, saves session state

- `decryptMessage(friendId, type, body, [senderKey])` → plaintext
  - Auto-creates inbound session for type 0 messages
  - Verifies message authenticity
  - Advances ratchet, saves session state

**Session Management:**
- `hasSession(friendId)` - Check if session exists
- `getSession(friendId)` - Retrieve session
- `clearSession(friendId)` - Delete specific session
- `clearAllSessions()` - Delete all sessions (logout)

**Storage:**
- Sessions pickled to `localStorage: olm_session_<friendId>`
- In-memory cache for performance
- Restored on demand

#### Service: `vaultEncryption.js`
**Purpose:** Encrypt messages saved to vault (separate from transport)

**Algorithm:** AES-256-GCM (authenticated encryption)

**Key Functions:**

**Key Management:**
- `generateVaultKey()` - Create random 256-bit key
- `deriveVaultKeyFromPassword(password, salt)` - Key from password
- `getOrCreateVaultKey()` - Get or generate
- `saveVaultKey(key)` - Export to localStorage
- `loadVaultKey()` - Import from localStorage
- `clearVaultKey()` - Delete (logout)

**Encryption/Decryption:**
- `encryptForVault(plaintext, [key])` → base64(IV + ciphertext)
  - 12-byte random IV per message
  - Authenticated encryption
  - IV included in output

- `decryptFromVault(encryptedBase64, [key])` → plaintext
  - Extracts IV from ciphertext
  - Verifies authentication tag
  - Throws on tampering

**Utility:**
- `generateSalt()` - Create random salt for PBKDF2

#### App Integration (`App.js`)

**Initialization:**
```javascript
React.useEffect(() => {
  if (token) {
    initializeEncryption(token);
  }
}, [token, initializeEncryption]);
```

**On Login:**
1. Call `initializeOlm()`
2. Generate 10 OTKs
3. Upload to `/api/keys/upload/`
4. Initialize vault key
5. Set encryption status to "ready"

**On Message Send:**
1. Ensure session exists with friend
2. Encrypt with `encryptMessage(friendId, plaintext)`
3. Send `{type, body}` JSON as content
4. Display plaintext in UI (local)

**On Message Receive:**
1. Fetch from `/api/get-messages/`
2. For each Redis message:
   - Parse `{type, body}` JSON
   - Create inbound session if needed
   - Decrypt with `decryptMessage()`
   - Display plaintext
3. For vault messages:
   - Decrypt with `decryptFromVault()`
   - Display plaintext

**On Save to Vault:**
1. Get plaintext from decrypted message
2. Encrypt with `encryptForVault(plaintext)`
3. Send encrypted blob to `/api/save-to-vault/`
4. Server moves from Redis to PostgreSQL
5. Mark as "Saved" in UI

**On Logout:**
1. Call `clearAllSessions()` - Delete all Olm sessions
2. Call `clearOlmData()` - Delete Olm account
3. Call `clearVaultKey()` - Delete vault key
4. Call cleanup endpoints

## Security Properties

### Forward Secrecy
- Olm uses ratcheting algorithm
- Compromised session key doesn't expose past messages
- Each message has unique key material

### Deniability
- Messages don't include signatures
- Recipient can't prove sender sent it
- No "read receipts" (user can't prove they saw it)

### Authentication
- Identity keys verify user identity
- Pre-key signatures prevent impersonation
- One-time key consumption prevents replay

### Privacy
- Server never sees plaintext
- Server can't correlate message content
- No metadata exposure (only sees sender/receiver IDs)

## Message Format

### Redis (Ephemeral)
```javascript
// Stored in Redis key: `chat:{sender_id}:{receiver_id}`
{
  "sender_id": 123,
  "receiver_id": 456,
  "content": "{\"type\":0,\"body\":\"base64...\"}"  // Encrypted JSON
}
```

TTL: 7 days → auto-deleted

### PostgreSQL (Vault)
```
Message table:
- sender: User (FK)
- receiver: User (FK)
- content: "base64..." (AES-encrypted)
- timestamp: DateTime
- saved_by_sender: Boolean
- saved_by_receiver: Boolean
```

Persistent until user deletes

## Error Handling

### Missing Keys
- User hasn't uploaded keys yet
- Response: 404 "User has not uploaded encryption keys"
- Frontend: Show "Waiting for encryption..." and retry

### No One-Time Keys
- User ran out of OTKs
- Response: 400 "No one-time keys available"
- Frontend: Suggest user login again to replenish

### Decryption Failure
- Message tampered, corrupted, or wrong key
- Catch error, show "[Decryption failed]"
- Don't crash app

### Session Mismatch
- Sender/receiver keys don't match
- Catch error, log for debugging
- Suggest users logout/login to reset

## Performance Considerations

### Olm Initialization
- WASM module: ~500KB
- Init time: ~100-500ms
- Called once on login (acceptable)

### Encryption/Decryption
- Per-message time: ~1-5ms (negligible)
- No noticeable UI delay

### Session Storage
- In-memory cache for active sessions
- localStorage for persistence (survives reload)
- Max sessions: Usually 1-10 friends at a time

### Network
- No additional server round-trips
- Keys cached in browser after first fetch
- OTK consumption is minimal

## Testing

### Manual Testing
1. Create two accounts (Alice, Bob)
2. Alice sends message to Bob
   - Check Redis has encrypted JSON
   - Check decrypted text in Bob's UI
3. Bob saves message to vault
   - Check PostgreSQL has AES-encrypted content
   - Check Redis entry deleted
4. Bob logs out and logs back in
   - Vault message should still be there
   - Ephemeral messages deleted
5. Verify encryption status indicator shows "🔒 E2E Encrypted"

### Edge Cases
- Logout before OTKs replenished → next login rejects
- Same user on multiple devices → separate sessions
- Network failure during key upload → retry on reconnect

## Future Enhancements

1. **Megolm for Groups**
   - One-to-many encryption
   - Efficient group chat

2. **Device Verification**
   - QR code scanning
   - Emoji comparison
   - Security code display

3. **Key Backup**
   - Export encrypted vault
   - Secure recovery codes
   - Cross-device restore

4. **Message Expiration**
   - Timed deletion
   - Burn after read
   - Custom TTLs

5. **Perfect Forward Secrecy**
   - Session ratcheting
   - Per-message keys
   - Ratchet refresh interval

## References

- [Matrix.org Olm](https://gitlab.matrix.org/matrix-org/olm)
- [Olm Specification](https://gitlab.matrix.org/matrix-org/olm/-/blob/master/docs/olm.md)
- [Double Ratchet Algorithm](https://signal.org/docs/specifications/doubleratchet/)
- [X3DH Key Exchange](https://signal.org/docs/specifications/x3dh/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
