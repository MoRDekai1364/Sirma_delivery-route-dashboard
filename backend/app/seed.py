import os
import random
import logging
import tempfile
import shutil
from datetime import datetime

from database import SessionLocal, Base, engine
import models

ORDER_COUNT = 40
VEHICLE_COUNT = 4
MAP_SIZE = 100
GRID_STEP = 20

log_temp_path = os.path.join(tempfile.gettempdir(), f"seed_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler(log_temp_path), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


def print_progress(current, total, prefix="Progress"):
    filled = int(20 * current / total)
    bar = "#" * filled + "." * (20 - filled)
    percent = int(100 * current / total)
    print(f"\r{prefix}: [{bar}] {percent}%", end="", flush=True)
    if current == total:
        print()


def copy_log_to_project(source_dir):
    try:
        logs_dir = os.path.join(source_dir, "logs")
        os.makedirs(logs_dir, exist_ok=True)
        dest_path = os.path.join(logs_dir, os.path.basename(log_temp_path))
        shutil.copy2(log_temp_path, dest_path)
        logger.info(f"Log copied to {dest_path}")
        return dest_path
    except Exception as e:
        logger.error(f"Failed to copy log to project logs folder: {e}")
        return None


def seed_orders(db, count):
    logger.info(f"Seeding {count} orders")
    orders = []
    try:
        for i in range(count):
            order = models.Order(
                x=random.randint(0, MAP_SIZE // GRID_STEP) * GRID_STEP,
                y=random.randint(0, MAP_SIZE // GRID_STEP) * GRID_STEP,
                volume=round(random.uniform(1, 20), 2),
                status="pending",
            )
            db.add(order)
            orders.append(order)
            print_progress(i + 1, count, prefix="Orders")
        db.commit()
        logger.info(f"Successfully seeded {count} orders")
    except Exception as e:
        db.rollback()
        logger.error(f"Order seeding failed: {e}")
        raise
    return orders


def seed_vehicles(db, count):
    logger.info(f"Seeding {count} vehicles")
    vehicles = []
    try:
        for i in range(count):
            vehicle = models.Vehicle(
                name=f"Vehicle-{i + 1}",
                capacity=round(random.uniform(50, 150), 2),
                depot_x=random.randint(0, MAP_SIZE // GRID_STEP) * GRID_STEP,
                depot_y=random.randint(0, MAP_SIZE // GRID_STEP) * GRID_STEP,
                active=True,
            )
            db.add(vehicle)
            vehicles.append(vehicle)
            print_progress(i + 1, count, prefix="Vehicles")
        db.commit()
        logger.info(f"Successfully seeded {count} vehicles")
    except Exception as e:
        db.rollback()
        logger.error(f"Vehicle seeding failed: {e}")
        raise
    return vehicles


def main():
    logger.info("Seed script started")
    logger.info(f"Temp log path: {log_temp_path}")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        seed_orders(db, ORDER_COUNT)
        seed_vehicles(db, VEHICLE_COUNT)
        logger.info("Seeding completed successfully")
    except Exception as e:
        logger.error(f"Seeding failed: {e}")
    finally:
        db.close()

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    final_log_path = copy_log_to_project(project_root)
    if final_log_path:
        print(f"\nLog file: {final_log_path}")
    else:
        print(f"\nLog file (temp only): {log_temp_path}")


if __name__ == "__main__":
    main()
