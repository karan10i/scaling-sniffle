# Ghost Protocol Chat App

A privacy-first, ephemeral chat platform using React (frontend) and Django (backend) with JWT authentication and PostgreSQL database. Messages disappear on logout/refresh unless explicitly saved to a personal vault.

## Features

### Core Privacy Features (Ghost Protocol)
- **Ephemeral Messaging:** Messages exist only in RAM by default and disappear when users close the tab or logout
- **Silent Save (Vault):** Users can secretly save important messages to a personal vault without alerting the sender
- **No Read Receipts:** Senders don't know when messages are read
- **Volatility First:** The app acts as a "live stream" rather than a "history record"

### User Features
- User signup and login (JWT-based, RAM-only session)
- Search for users by username or profile name
- Send friend requests to other users
- View and manage pending friend requests (accept/reject)
- One-way friend relationships (follow model)
- View friends list in sidebar
- Real-time chat with friends (ephemeral by default)
- Save important messages to personal vault (📌 Pin feature)
- Delete messages after viewing
- User profile with friend count
- Protected API endpoints with JWT authentication
- PostgreSQL for persistent data (vault, user profiles, friend relationships)
- CORS-enabled React-Django communication

## Getting Started

### Backend (Django)
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Set up PostgreSQL and update `.env` with your DB credentials.
3. Run migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```
4. Start server:
   ```bash
   python manage.py runserver
   ```

### Frontend (React)
1. Navigate to frontend directory:
   ```bash
   cd scaling-snifle
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start React app:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `/api/signup/` - Register new user
- `/api/login/` - Login and get JWT token

### Friend Management
- `/api/search-users/` - Search users by username or profile name
- `/api/send-request/` - Send friend request to another user
- `/api/pending-requests/` - Get all pending friend requests for current user
- `/api/accept-request/` - Accept a friend request
- `/api/reject-request/` - Reject a friend request
- `/api/list-friends/` - Get list of friends for current user
- `/api/profile/` - Get current user's profile information

### Messaging (Ephemeral)
- `/api/send-message/` - Send a message to a friend
- `/api/get-messages/` - Get messages between current user and another user (ephemeral)
- `/api/mark-seen/` - Mark messages as seen
- `/api/delete-message/` - Delete a message (receiver only)

### Vault (Silent Save)
- `/api/save-to-vault/` - Save a message to personal vault (sender not notified)
- `/api/list-vault/` - List all saved messages in vault
- `/api/delete-from-vault/` - Delete a message from vault

## Environment Variables
Store secrets in `.env` file in the backend directory (not tracked by git):
```
DB_PASSWORD=your_postgres_password
```

## Database Setup
This project uses PostgreSQL with OrbStack Docker container:
```bash
# Start PostgreSQL container
docker start signin-signup
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
├── backend/                 # Django backend
│   ├── chat/               # Chat app with models and views
│   ├── manage.py           # Django management script
│   └── requirements.txt    # Python dependencies
└── scaling-snifle/         # React frontend
    ├── src/
    │   ├── App.js         # Main app component
    │   ├── components/    # React components
    │   └── index.js       # Entry point
    └── package.json       # Node dependencies
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

### Data Lifecycle
1. **Sending:** Message stored temporarily in database
2. **Viewing:** Message displayed to receiver
3. **Silent Save:** Receiver can save to vault (sender unaware)
4. **Logout/Close:** All unsaved messages deleted from database
5. **Relogin:** Only vault messages remain

### Database Models
- **User:** Built-in Django authentication
- **Profile:** Custom user profile with display name
- **Friend:** One-way friendship relationships
- **FriendRequest:** Pending/accepted/rejected friend requests
- **Message:** Ephemeral messages with `seen`, `is_saved`, and `saved_by` fields

## Next Steps
- WebSocket/Socket.io for real-time message delivery
- Optional end-to-end encryption for vault
- Message expiration timers (auto-delete after X minutes)
- User avatars and profiles
- Group chats with ephemeral group messages
- Export vault to encrypted file

## Contributing
Pull requests are welcome. For major changes, open an issue first.

## License
MIT
