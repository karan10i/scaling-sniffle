# Ghost Protocol Chat App

A privacy-first, ephemeral chat platform using React (frontend) and Django (backend) with **End-to-End Encryption (E2EE)**, JWT authentication, PostgreSQL, and Redis. Messages are encrypted using Matrix.org's Olm protocol and disappear on logout/refresh unless explicitly saved to a personal vault.

## Features

### Core Privacy Features (Ghost Protocol + E2EE)
- **End-to-End Encryption (E2EE):** All messages are encrypted client-side using Matrix.org's Olm protocol. Server only sees ciphertext.
- **Ephemeral Messaging:** Messages exist only in RAM by default and disappear when users close the tab or logout
- **Silent Save (Vault):** Users can secretly save important messages to a personal vault without alerting the sender
- **No Read Receipts:** Senders don't know when messages are read
- **Volatility First:** The app acts as a "live stream" rather than a "history record"
- **Two-Layer Encryption:** Olm/Megolm for transport (Redis), AES-256-GCM for storage (PostgreSQL vault)

### User Features
- User signup and login (JWT-based, RAM-only session)
- Search for users by username or profile name
- Send friend requests to other users
- View and manage pending friend requests (accept/reject)
- One-way friend relationships (follow model)
- View friends list in sidebar
- Real-time encrypted chat with friends (ephemeral by default)
- Save important messages to personal encrypted vault (📌 Pin feature)
- Delete messages after viewing
- User profile with friend count
- Protected API endpoints with JWT authentication
- PostgreSQL for persistent data (vault, user profiles, friend relationships)
- Redis for ephemeral encrypted messages
- CORS-enabled React-Django communication

## How Encryption Works (Ghost Protocol + E2EE)

### The Core Principle
**The server acts as a blind relay.** It never sees plaintext messages—only encrypted blobs.

### Two Separate Encryption Chains

```
                    ┌─────────────────┐
                    │  User A (React) │
                    └────────┬────────┘
                             │
                    ┌────────▼──────────┐
                    │ Generate Olm Keys │◄──── Identity Key (Curve25519)
                    │ Upload to Server  │      Signing Key (Ed25519)
                    └────────┬──────────┘      10 One-Time Keys
                             │
                    ┌────────▼──────────┐
                    │  Message Sent     │
                    └────────┬──────────┘
                             │
              ┌──────────────┼──────────────┐
              │                             │
        ┌─────▼──────┐            ┌─────────▼──────┐
        │   REDIS    │            │  POSTGRESQL    │
        │  (Ephemeral)            │    (Vault)     │
        │            │            │                │
        │  Olm E2EE  │            │  AES-256-GCM   │
        │  (Transport)            │  (Storage)     │
        │            │            │                │
        │ Encrypted  │            │ Encrypted      │
        │ JSON blob  │            │ blob + metadata│
        └─────┬──────┘            └────────┬───────┘
              │                           │
              │  Auto-deletes             │  Persists
              │  after 7 days             │  Indefinitely
              │                           │
        ┌─────▼──────────────────────────▼──────┐
        │  User B (React)                       │
        │  - Decrypts Olm message (if Redis)   │
        │  - Decrypts AES message (if Vault)   │
        │  - Displays plaintext in UI          │
        └──────────────────────────────────────┘
```

### Message Flow

1. **Ephemeral Messages (Redis + Olm):**
   - User A encrypts with Olm session → `{type, body}` JSON
   - Server stores encrypted JSON in Redis (TTL: 7 days)
   - User B decrypts with Olm session → plaintext
   - Auto-deleted on logout or TTL expiration

2. **Vault Messages (PostgreSQL + AES-256):**
   - User clicks "Save" on ephemeral message
   - Message decrypted from Olm → plaintext
   - Re-encrypted with AES vault key → encrypted blob
   - Server stores encrypted blob in PostgreSQL
   - Deleted from Redis (no longer ephemeral)
   - Only user can decrypt with their vault key

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 14+ & npm
- Docker & Docker Compose (for PostgreSQL and Redis)

### Backend Setup (Django)

1. **Create and activate virtual environment:**
   ```bash
   cd scaling-sniffle
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**
   Create a `.env` file in the `backend` directory:
   ```
   DB_PASSWORD=passwrd
   SECRET_KEY=your_django_secret_key
   ```

4. **Start Docker containers (PostgreSQL & Redis):**
   ```bash
   # From root directory
   docker-compose up -d
   ```

5. **Run database migrations:**
   ```bash
   python manage.py migrate
   ```

6. **Start Django server:**
   ```bash
   python manage.py runserver
   ```
   Server will be available at `http://localhost:8000/`

### Frontend Setup (React)

1. **Navigate to frontend directory and install dependencies:**
   ```bash
   cd scaling-snifle
   npm install
   ```

2. **Install Olm encryption library:**
   ```bash
   npm install @matrix-org/olm
   ```

3. **Start React development server:**
   ```bash
   npm start
   ```
   Frontend will be available at `http://localhost:3000/`

### Quick Start (All in One)

From the root directory:
```bash
# Start Docker containers
docker-compose up -d

# Activate virtual environment
source venv/bin/activate

# Backend setup & run
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver &

# Frontend setup & run (in a new terminal)
cd scaling-snifle
npm install
npm install @matrix-org/olm
npm start
```

## API Endpoints

### Authentication
- `POST /api/signup/` - Register new user
- `POST /api/login/` - Login and get JWT tokens (access + refresh)

### Friend Management
- `GET /api/search-users/?q=query` - Search users by username or profile name
- `POST /api/send-request/` - Send friend request to another user
- `GET /api/pending-requests/` - Get all pending friend requests for current user
- `POST /api/accept-request/` - Accept a friend request
- `POST /api/reject-request/` - Reject a friend request
- `GET /api/list-friends/` - Get list of friends for current user
- `GET /api/profile/` - Get current user's profile information
- `POST /api/add-friend/` - Direct friend add (legacy endpoint)

### Encryption Key Management (Matrix/Olm E2EE)
- `POST /api/keys/upload/` - Upload identity keys + one-time keys after login
- `GET /api/keys/query/<username>/` - Fetch user's public keys to establish encrypted session
- `GET /api/keys/me/` - Check own encryption key status and available one-time keys

### Messaging (Ephemeral - Olm Encrypted)
- `POST /api/send-message/` - Send encrypted message to a friend (stored in Redis)
- `GET /api/get-messages/?user_id=<id>` - Get decrypted messages (ephemeral + vault)
- `POST /api/cleanup-ephemeral/` - Clear all ephemeral messages with a friend

### Vault (Persistent - AES-256 Encrypted)
- `POST /api/save-to-vault/` - Save message to encrypted vault (sender not notified)
- `GET /api/list-vault/` - Get all messages saved in personal vault
- `DELETE /api/delete-from-vault/` - Delete a message from vault

## Environment Variables
Store secrets in `.env` file in the backend directory (not tracked by git):
```
DB_PASSWORD=your_postgres_password
```

## Database Setup

This project uses **PostgreSQL** (persistent storage) and **Redis** (ephemeral messages) with Docker containers:

```bash
# Start PostgreSQL and Redis containers (from root directory)
docker-compose up -d

# Verify containers are running
docker ps

# To stop containers
docker-compose down
```

### PostgreSQL
- **Container:** `chat-postgres`
- **Port:** 5432
- **Database:** `chat_db`
- **User:** `postgres`
- **Password:** `munna123@` (from docker-compose.yml)
- **Data Persistence:** Stored in `postgres_data` volume

### Redis
- **Container:** `chat-redis`
- **Port:** 6379
- **Purpose:** Stores ephemeral messages with automatic expiration (TTL)
- **TTL:** 7 days by default (configured in `redis_util.py`)

### Encryption Models
Two new models store encryption keys:
- **UserKeys:** Stores user's identity key (Curve25519) and signing key (Ed25519)
- **OneTimeKeys:** Stores disposable one-time keys for session establishment
```

## .gitignore
- `.env` - Environment variables with secrets
- `venv/` - Python virtual environment
- `__pycache__/` - Python cache files
- `*.pyc` - Compiled Python files
- `db.sqlite3` - SQLite database (if used)
- `node_modules/` - Node dependencies

## Project Structure
```
scaling-sniffle/
├── backend/                           # Django backend
│   ├── chat/
│   │   ├── models.py                 # Database models (Message, UserKeys, OneTimeKeys, etc.)
│   │   ├── views.py                  # API views (messaging, encryption, vault)
│   │   ├── urls.py                   # API routes
│   │   ├── redis_util.py             # Redis ephemeral message storage
│   │   ├── redis_client.py           # Redis connection
│   │   └── migrations/               # Database migrations
│   ├── manage.py                      # Django management script
│   ├── requirements.txt               # Python dependencies
│   └── backend/settings.py            # Django configuration
├── scaling-snifle/                    # React frontend
│   ├── src/
│   │   ├── App.js                    # Main app component (encryption integration)
│   │   ├── index.js                  # React entry point
│   │   ├── App.css                   # Styles
│   │   ├── components/
│   │   │   ├── Auth.js               # Login/Signup component
│   │   │   ├── ChatWindow.js         # Chat UI component
│   │   │   ├── FriendRequests.js     # Friend request modal
│   │   │   ├── FriendSearch.js       # User search component
│   │   │   └── UserProfile.js        # Profile component
│   │   └── services/
│   │       ├── encryption.js         # Olm initialization & key management
│   │       ├── olmSession.js         # Olm session creation & message encryption/decryption
│   │       └── vaultEncryption.js    # AES-256-GCM vault encryption
│   └── package.json                  # Node dependencies
├── docker-compose.yml                # PostgreSQL & Redis container configuration
├── .env                              # Environment variables (not tracked)
└── README.md                         # This file
```

## How to Use

### Basic Flow
1. **Signup/Login**: Create an account or login with existing credentials
2. **Search Friends**: Click "+ Add Friend" button and search for users by username
3. **Send Request**: Click "Add" button to send friend request
4. **Manage Requests**: Click "Friend Requests" to accept/reject incoming requests
5. **Chat**: Select a friend from the sidebar to open chat window
6. **Send Messages**: Type and send messages in the chat window
7. **Save Important Messages**: Click the "📌 Save" button next to any received message to save it to your vault (sender won't be notified)
8. **View Vault**: Click the "📌 Vault" button in the top bar to see all your saved messages
9. **Delete Messages**: Click the trash icon to delete a message

### Privacy Features
- **Ephemeral Chat**: Close the tab or logout, and all unsaved messages disappear
- **Silent Save**: Save important messages without alerting the sender
- **No History**: The app doesn't keep chat history unless you explicitly save messages

## Ghost Protocol Philosophy

This app follows a "Volatility First" approach:
- **Default Behavior:** No memory. Messages only exist while viewing them.
- **Mental Model:** Like a phone call - once you hang up, words are gone unless you wrote them down.
- **The Vault:** Your private notebook. Only you know what you saved.

### Use Cases
- **Privacy-conscious conversations:** For sensitive discussions where you want deniability
- **Temporary coordination:** Share addresses, meeting times without permanent records
- **Journalistic sources:** Protect sources while keeping critical info for yourself
- **Work collaboration:** Keep important notes while maintaining ephemeral chat

## Technical Details

### Encryption Architecture

#### **Transport Encryption (Redis) - Olm/Megolm**
- **Protocol:** Matrix.org's Olm & Megolm cryptographic ratchets
- **Key Type:** Curve25519 (public) / Ed25519 (signing)
- **Session Type:** Outbound (sender) / Inbound (receiver)
- **Workflow:**
  1. User A fetches User B's public keys from server
  2. User A creates outbound Olm session with User B's keys
  3. User A encrypts message using session
  4. Encrypted `{type, body}` JSON sent to server
  5. Server stores encrypted blob in Redis (no decryption)
  6. User B receives encrypted message from server
  7. User B creates inbound session from message
  8. User B decrypts message using private key
- **Result:** Server only sees ciphertext; plaintext never transmitted unencrypted

#### **Vault Encryption (PostgreSQL) - AES-256-GCM**
- **Algorithm:** AES-256 in Galois/Counter Mode (authenticated encryption)
- **Key Source:** Random 256-bit key OR derived from user password
- **IV:** 12-byte random nonce per message (included in ciphertext)
- **Purpose:** Separate long-term encryption for vault messages
- **Lifecycle:**
  1. User clicks "Save" on a message
  2. Message decrypted from Olm transport encryption
  3. Message re-encrypted with AES vault key
  4. Encrypted blob stored in PostgreSQL
  5. Message deleted from Redis
  6. User retrieves vault → decrypts with vault key

### Data Lifecycle

1. **User Signup/Login:**
   - Olm account created locally in browser
   - Identity keys generated (Curve25519 + Ed25519)
   - 10 one-time keys generated
   - Keys uploaded to server (`/api/keys/upload/`)

2. **Sending Message:**
   - Fetch recipient's public keys from server
   - Create Olm outbound session
   - Encrypt plaintext with session
   - Send `{type, body}` JSON to `/api/send-message/`
   - Server stores encrypted in Redis

3. **Receiving Message:**
   - Fetch messages from `/api/get-messages/`
   - For each Redis message:
     - Parse encrypted JSON `{type, body}`
     - Create inbound session (if needed)
     - Decrypt with private key
     - Display plaintext in UI

4. **Saving to Vault:**
   - User clicks "Save" on message
   - Message content decrypted (if from Redis)
   - Re-encrypt with AES vault key
   - Send to `/api/save-to-vault/`
   - Server stores encrypted blob in PostgreSQL
   - Delete from Redis (move from ephemeral to persistent)

5. **Logout/Tab Close:**
   - Call `/api/cleanup-ephemeral/` → Redis entries deleted
   - Clear Olm sessions from RAM
   - Clear vault key from localStorage (unless "Remember me")
   - Only vault messages persist for next login

### Database Models
- **User:** Built-in Django authentication (username, password)
- **Profile:** Custom user profile (display name, avatar)
- **Friend:** One-way friendship relationships
- **FriendRequest:** Pending/accepted/rejected friend requests
- **Message:** Encrypted messages with vault tracking
- **UserKeys:** Public identity & signing keys
- **OneTimeKeys:** Disposable keys for session establishment

## Next Steps & Future Enhancements
- WebSocket/Socket.io for real-time message delivery
- Megolm support for group chats with multi-recipient encryption
- Message expiration timers (auto-delete after X minutes)
- User avatars and profile pictures
- Group chats with encrypted group sessions
- Export vault to encrypted file backup
- QR code device verification (like Signal)
- Message reactions and replies
- Typing indicators (with forward secrecy)
- Read receipts (optional, with privacy toggle)

## Contributing
Pull requests are welcome. For major changes, open an issue first.

## License
MIT
