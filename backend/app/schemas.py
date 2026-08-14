from pydantic import BaseModel
from typing import Optional, List
from datetime import time, datetime


class OrderBase(BaseModel):
    x: float
    y: float
    volume: float
    time_window_start: Optional[time] = None
    time_window_end: Optional[time] = None


class OrderCreate(OrderBase):
    pass


class OrderOut(OrderBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class VehicleBase(BaseModel):
    name: str
    capacity: float
    depot_x: float
    depot_y: float
    work_start: Optional[time] = None
    work_end: Optional[time] = None
    active: bool = True
    vehicle_type: str = "van"


class VehicleCreate(VehicleBase):
    pass


class VehicleOut(VehicleBase):
    id: int

    class Config:
        from_attributes = True


class OrderImportResult(BaseModel):
    created: int
    rejected: List[dict]


class RouteStopOut(BaseModel):
    id: int
    order_id: int
    sequence: int
    locked: bool

    class Config:
        from_attributes = True


class RouteOut(BaseModel):
    id: int
    vehicle_id: int
    total_distance: float
    status: str
    created_at: datetime
    stops: List[RouteStopOut] = []
    geometry: Optional[List[List[float]]] = None

    class Config:
        from_attributes = True
