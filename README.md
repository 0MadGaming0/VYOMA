# VYOMA

**Astronaut Self-Monitoring & Aerospace Health Intelligence System**

VYOMA is an aerospace-grade biomedical and clinical telemetry monitoring platform engineered for long-duration spaceflight. Built on a strict three-color design system (Pure White `#FFFFFF`, Deep Navy `#16324F`, Teal `#2A9D8F`), it provides astronauts and flight surgeons with real-time vital signs analysis, neurocognitive self-assessment, cabin life-support telemetry, automated triage, and cryptographic ground synchronization.

---

## Architecture Overview

VYOMA implements a secure, modular dual-database architecture separating authentication credentials from clinical mission records:

```
┌─────────────────────────────────────────────────────────────┐
│                       VYOMA Frontend                        │
│          (React 18 + Vite + TypeScript + Tailwind)          │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / REST (withCredentials)
┌──────────────────────────────▼──────────────────────────────┐
│                    FastAPI Backend Engine                    │
│        (JWT Auth + Automated Triage & Alert Engine)         │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
┌──────────────▼──────────────┐ ┌──────────────▼──────────────┐
│     MongoDB (vyoma_auth)     │ │    PostgreSQL (Database)    │
│  - astronaut_users          │ │  - astronaut_profiles       │
│  - bcrypt password hashes   │ │  - vital_readings           │
│  - unique email & astro_id  │ │  - health_alerts            │
└─────────────────────────────┘ └─────────────────────────────┘
```

### 1. Backend & Databases
- **FastAPI**: High-performance asynchronous Python API with Pydantic validation.
- **PostgreSQL + SQLAlchemy**: Stores astronaut flight profiles, vital readings telemetry, and health alerts.
- **MongoDB (Compass / Atlas)**: Dedicated authentication database (`vyoma_auth`) storing astronaut user credentials, password hashes, and active session status. Astronaut profiles are referenced via `astronaut_id` without duplicating clinical health records.

### 2. Authentication & Security
- **Endpoints**:
  - `POST /api/auth/login`: Authenticates with email or astronaut code; issues signed JWT access token in an HttpOnly cookie and Bearer body.
  - `POST /api/auth/register`: Self-registration that validates or auto-provisions astronaut profiles and initializes baseline telemetry.
  - `GET /api/auth/me`: Retrieves authenticated user profile without exposing password hashes.
  - `POST /api/auth/logout`: Revokes token `jti` in memory and clears session cookies.
  - `POST /api/auth/provision`: Administrator provisioning protected via `X-Admin-Key`.
- **Password Protection**: Salted bcrypt hashing (12 rounds) with generic 401 error responses to prevent user enumeration.
- **Authorization & Data Isolation**: Strict ownership checks ensure astronauts can only view or mutate their own vitals, profile, and alerts. Client-supplied IDs cannot override the authenticated token identity.

---

## Core Application Modules

### 1. Dashboard (`/`)
A focused, clinical astronaut health-monitoring dashboard:
- **Header**: Live backend connection indicator, active mission code, astronaut identifier, and last telemetry update timestamp.
- **Summary Cards**: Real-time physiological triage status (Nominal / Warning / Critical), total open alerts, latest vital status, and total recorded database entries.
- **Active Medical Alerts**: Prominent triage cards showing observed values, alert thresholds, severity badges, and direct **Acknowledge** and **Resolve** action buttons.
- **Current Vital Signs**: Clean 4-card telemetry display strictly focused on essential vitals (Heart Rate, SpO₂, Body Temperature, Respiratory Rate).
- **Vital Trends**: Dual-axis historical trend chart (Heart Rate & SpO₂) sourced strictly from PostgreSQL records without fabricated points.

### 2. VitalWatch (`/vitalwatch`)
Interactive clinical telemetry workspace:
- **Header & Controls**: Astronaut selector, Record Vitals modal button, and dynamic time filters (**LIVE**, **1H**, **6H**, **24H**, **7D**, **30D**).
- **Current Vitals (6 Cards)**: Real-time telemetry for Heart Rate (BPM), HRV (ms), SpO₂ (%), Blood Pressure (mmHg), Body Temperature (°C/°F), and Respiratory Rate (/min) with calibrated personal baselines and clinical status evaluations.
- **Historical Trends**: Full-width chart supporting metric switching across all 6 vitals (including dual systolic/diastolic blood pressure curves), calibrated baseline reference lines, and dynamic time window cutoffs.
- **Abnormal Telemetry Log**: Anomaly table displaying threshold exceedances, observed readings, severity levels, and triage states.
- **Clinical Flight Notes**: Dedicated notes and symptoms log for documenting subjective physiological observations and EVA exertion.
- **Record Vitals Dialog**: Modal allowing astronauts to commit new telemetry readings directly to PostgreSQL with automated alert evaluation.

### 3. Additional Hub Modules
- **HealthSense AI** (`/healthsense`): Longitudinal health intelligence and clinical risk analytics.
- **MindSpace** (`/mindspace`): Neurocognitive wellbeing, sleep architecture, and confidential journaling.
- **SpaceGuard** (`/spaceguard`): Life support and habitat telemetry (radiation, CO₂ pressure, cabin temperature, ECLSS).
- **Alerts & Triage** (`/alerts`): Centralized triage queue for reviewing, acknowledging, and resolving medical alerts.
- **Settings** (`/settings`): Physiological baseline calibration, telemetry units (metric/imperial), and system preferences.

---

## Getting Started

### Prerequisites
- **Node.js** v18+ and **npm**
- **Python** 3.10+
- **PostgreSQL** instance running locally or remotely
- **MongoDB** instance (local or MongoDB Atlas)

---

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Configure Environment Variables**:
   Copy the example environment configuration and fill in your connection strings:
   ```bash
   cp .env.example .env
   ```

   Key configuration parameters:
   ```dotenv
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vyoma
   MONGO_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=Backend
   MONGO_DB_NAME=vyoma_auth
   JWT_SECRET=<your-cryptographic-secret>
   JWT_ALGORITHM=HS256
   JWT_EXPIRE_MINUTES=60
   ADMIN_KEY=<your-secret-admin-key>
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   # Or install dependencies: fastapi, uvicorn, sqlalchemy, psycopg2-binary, motor, pymongo, bcrypt, pyjwt, pydantic
   ```

4. **Start the API Server**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   The backend API will be available at `http://localhost:8000`. Interactive documentation is available at `http://localhost:8000/docs`.

5. **Run Backend Test Suite**:
   Execute the automated security and isolation test suite:
   ```bash
   pytest tests/test_auth.py -v
   ```

---

### Frontend Setup

1. **Navigate to the project root**:
   ```bash
   cd ..
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. **Production Build & Type Check**:
   ```bash
   npm run build
   ```

---

## MongoDB Compass Integration

To inspect astronaut user documents, password hashes, and index constraints in MongoDB Compass:
1. Open **MongoDB Compass**.
2. Click **New Connection**.
3. Paste your MongoDB connection string (same as `MONGO_URL` in `backend/.env`).
4. Click **Connect**.
5. Locate the **`vyoma_auth`** database and open the **`astronaut_users`** collection.
6. Verify unique indexes on `email` and `astronaut_id`.

---

## Security Guidelines

- Never commit `.env` or configuration files containing real credentials to version control.
- Ensure `SECURE_COOKIES=true` in production deployments using HTTPS.
- Plain-text passwords are never stored in the database or returned via any API response.
- Password hashes are computed using bcrypt with 12 rounds of salting.
