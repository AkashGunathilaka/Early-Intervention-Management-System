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

Requirements 
Make sure to have these installed 

Python 3.10, 3.11 or 3.12
Node.js 18+ - needed for frontend
PostgreSQL 14+

You do not need to download the full OULAD dataset just to run the web app. 
the repository already includes the trained model files in the model/ folder along with some student data to start

## 1. Clone the repository


```bash
git clone <your-repo-url>
cd Early-Intervention-Management-System
```
---

## 2. Create the PostgreSQL database

Create an empty database:

```bash
createdb early_intervention
```

Or in `psql`:

```sql
CREATE DATABASE early_intervention;
```
---

## 3. Backend environment

From the **repo root**, copy the example env file and edit it:

```bash
cp .env.example .env
```

Open `.env` and set at least:

- **`DATABASE_URL`** — your Postgres user, password, host, and database name  
  Example (default in `.env.example`):  
  `postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/early_intervention`
- **`SECRET_KEY`** — a long random string (used to sign JWT login tokens) example - btQvGN1Pqi2e87ZzFGLXIeDvY_CXUdMU-y0s_RJYp-g54mcLI2qT39gUvRk6YGoGbLGC2R_hUGBKbedflXRitw

Other values (`ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`) can stay as in the example.

---

## 4. Python virtual environment and dependencies

From the repo root:

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

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

In a **third terminal**:

```bash
cd frontend
cp .env.example .env
```

`frontend/.env` should contain:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_IDLE_TIMEOUT_MINUTES=30
```

Then install and run:

```bash
npm install
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

For day-to-day use of the web app, the commited files in `model/` are enough — you do not need OULAD on disk unless you are retraining.

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



## 14. Default URLs

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
