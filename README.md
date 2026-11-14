# VYOMA

**Astronaut Self-Monitoring & Health Intelligence System**  
Developed for the NASA International Space Apps Challenge.

VYOMA is an aerospace-grade biomedical and environmental monitoring platform engineered for long-duration spaceflight. Built on a strict three-color design system (Pure White `#FFFFFF`, Deep Navy `#16324F`, Teal `#2A9D8F`), it provides astronauts and flight surgeons with real-time vital signs analysis, neurocognitive self-assessment, cabin life-support telemetry, automated triage, and cryptographic ground synchronization.

---

## Key Modules (OrbitCare Hub)

1. **Dashboard** (`/`) – Operational health readiness score, high-priority triage alerts, continuous HR/HRV autonomic telemetry, and cabin environmental summary.
2. **VitalWatch** (`/vitalwatch`) – Real-time biosensor streams, interactive multi-lead ECG waveform canvas, and physiological deviation tracking.
3. **HealthSense AI** (`/healthsense`) – Predictive health intelligence, clinical risk analysis, and automated medical protocol recommendations.
4. **MindSpace** (`/mindspace`) – Astronaut neurocognitive wellbeing, sleep architecture analytics, 14-day longitudinal stress tracking, and confidential flight journal.
5. **AstroAssist** (`/astroassist`) – AI space medicine flight companion trained on aerospace clinical guidelines with offline edge reasoning.
6. **SpaceGuard** (`/spaceguard`) – Life support and atmospheric telemetry: radiation dosimetry, CO2 partial pressure, cabin pressure, habitat temperature, humidity, and O2 levels.
7. **Alerts & Triage** (`/alerts`) – Multi-tier clinical alert triage queue (Critical, Warning, Informational) with audible alerts and flight surgeon acknowledgments.
8. **MissionSync** (`/missionsync`) – Offline-first edge persistence, encrypted onboard telemetry store, and scheduled deep-space ground synchronization.
9. **Bio-Calibration** (`/settings`) – Astronaut credentials, personalized physiological baseline calibration, biosensor array telemetry rates, and system display preferences.

---

## Technology Stack

- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS + Custom Brand Tokens (Navy `#16324F`, Teal `#2A9D8F`, Pure White `#FFFFFF`)
- **Routing**: React Router v6
- **Data Visualization**: Recharts (autonomic cardiac trends, sleep architecture, environmental area charts, telemetry timelines)
- **Icons**: Lucide React
- **HTTP Client**: Axios (modular service architecture ready for backend integration)

---

## Getting Started

### Installation

```bash
npm install
```

### Environment Configuration

```bash
cp .env.example .env     # Optional – leave VITE_API_BASE_URL blank for standalone station mode
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build & Type-Check

```bash
npm run build
```

---

## Telemetry & Demonstration Disclaimer

All physiological telemetry, environmental sensor readings, and anomaly detection algorithms in demonstration mode operate with simulated data modeled after NASA Standard-3001 and ISS/Gateway reference specifications. Not clinically validated for medical diagnosis; not officially endorsed by NASA.
