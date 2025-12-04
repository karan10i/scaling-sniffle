# Chat App

A full-stack chat application using React (frontend) and Django (backend) with JWT authentication and PostgreSQL database.

## Features
- User signup and login (JWT-based, RAM-only session)
- Search for users by username or profile name
- Send friend requests to other users
- View and manage pending friend requests (accept/reject)
- One-way friend relationships (follow model)
- View friends list in sidebar
- Chat UI interface (messaging UI ready, live messaging deferred)
- User profile with friend count
- Protected API endpoints with JWT authentication
- PostgreSQL for user, profile, friend, and friend request data
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
- `/api/signup/` - Register new user
- `/api/login/` - Login and get JWT token
- `/api/search-users/` - Search users by username or profile name
- `/api/send-request/` - Send friend request to another user
- `/api/pending-requests/` - Get all pending friend requests for current user
- `/api/accept-request/` - Accept a friend request
- `/api/reject-request/` - Reject a friend request
- `/api/list-friends/` - Get list of friends for current user
- `/api/profile/` - Get current user's profile information
- `/api/add-friend/` - Add friend directly (legacy endpoint)

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
1. **Signup/Login**: Create an account or login with existing credentials
2. **Search Friends**: Click "+ Add Friend" button and search for users by username
3. **Send Request**: Click "Add" button to send friend request
4. **Manage Requests**: Click "Friend Requests" to accept/reject incoming requests
5. **Chat**: Select a friend from the sidebar to open chat window

## Next Steps
- Real-time messaging with WebSocket/Socket.io
- Message persistence and history
- User avatars and profiles
- Group chats
- Message notifications

## Contributing
Pull requests are welcome. For major changes, open an issue first.

## License
MIT
