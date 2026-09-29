# NeoVitals

A calm, full-stack dashboard for a neonatal wearable that monitors heart rate,
SpO₂, temperature, and motion — built for parents and clinicians, not a
clinical war-room.

```
neovitals/
├── backend/     Express + MongoDB + Socket.io API
├── frontend/    React + Vite + Tailwind dashboard
└── esp32/       neonest_firmware.ino — your NeoNest sensor code + NeoVitals backend sync
```

## 1. Backend setup

```bash
cd backend
cp .env.example .env     # then edit .env — at minimum set JWT_SECRET and MONGO_URI
npm install
npm run dev               # nodemon, or `npm start` for a plain run
```

Requires a MongoDB instance — either local (`mongodb://localhost:27017/neovitals`)
or a hosted one (e.g. MongoDB Atlas free tier works fine for this).

The API runs on `http://localhost:5000` by default, with routes under `/api/*`
and a Socket.io server on the same port.

## 2. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`. If your backend isn't on `localhost:5000`,
set `VITE_API_URL` in a `frontend/.env` file, e.g.:

```
VITE_API_URL=https://your-backend.example.com/api
```

## 3. First-time flow

1. Open the frontend, sign up for an account.
2. Go to **Device → Add a device**, enter a `deviceId` — this must exactly
   match `DEVICE_ID` in `esp32/neonest_firmware.ino` (default in the file:
   `neonest-esp32-01`). Copy the **device key** shown — it's only shown once.
3. Open `esp32/neonest_firmware.ino` and set three values near the top
   (search for `NEOVITALS BACKEND SYNC CONFIGURATION`):
   - `BACKEND_HOST` — where your NeoVitals backend is reachable, e.g.
     `http://192.168.1.50:5000` for a machine on the same home WiFi as the
     device, or your deployed backend's HTTPS URL in production
   - `DEVICE_ID` — must match what you entered in step 2
   - `DEVICE_KEY` — the key copied in step 2
4. Also set `ssid` / `password` near the top to your home WiFi (this
   firmware uses direct WiFi credentials with an automatic fallback to a
   `NeoNest_AP` access point if the connection fails — it does not use a
   captive-portal setup flow).
5. Flash `neonest_firmware.ino` to the Beetle ESP32-C3 as usual via the
   Arduino IDE (libraries needed: `SparkFun MAX3010x`, `Adafruit LIS3DH`,
   `Adafruit Unified Sensor`, `WebSockets` by Markus Sattler — all your
   existing sensor code is untouched).
6. Once it boots and connects, it pushes a reading to
   `/api/vitals/ingest` every 2 seconds. The dashboard updates live via
   WebSocket the moment data arrives — no refresh needed. The device's own
   local HTTP API (`/api/data`, `/api/status`) and WebSocket (port 81) still
   run in parallel, unchanged, for bench debugging on the local network.

**Note on thresholds:** the firmware's on-device buzzer uses its own local
alert thresholds (e.g. HR 50–160 bpm, SpO₂ <93%, temp 35.5–38.0°C) for
immediate physical beeping. The dashboard's AI engine and alert system use
separate, per-device thresholds you set on the **Device** page (defaults:
HR 100–180 bpm, SpO₂ <90%, temp 36.0–37.8°C) — these two don't have to
match; tune the dashboard ones to whatever range makes sense for your baby.

**Note on motion:** the firmware computes a `motionState` label
(Still/Slight/Moving) for the buzzer and local API, and separately a numeric
`motionScore` (0–100) derived from the same accelerometer reading — it's
the numeric score that gets sent to the backend, since the AI engine's
anomaly/trend/sleep-state math needs a continuous number, not a text label.

**Note on SpO₂:** the firmware's oxygen reading is a linear IR-amplitude
mapping (labeled in the code as a tested prototype approach), not a true
red/IR ratio-based SpO₂ calculation — accurate enough for a working demo/
prototype, but worth knowing if you're evaluating real-world accuracy.

## How the pieces fit together

- **Auth**: users get a JWT (7-day expiry) via `/api/auth/login`. The ESP32
  device does **not** use a user JWT — it authenticates with its own
  `deviceId` + `deviceKey` pair via `x-device-id` / `x-device-key` headers,
  so a compromised phone session can't be used to spoof sensor data, and a
  compromised device key can't log in as the parent.
- **Live updates**: when the ESP32 posts a reading, the backend runs
  threshold checks (alerts), runs the AI engine, saves everything, then
  emits `vital:new` / `ai:update` / `alert:new` over Socket.io to any
  dashboard subscribed to that device's room. That's what makes Live
  Monitoring and the Dashboard update instantly.
- **AI engine** (`backend/src/services/aiEngine.js`): a transparent,
  explainable statistical model — clinical threshold scoring against
  standard neonatal reference ranges, a rolling z-score anomaly detector
  compared against *that baby's own* recent baseline (not just population
  norms), linear-regression trend detection, and a motion/HR-variability
  sleep-state heuristic. It's deliberately not a black-box neural net: every
  score can be explained in one sentence, which matters a lot more than
  squeezing out extra accuracy for something this close to a baby's safety.
  The function signature is designed so a trained model could later replace
  `computeRiskScore()` without touching anything else.

## Design notes

The interface intentionally avoids a clinical/hospital look — warm paper
background, sage green, soft coral/amber for alerts (with true red reserved
only for critical states), Fraunces for headings, Inter for body text, and a
monospace face for vital readouts. The dashboard's status card glow pulses
at the baby's actual live heart rate rather than using a generic animation.

## Production hardening checklist (before real-world use)

- [ ] Put both the backend and frontend behind HTTPS (the ESP32 sketch has a
      reminder comment for this too — plain HTTP is fine for bench testing
      only).
- [ ] Set a long random `JWT_SECRET` in production, not the example one.
- [ ] Add automated MongoDB backups.
- [ ] Add push/SMS/email delivery for alerts (the `notificationPrefs` model
      fields are there, but actual delivery — e.g. via Twilio/SendGrid — is
      not wired up yet).
- [ ] Consider a message queue (or at least a retry buffer on the ESP32) so
      brief WiFi drops don't lose readings.
- [ ] This is a caregiver support tool, not a certified medical device —
      make that clear in your own product's terms if you ship it to others.
