import threading
import webbrowser
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers import orders, vehicles, routes

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
app.include_router(routes.router)


@app.get("/")
def root():
    return {"status": "ok"}


@app.on_event("startup")
def open_browser():
    threading.Timer(1.5, lambda: webbrowser.open("http://localhost:8000/docs")).start()
