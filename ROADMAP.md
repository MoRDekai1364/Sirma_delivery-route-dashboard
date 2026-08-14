# Roadmap

*Project 13 · Transportation & Logistics — Delivery Route Optimization Dashboard*

## Current state vs. spec

| Requirement | Status |
|---|---|
| Order input (address/coords, time window, volume) | Done — `OrderForm` + API |
| Bulk order import | Planned — Phase 1 |
| Fleet definition (capacity, depot, work hours) | Done — `Vehicle` model + `VehicleForm` |
| Routing algorithm: nearest-neighbor + 2-opt, capacity-constrained | Done — `routing.py`, `assignment.py` |
| Map visualization with stop sequence | In progress — currently a custom coordinate-plane view; migrating to Leaflet (Phase 1) |
| Metrics: total mileage, vehicle load, served orders | Done — `MetricsPanel` |
| Seed data (30–50 orders + vehicles) | Done — `seed.py` |
| Bonus: hard time-window constraints | Implemented in `time_windows.py`; being wired into the main planning flow (Phase 1) |
| Bonus: real distances via routing API | Planned — Phase 2 |
| Bonus: re-planning on urgent new order | Planned — Phase 2 |

---

## Phase 1

### Bulk order import (CSV)
Add `POST /orders/import` to accept a CSV of orders (coords, volume, time window), validate each row against the existing `OrderCreate` schema, and bulk-insert. Add a corresponding upload action in the frontend.

### Real map (Leaflet)
Replace the custom coordinate-plane canvas in `MapView` with `react-leaflet`, plotting depot/order/vehicle markers and drawing each vehicle's route as a `Polyline`. Requires moving from abstract `x`/`y` coordinates to real lat/lng.

### Wire time-window enforcement into the main flow
Call `enforce_time_windows` from the main route-planning endpoint and merge its infeasible-order output into the same `unserved` reporting path used for capacity failures, so it's reachable through normal usage rather than only as a standalone function.

## Phase 2

### Real distances via routing API
Replace the Euclidean distance calculation with real road distance/duration from a routing API (e.g. OSRM), with a Euclidean fallback if the API call fails.

### Re-planning on urgent new order
Add an endpoint to insert a new order into an already-planned day, re-optimizing only the affected vehicle's route rather than the full plan.

---

## Buiiuild order

1. Bulk import
2. Time-window wiring
3. Leaflet map
4. Real routing API
5. Urgent re-planning
