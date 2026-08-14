# Roadmap

*Project 13 · Transportation & Logistics — Delivery Route Optimization Dashboard*

## Current state vs. spec

| Requirement | Status |
|---|---|
| Order input (address/coords, time window, volume) | Done — `OrderForm` + API, plus CSV bulk import (`POST /orders/import`) |
| Bulk order import | Done — `POST /orders/import`, CSV validated row-by-row against `OrderCreate` |
| Fleet definition (capacity, depot, work hours) | Done — `Vehicle` model + `VehicleForm` |
| Routing algorithm: nearest-neighbor + 2-opt, capacity-constrained | Done — `routing.py`, `assignment.py` |
| Map visualization with stop sequence | Done — `react-leaflet` map in `MapView.jsx`, real OSM tiles, animated vehicles, route polylines |
| Metrics: total mileage, vehicle load, served orders | Done — `MetricsPanel` |
| Seed data (30–50 orders + vehicles) | Done — `seed.py` |
| Bonus: hard time-window constraints | Done — `enforce_time_windows` wired into `POST /routes/plan` and `POST /routes/urgent-order`; infeasible stops merged into `unserved` |
| Bonus: real distances via routing API | Done — `distance.py` queries OSRM `/table` and `/route`, falls back to Euclidean on failure/timeout |
| Bonus: re-planning on urgent new order | Done — `POST /routes/urgent-order` inserts an order and re-optimizes only the affected vehicle's route |

---

## Remaining work

None — all must-have and bonus items are implemented. Open items are maintenance-level, not scope:

- `Route.geometry` is stored as a JSON column now (migrated); confirm frontend keeps handling missing/null geometry gracefully for routes with no OSRM result.
- `RouteStop.locked` exists on the model but isn't enforced anywhere yet — the urgent re-planning endpoint fully rebuilds a vehicle's stops, including any marked `locked`. Decide whether locked stops should be pinned in place before urgent re-optimization, if that behavior is ever needed.
