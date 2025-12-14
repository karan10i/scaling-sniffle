# Quick Start Guide - Ghost Protocol Chat App

## Prerequisites
- **Python 3.8+** - Backend runtime
- **Node.js 14+** & **npm** - Frontend runtime
- **Docker & Docker Compose** - Database containers
- **Git** - Version control

## Installation & Startup (5 minutes)

### Option 1: Full Automated Setup

```bash
# 1. Clone the repository
cd /path/to/scaling-sniffle

# 2. Start Docker containers (PostgreSQL + Redis)
docker-compose up -d

# 3. Verify containers are running
docker ps
# You should see: chat-postgres and chat-redis

# 4. Set up virtual environment
python3 -m venv venv
source venv/bin/activate

# 5. Install backend dependencies
cd backend
pip install -r requirements.txt

# 6. Run migrations
python manage.py migrate

# 7. Start Django server
python manage.py runserver
# Server will be at http://localhost:8000/

# 8. In a NEW terminal, set up frontend
source venv/bin/activate  # Reactivate venv
cd scaling-snifle
npm install
npm install @matrix-org/olm
npm start
# Frontend will be at http://localhost:3000/
```

### Option 2: Step-by-Step

#### Backend Setup

```bash
# Navigate to project root
cd /path/to/scaling-sniffle

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate  # Windows

# Navigate to backend
cd backend

# Install dependencies
pip install -r requirements.txt

# Ensure database is running
# (From project root: docker-compose up -d)

# Run migrations
python manage.py migrate

# Start server
python manage.py runserver
```

**Expected output:**
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

#### Frontend Setup

Open a NEW terminal and:

```bash
# Navigate to frontend directory
cd /path/to/scaling-sniffle/scaling-snifle

# Install dependencies
npm install

# Install encryption library
npm install @matrix-org/olm

# Start development server
npm start
```

**Expected output:**
```
Compiled successfully!
You can now view scaling-snifle in the browser.
Local: http://localhost:3000
```

## Testing the App

### 1. Create Accounts
- Go to http://localhost:3000/
- Click "Signup"
- Create two accounts:
  - **Alice**: username `alice`, password `alice123`
  - **Bob**: username `bob`, password `bob123`

### 2. Send Encrypted Message
- **Alice's browser:**
  - Log in as Alice
  - Click "+ Add Friend"
  - Search "bob"
  - Click "Add"
  - Wait for friend request approval

- **Bob's browser:**
  - Log in as Bob in a different browser/incognito window
  - Click "Friend Requests"
  - Accept Alice's request
  - Select Alice from friends list

- **Alice's browser:**
  - Click on Bob in friends list
  - Type a message: "Hello Bob!"
  - Click "Send"
  - Verify: Status bar shows "🔒 E2E Encrypted"

- **Bob's browser:**
  - Message appears decrypted: "Hello Bob!"

### 3. Save to Vault
- **Bob's browser:**
  - Click "📌 Save" on Alice's message
  - Message border turns green (saved)

- **Bob logs out and back in:**
  - Message still there in green (persisted in vault)
  - Original ephemeral message gone

### 4. Verify Encryption (Advanced)
- Open browser DevTools (F12)
- Go to **Network** tab
- Send message from Alice
- Check `/send-message/` request
- **content** field will show:
  ```
  {"type":0,"body":"long base64 string"}
  ```
  This is encrypted with Olm! 🔐

## Troubleshooting

### Docker Issues
```bash
# Check if containers are running
docker ps

# View container logs
docker logs chat-postgres
docker logs chat-redis

# Restart containers
docker-compose down
docker-compose up -d
```

### Backend Issues
```bash
# Test database connection
python manage.py dbshell  # Should connect to PostgreSQL

# Check migrations
python manage.py showmigrations

# Verify Olm library is installed (frontend only)
cd scaling-snifle
npm list @matrix-org/olm
```

### Frontend Issues
```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm install @matrix-org/olm

# Check for port conflicts
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows
```

### Port Already in Use
```bash
# Change port (if 3000 is occupied)
PORT=3001 npm start

# Or specify backend URL in frontend
# (In src/App.js, change http://localhost:8000 URLs)
```

## Project Architecture

```
Browser (http://localhost:3000)
    ↓
  React Frontend
    ├─ App.js (encryption integration)
    ├─ Components (Chat, Auth, Friends)
    └─ Services (encryption.js, olmSession.js, vaultEncryption.js)
    ↓
  HTTP/REST API (http://localhost:8000/api/)
    ↓
  Django Backend
    ├─ Views (message handling, key management)
    ├─ Models (User, Message, UserKeys, OneTimeKeys)
    └─ Database
        ├─ PostgreSQL (persistent vault messages)
        └─ Redis (ephemeral encrypted messages)
```

## Key Features to Try

1. **Ephemeral Messaging**
   - Messages disappear on logout
   - See TTL countdown in Redis

2. **Silent Save**
   - Save message without sender knowing
   - Only you can decrypt vault messages

3. **E2E Encryption**
   - All messages encrypted client-side
   - Server never sees plaintext

4. **Friend System**
   - One-way follows (like Twitter)
   - Friend requests required

5. **Security Indicators**
   - "🔒 E2E Encrypted" when ready
   - "⚠️ Unencrypted" if no keys

## Next Steps

- Read [ENCRYPTION_IMPLEMENTATION.md](./ENCRYPTION_IMPLEMENTATION.md) for technical details
- Check [README.md](./README.md) for full feature list
- Explore API endpoints in Django admin (`http://localhost:8000/admin`)
- Try multi-device messaging (open in multiple browsers)

## Useful Commands

```bash
# Backend
cd backend
python manage.py runserver 8001  # Run on different port
python manage.py shell           # Django interactive shell
python manage.py createsuperuser # Create admin account

# Frontend
npm start      # Start dev server
npm run build  # Create production build
npm test       # Run tests

# Database
docker exec chat-postgres psql -U postgres -d chat_db  # PostgreSQL CLI
docker exec chat-redis redis-cli  # Redis CLI
```

## Support

If you encounter issues:
1. Check console errors (browser DevTools: F12)
2. Check server logs (terminal running Django)
3. Verify Docker containers are running (`docker ps`)
4. Try clearing browser cache and localStorage
5. Restart all services and try again

Happy chatting! 🔐
