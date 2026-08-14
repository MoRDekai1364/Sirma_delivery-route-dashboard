from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
from services.assignment import assign_orders_to_vehicles
from services.distance import euclidean_distance
from services.routing import build_vehicle_route, route_distance, get_route_geometry
from services.time_windows import enforce_time_windows
from services.vehicle_types import VEHICLE_CHARACTERISTICS

router = APIRouter(prefix="/routes", tags=["routes"])


@router.post("/plan", response_model=List[schemas.RouteOut])
def plan_routes(db: Session = Depends(get_db)):
    pending_orders = db.query(models.Order).filter(
        models.Order.status.in_(["pending", "unserved"])
    ).all()
    active_vehicles = db.query(models.Vehicle).filter(models.Vehicle.active == True).all()

    assignments, unserved = assign_orders_to_vehicles(pending_orders, active_vehicles)

    result_routes = []

    for vehicle in active_vehicles:
        vehicle_orders = assignments.get(vehicle.id, [])
        depot = (vehicle.depot_x, vehicle.depot_y)
        characteristics = VEHICLE_CHARACTERISTICS.get(vehicle.vehicle_type, VEHICLE_CHARACTERISTICS["van"])

        ordered_stops, total_distance = build_vehicle_route(depot, vehicle_orders, vehicle.vehicle_type)

        feasible_stops, infeasible_stops = enforce_time_windows(
            depot, ordered_stops, vehicle.work_start, characteristics["speed_multiplier"]
        )
        unserved.extend(infeasible_stops)
        ordered_stops = feasible_stops
        total_distance = route_distance(depot, ordered_stops)

        db_route = models.Route(
            vehicle_id=vehicle.id,
            total_distance=total_distance,
            status="draft",
        )
        db.add(db_route)
        db.flush()

        for sequence, order in enumerate(ordered_stops):
            db_stop = models.RouteStop(
                route_id=db_route.id,
                order_id=order.id,
                sequence=sequence,
                locked=False,
            )
            db.add(db_stop)
            order.status = "assigned"

        db_route.geometry = get_route_geometry(depot, ordered_stops)
        result_routes.append(db_route)

    for order in unserved:
        order.status = "unserved"

    db.commit()
    for route in result_routes:
        db.refresh(route)

    return result_routes


@router.post("/urgent-order", response_model=schemas.RouteOut)
def insert_urgent_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    db_order = models.Order(**order.dict())
    db.add(db_order)
    db.flush()

    active_vehicles = db.query(models.Vehicle).filter(models.Vehicle.active == True).all()

    best_vehicle = None
    best_route = None
    best_distance = None

    for vehicle in active_vehicles:
        route = (
            db.query(models.Route)
            .filter(models.Route.vehicle_id == vehicle.id, models.Route.status == "draft")
            .order_by(models.Route.created_at.desc())
            .first()
        )
        existing_orders = [stop.order for stop in route.stops] if route else []
        current_load = sum(o.volume for o in existing_orders)

        if current_load + db_order.volume > vehicle.capacity:
            continue

        dist = euclidean_distance(vehicle.depot_x, vehicle.depot_y, db_order.x, db_order.y)
        if best_distance is None or dist < best_distance:
            best_distance = dist
            best_vehicle = vehicle
            best_route = route

    if best_vehicle is None:
        db_order.status = "unserved"
        db.commit()
        raise HTTPException(status_code=422, detail="No vehicle with capacity available for urgent order")

    existing_orders = [stop.order for stop in best_route.stops] if best_route else []
    vehicle_orders = existing_orders + [db_order]
    depot = (best_vehicle.depot_x, best_vehicle.depot_y)
    characteristics = VEHICLE_CHARACTERISTICS.get(best_vehicle.vehicle_type, VEHICLE_CHARACTERISTICS["van"])

    ordered_stops, _ = build_vehicle_route(depot, vehicle_orders, best_vehicle.vehicle_type)

    feasible_stops, infeasible_stops = enforce_time_windows(
        depot, ordered_stops, best_vehicle.work_start, characteristics["speed_multiplier"]
    )
    for infeasible_order in infeasible_stops:
        infeasible_order.status = "unserved"

    ordered_stops = feasible_stops
    total_distance = route_distance(depot, ordered_stops)

    if best_route is None:
        best_route = models.Route(vehicle_id=best_vehicle.id, status="draft")
        db.add(best_route)
        db.flush()
    else:
        db.query(models.RouteStop).filter(models.RouteStop.route_id == best_route.id).delete()

    best_route.total_distance = total_distance
    best_route.geometry = get_route_geometry(depot, ordered_stops)

    for sequence, stop_order in enumerate(ordered_stops):
        db_stop = models.RouteStop(
            route_id=best_route.id,
            order_id=stop_order.id,
            sequence=sequence,
            locked=False,
        )
        db.add(db_stop)
        stop_order.status = "assigned"

    db.commit()
    db.refresh(best_route)
    return best_route