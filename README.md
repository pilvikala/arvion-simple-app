# Simple Web App

Full-stack starter with a FastAPI backend, Postgres database, and React (Vite + TypeScript) frontend featuring a login flow.

## Stack
- **Backend:** FastAPI, SQLAlchemy, Passlib
- **Database:** Postgres 15
- **Frontend:** React 18 + Vite + TypeScript
- **Tooling:** Docker Compose for local orchestration

## Getting Started

### 1. Environment variables
Copy the example file and update secrets if needed:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

`FRONTEND_ORIGINS` accepts a comma-separated list, so include every host/port combo you plan to run the frontend from (for example `http://localhost:5173,http://127.0.0.1:5173,http://0.0.0.0:5173`).

### 2. Run with Docker Compose

```bash
docker compose up --build
```

Services:
- `http://localhost:5173` – React frontend
- `http://localhost:8000/docs` – FastAPI interactive docs
- `postgres://postgres:postgres@localhost:5432/simple_web_app` – Postgres database

### 3. Local development (without Docker)

Backend:
```bash
python -m venv .venv
source .venv/bin/activate
source .env.local
pip install -r backend/requirements.txt
uvicorn app.main:app --app-dir backend --reload
```

Frontend:
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Ensure Postgres is running locally and `DATABASE_URL` matches your setup.

## Seeding a user
Use the register route to create an account before logging in:

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "full_name": "Demo User",
    "password": "demo-password"
  }'
```

You can also create an account directly from the frontend sign-up form.

**Password rules:** Minimum 8 characters. We now use PBKDF2, so long passphrases remain fully intact (legacy bcrypt hashes continue to verify).

## Project layout
```
backend/        FastAPI application code
frontend/       React + Vite application
Dockerfile(s)   Runtime definitions for backend/frontend
```

## Next steps
- Add real authentication tokens / sessions
- Extend the frontend after login
- Add migrations (Alembic) for production readiness
