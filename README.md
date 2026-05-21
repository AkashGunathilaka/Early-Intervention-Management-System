# Early Intervention Management System

This project is a full-stack web application for identifying students who may be at risk and helping staff manage interventions.


The system lets users:

- View and manage student records
- Import student data from CSV files
- Run at-risk predictions using a trained XGBoost model
- Track interventions and suggested support actions
- Manage users, datasets, models, and risk thresholds


The backend is built with FastAPI and PostgreSQL
the frontend is built with React using Vite

This guide explains how to set up the project and run it locally.

## Requirements

| Software | Version | Used for |
|----------|---------|----------|
| **Python** | 3.10, 3.11, or 3.12 | Backend API and scripts |
| **Node.js** | 18+ | Frontend (Vite + React) |
| **PostgreSQL** | 14+ | Database (students, users, predictions) |

You do **not** need the full OULAD download to run the web app. The repo includes trained model files in `model/` and `seed/demo_students_200.csv` for import.

### What must be in your copy of the project

| Item | Notes |
|------|--------|
| `model/final_master_model.pkl` (+ feature columns, metrics) | Required for predictions |
| `frontend/src/lib/` (`auth.ts`, `api.ts`, `format.ts`) | Required for the UI (must be tracked in git) |
| `.env` | **Not** in git — create from `.env.example` on each machine |
| `frontend/.env` | **Not** in git — create from `frontend/.env.example` |

---

## Run order (checklist)

1. Install and start **PostgreSQL** → create database `early_intervention`
2. Copy **`.env.example`** → **`.env`** and set `DATABASE_URL` + `SECRET_KEY`
3. Create Python **venv**, `pip install -r requirements.txt`
4. Start **API**: `uvicorn app.main:app --reload`
5. Create **first admin user** (script below — not automatic)
6. In **`frontend/`**: `npm install`, copy `.env`, `npm run dev`
7. Log in, register master model, import demo CSV (optional)

You need **three terminals** for a full session: Postgres running, API, frontend.

---

## 1. Clone the repository

```bash
git clone <your-repo-url>
cd Early-Intervention-Management-System
```

---

## 2. Install PostgreSQL

PostgreSQL is a separate program from Python and Node. The web app **cannot run** without it. Installing Postgres does **not** create a website login — you add that in [step 6](#6-create-your-first-admin-user).

### Check if Postgres is already installed

```bash
which psql
pg_isready
```

- `pg_isready` → `accepting connections` means the **server is running**.
- `createdb` or `psql` may still ask for a **Postgres username/password** — that is normal (see below).

---

### Postgres.app 

1. Download and install [Postgres.app](https://postgresapp.com).
2. Open it and click **Initialize** to start the server.
3. Create the database (Terminal):

```bash
createdb early_intervention
```

If that fails, open **psql** from Postgres.app and run:

```sql
CREATE DATABASE early_intervention;
```

4. In `.env`, use your 

```env
DATABASE_URL=postgresql+psycopg2://YOUR_MAC_USERNAME@127.0.0.1:5432/early_intervention
```

the other things in the env should be 
SECRET_KEY=btQvGN1Pqi2e87ZzFGLXIeDvY_CXUdMU-y0s_RJYp-g54mcLI2qT39gUvRk6YGoGbLGC2R_hUGBKbedflXRitw
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

---

---

Create the database

```bash
createdb early_intervention
# or, if prompted for a password:
createdb -U postgres -h localhost early_intervention
```

Set `DATABASE_URL` in `.env` to the **same username and password** that work for `createdb` / `psql`.

---



### Verify Postgres before starting the API


## 3. Backend environment (`.env`)

From the **repo root**:

```bash
cp .env.example .env
```



```env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/early_intervention
SECRET_KEY=change-this-to-a-long-random-string
```

`ALGORITHM` and `ACCESS_TOKEN_EXPIRE_MINUTES` can stay as in `.env.example`.

---

## 4. Python virtual environment and dependencies

From the repo root:

```bash
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

Use the same project folder for the venv and for running `uvicorn` 

`requirements.txt` includes notebook/ML tooling as well as the API stack, so the first install can take a few minutes.

---

## 5. Start the API (creates tables automatically)

Still in the repo root with the venv active:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

On first startup, SQLAlchemy creates missing tables (`users`, `students`, `datasets`, `model_records`, etc.).

- API: **http://127.0.0.1:8000**
- Interactive docs: **http://127.0.0.1:8000/docs**

Leave this terminal running.

---

## 6. Create your first admin user

There is no public sign-up route. The first account must be inserted once (after the API has run at least once so tables exist).
In a **second terminal**, from the repo root with the same venv active:

```bash
python - <<'PY'
from app.db.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

email = "admin@example.com"
password = "change-me-now"

db = SessionLocal()
try:
    if db.query(User).filter(User.email == email).first():
        print(f"User {email} already exists — skip.")
    else:
        db.add(User(
            full_name="System Admin",
            email=email,
            password_hash=get_password_hash(password),
            role="admin",
            is_active=True,
        ))
        db.commit()
        print(f"Created admin: {email} / {password}")
        print("Log in and change the password under Accounts.")
finally:
    db.close()
PY
```

Change `email` and `password` before running this 
Additional users (staff or admin) can be created later from Admin -> Users in the UI.

---

## 7. Frontend environment and dev server

In a **third terminal** (API still running in terminal 2):

```bash
cd frontend
npm install
cp .env.example .env
```

`npm install` is required on every new machine (creates `node_modules/`, including Vite). Ensure `frontend/src/lib/` exists (`auth.ts`, `api.ts`, `format.ts`) — the app will not build if that folder is missing.

`frontend/.env` should contain:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_IDLE_TIMEOUT_MINUTES=30
```

Then run:

```bash
npm run dev
```

Open the URL Vite prints (usually **http://localhost:5173**).

Log in with the admin email and password you created in step 6.

---

## 8. Load demo students (Admin → Data)

The repo includes **`seed/demo_students_200.csv`** — 200 students sampled from OULAD the same way as in `Notebook/data_cleaning_and_ml_core.ipynb` (100 at-risk, 100 not-at-risk). No OULAD download is needed on a fresh clone.

### 8a. Create a dataset

1. Log in as **admin**.
2. Go to **Students** and create a dataset (e.g. `demo-cohort`). Note the **dataset_id** (often `1`).

### 8b. Register the master model

From the repo root (venv active):

```bash
python -m Scripts.cleanup_test_artifacts
```
This creates/activates the bundled master model so predictions can run. Check **Admin → Models** — one model should be active.

### 8c. Import via Admin → Data

1. Open **Admin → Data**.
2. **dataset_id** — value from step 8a.
3. **CSV path** — `seed/demo_students_200.csv`
4. Enable **Generate predictions**.
5. Click **Run import**.

You should see 200 students on the dashboard with risk levels and interventions.

### Regenerating the CSV (optional, requires OULAD)

With OULAD CSVs in **`Data/`**, run `Notebook/data_cleaning_and_ml_core.ipynb`. After building `demo_df`, export with the importer columns (`code_module`, `total_score`, `avg_weight`, `days_from_start`, `at_risk_label`, etc.) and save as `seed/demo_students_200.csv`, then commit.

---

## 9. Alternative: synthetic CSV or manual student

- **Synthetic:** `python Scripts/generate_demo_csvs.py` then import from `uploads/students_import_100.csv`.
- **Manual:** **Students → Create student (demo)** for a single row (active model required).
---

## 10. Smoke tests (optional)

With the API running and a user in the database:

```bash
# from repo root, venv active
pip install pytest httpx
export TEST_USER_EMAIL=admin@example.com
export TEST_USER_PASSWORD=change-me-now
pytest tests/test_smoke.py -q
```

Defaults in the test file assume `Akash@example.com` / `akash` if you do not set the env vars.

---

## 11. Training / OULAD (optional — not required to run the app)

The model was trained on the **Open University Learning Analytics Dataset (OULAD)**:

https://analyse.kmi.open.ac.uk/open-dataset  

The full OULAD CSVs are **not committed** to git (size and licensing). They belong in the **`Data/`** folder at the repo root (see `Data/readme.md`). The notebook also accepts a lowercase `data/` folder with the same files.

To reproduce training from scratch:

1. Download OULAD files from the onedrive folder and copy the CSVs into **`Data/`** (at minimum: `studentInfo.csv`, `studentVle.csv`, `studentAssessment.csv`, `assessments.csv`).
2. Open `Notebook/data_cleaning_and_ml_core.ipynb` and run all cells (it auto-detects `Data/` or `data/`).
3. New pickles and metrics land under `model/`; retrain flows in **Admin → ML** register new `ModelRecord` rows under `model/artifacts/`.

For day-to-day use of the web app, the committed files in `model/` are enough — you do not need OULAD on disk unless you are retraining.

**Note:** Runtime prediction uses paths stored on the active `ModelRecord` (typically `model/final_master_model.pkl` and `model/final_master_feature_columns.pkl` from the notebook). Retrained models are saved under `model/artifacts/`. SQLAlchemy ORM code lives in `app/models/`.

---

## 12. Useful scripts

| Command | Purpose |
|---------|---------|
| `python Scripts/generate_demo_csvs.py` | Create demo CSVs in `uploads/` |
| `python -m Scripts.cleanup_test_artifacts` | Pin master model as active; clean test model/dataset rows |
| `python -m Scripts.reset_sequences` | Reset Postgres sequences after manual deletes (advanced) |

---

## 13. Project layout (short)

```
app/              FastAPI app (routes, models, ML, services)
frontend/         React + Vite UI
model/            Trained model pickles and metrics (used at runtime)
Data/             OULAD raw CSVs for the notebook (gitignored *.csv)
seed/             Committed demo_students_200.csv (import via Admin → Data)
uploads/          Ad-hoc CSV uploads for the web app (gitignored)
Notebook/         OULAD training / cleaning notebook
Scripts/          Demo CSVs, cleanup, sequence reset
tests/            API smoke tests
```

---

## 14. Troubleshooting

| Problem | What to check |
|---------|----------------|
| `No module named 'sqlalchemy'` | Activate venv; run `pip install -r requirements.txt` in the project root |
| `DATABASE_URL` / `got None` | Create `.env` from `.env.example` in the **same folder** as `app/` |
| `password authentication failed` (Postgres) | `DATABASE_URL` user/password must match Postgres — see [step 2](#2-install-postgresql); not the website login |
| `connection refused` / Postgres errors | Run `pg_isready`; start Postgres.app, Docker container, or `brew services start` |
| `createdb` fails | Try Docker ([option B](#option-b--docker-mac-windows-or-linux)) or Postgres.app ([option A](#option-a--postgresapp-easiest-on-mac-recommended-for-markers)) |
| Login fails on frontend | Create admin user ([step 6](#6-create-your-first-admin-user)); API must be running |
| `Cannot find package 'vite'` | Run `npm install` inside `frontend/` |
| `Failed to resolve import "./lib/auth"` | Copy or pull `frontend/src/lib/` — see [requirements table](#requirements) |
| `No active model found` | Run `python -m Scripts.cleanup_test_artifacts` after at least one dataset exists |
| Frontend cannot reach API | `VITE_API_BASE_URL=http://127.0.0.1:8000` in `frontend/.env`; backend on port 8000 |
| `Model file not found` | Ensure `model/final_master_*.pkl` files exist in the project copy |

---

## 15. Default URLs

| Service | URL |
|---------|-----|
| Frontend (dev) | http://localhost:5173 |
| Backend API | http://127.0.0.1:8000 |
| API docs | http://127.0.0.1:8000/docs |

---

## Roles

- **`admin`** — datasets, data import, ML, models, risk thresholds, user management  
- **`staff`** — dashboard, students, predictions, interventions, change own password  

All logged-in users can change their password under **Accounts** (`/users`).
