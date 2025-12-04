# Chat App

A full-stack chat application using React (frontend) and Django (backend) with JWT authentication and PostgreSQL database.

## Features
- User signup and login (JWT-based, RAM-only session)
- Add friends by username
- Protected API endpoints
- PostgreSQL for user and friend data
- React UI for authentication and chat

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
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start React app:
   ```bash
   npm start
   ```

## API Endpoints
- `/api/signup/` - Register new user
- `/api/login/` - Login and get JWT

## Environment Variables
- Store secrets in `.env` (not tracked by git)

## .gitignore
- `.env`
- `venv/`
- `__pycache__/`
- `*.pyc`
- `db.sqlite3`

## Contributing
Pull requests are welcome. For major changes, open an issue first.

## License
MIT
