from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers import orders, vehicles

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Delivery Route Optimization Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(orders.router)
app.include_router(vehicles.router)


@app.get("/")
def root():
    return {"status": "ok"}
