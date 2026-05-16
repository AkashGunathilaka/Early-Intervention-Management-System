# Frontend (Vite + React)

Full setup (PostgreSQL, API, first admin user, sample data) is in the root README. Start there if you are on a new machine.

This file only covers running the UI locally.

## Prerequirements

- Backend API running at `http://127.0.0.1:8000` (see root README)
- Node.js 18+

## Environment

```bash
cp .env.example .env
```

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Backend URL (default `http://127.0.0.1:8000`) |
| `VITE_IDLE_TIMEOUT_MINUTES` | Auto-logout after inactivity (default `30`) |

## Commands

```bash
npm install
npm run dev      # dev server (usually http://localhost:5173)
npm run build    # production build 
npm run preview  # serve production build locally
```

## Main routes

| Path | Who |
|------|-----|
| `/login` | Everyone |
| `/dashboard` | Logged-in users |
| `/students`, `/students/:id` | Logged-in users |
| `/users` | Change password (all roles) |
| `/admin/users` | User management (admin) |
| `/admin/data` | CSV import (admin) |
| `/admin/models` | Model registry (admin) |
| `/admin/ml` | Train / retrain (admin) |
| `/admin/risk-thresholds` | Risk bands (admin) |
