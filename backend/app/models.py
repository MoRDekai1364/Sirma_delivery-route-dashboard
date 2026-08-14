from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Time, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)
    time_window_start = Column(Time, nullable=True)
    time_window_end = Column(Time, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    stops = relationship("RouteStop", back_populates="order")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    capacity = Column(Float, nullable=False)
    depot_x = Column(Float, nullable=False)
    depot_y = Column(Float, nullable=False)
    work_start = Column(Time, nullable=True)
    work_end = Column(Time, nullable=True)
    active = Column(Boolean, default=True)
    vehicle_type = Column(String, default="van")

    routes = relationship("Route", back_populates="vehicle")


class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    total_distance = Column(Float, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="draft")
    geometry = Column(JSON, nullable=True)

    vehicle = relationship("Vehicle", back_populates="routes")
    stops = relationship("RouteStop", back_populates="route", order_by="RouteStop.sequence")


class RouteStop(Base):
    __tablename__ = "route_stops"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    sequence = Column(Integer, nullable=False)
    locked = Column(Boolean, default=False)

    route = relationship("Route", back_populates="stops")
    order = relationship("Order", back_populates="stops")
