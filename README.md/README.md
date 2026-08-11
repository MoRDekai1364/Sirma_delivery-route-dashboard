# Delivery Route Optimization Dashboard

Team project — Transportation & Logistics. A dashboard that assigns delivery orders to vehicles and plans efficient routes, visualized on a map.

## Tech Stack

**Backend:** Python, FastAPI, SQLAlchemy, PostgreSQL, Alembic
**Frontend:** React 18, Vite

## Architecture

- REST API backend, React SPA frontend
- Orders and vehicles use a fictional 2D coordinate system (`x, y`), decoupled from real geography via a pluggable coordinate provider — swappable to real-world `lat, lng` + Leaflet/Mapbox later without touching the routing/metrics logic
- Routing: greedy capacity-based assignment → nearest-neighbor route construction → per-vehicle 2-opt optimization
- Orders that can't be assigned are flagged `unserved` and retried on the next planning run

## Project Structure

```
delivery-route-dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── routers/        # orders, vehicles, routes
│   │   ├── services/       # distance, assignment, routing
│   │   └── seed.py
│   ├── alembic/
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── setup.ps1
├── start.ps1
├── stop.ps1
└── README.md
```

## Setup (Windows)

One-time environment setup — checks/installs Python, Node.js, PostgreSQL, creates the database and user, installs dependencies:

```powershell
.\setup.ps1
```

Edit `backend/.env` if using different DB credentials than the defaults.

## Running the Project

Start PostgreSQL, backend, and frontend together:

```powershell
.\start.ps1
```

Backend: `http://localhost:8000` (docs at `/docs`)
Frontend: `http://localhost:5173`

Stop everything:

```powershell
.\stop.ps1
```

## Manual Setup (if not using scripts)

**Backend:**
```powershell
cd backend
pip install -r requirements.txt --break-system-packages
alembic upgrade head
python app/seed.py
cd app
uvicorn main:app --reload
```

**Frontend:**
```powershell
cd frontend
npm install
npm run dev
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/orders/` | Create order |
| GET | `/orders/` | List orders |
| GET | `/orders/{id}` | Get order |
| PUT | `/orders/{id}` | Update order |
| DELETE | `/orders/{id}` | Delete order |
| POST | `/vehicles/` | Create vehicle |
| GET | `/vehicles/` | List vehicles |
| GET | `/vehicles/{id}` | Get vehicle |
| PUT | `/vehicles/{id}` | Update vehicle |
| DELETE | `/vehicles/{id}` | Delete vehicle |
| POST | `/routes/plan` | Run route planning |

## Status

- ✅ **Phase 1** — DB schema, models, CRUD API, seed data, migrations
- ✅ **Phase 2** — Routing engine (`POST /routes/plan`)
- ✅ **Phase 3** — Frontend: MapView (grid roads, animated vehicles, dark/light toggle), OrderForm, VehicleForm
- ✅ **Phase 4** — Metrics Panel (total distance, served/unserved/pending counts, per-vehicle load table)
- 🔄 **Phase 5a** — Hard time-window constraints: implemented (`services/time_windows.py`), not yet exercised with real test data — seeded orders currently have no time windows set
- ⏳ **Phase 5b** — Full autonomy mode
- ⏳ **Phase 5c** — Real-world map/routing swap
- 📋 **Phase 6** — City simulation layer (traffic, pedestrians, multi-city road network, dynamic events) — scoped as a **separate future project**, not part of this dashboard's deliverable

## Notes

- Fleet capacity, depot location, and order volume/position are seeded randomly for MVP (`backend/app/seed.py`)
- PostgreSQL currently configured with `trust` authentication for local dev convenience — not suitable for shared/exposed environments
- Time-window enforcement (`services/time_windows.py`) uses a placeholder `VEHICLE_SPEED` constant — tune once real map scale/timing is decided. Seeded orders have no time windows by default; set them via `PUT /orders/{id}` to test enforcement
- If order/vehicle counts grow unexpectedly across dev sessions (repeated `python app/seed.py` runs add on top of existing data, they don't replace it), reset with:
  ```sql
  TRUNCATE route_stops, routes, orders, vehicles RESTART IDENTITY CASCADE;
  ```
