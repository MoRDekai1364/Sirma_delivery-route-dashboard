from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
from services.assignment import assign_orders_to_vehicles
from services.routing import build_vehicle_route

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
        ordered_stops, total_distance = build_vehicle_route(depot, vehicle_orders)

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

        result_routes.append(db_route)

    for order in unserved:
        order.status = "unserved"

    db.commit()
    for route in result_routes:
        db.refresh(route)

    return result_routes
