import csv
import io

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import ValidationError
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/import", response_model=schemas.OrderImportResult)
def import_orders(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv")

    raw = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(raw))

    created = 0
    rejected = []

    for i, row in enumerate(reader, start=1):
        try:
            order_data = schemas.OrderCreate(
                x=float(row["x"]),
                y=float(row["y"]),
                volume=float(row["volume"]),
                time_window_start=row.get("time_window_start") or None,
                time_window_end=row.get("time_window_end") or None,
            )
        except (ValidationError, KeyError, ValueError) as e:
            rejected.append({"row": i, "reason": str(e)})
            continue

        db_order = models.Order(**order_data.dict())
        db.add(db_order)
        created += 1

    db.commit()
    return schemas.OrderImportResult(created=created, rejected=rejected)


@router.post("/", response_model=schemas.OrderOut)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    db_order = models.Order(**order.dict())
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order


@router.get("/", response_model=List[schemas.OrderOut])
def list_orders(status: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Order)
    if status:
        query = query.filter(models.Order.status == status)
    return query.all()


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.put("/{order_id}", response_model=schemas.OrderOut)
def update_order(order_id: int, order_update: schemas.OrderCreate, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    for field, value in order_update.dict().items():
        setattr(order, field, value)
    db.commit()
    db.refresh(order)
    return order


@router.delete("/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()
    return {"detail": "Order deleted"}
