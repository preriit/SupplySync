"""
SupplySync API — thin entrypoint.

Routers live in `routers/`; shared logic in `services/`; Pydantic shapes in `schemas/`.
"""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from admin_routes import admin_router
from routers.auth import router as auth_router
from routers.dealer_dashboard import router as dealer_dashboard_router
from routers.dealer_images import router as dealer_images_router
from routers.dealer_inventory import router as dealer_inventory_router
from routers.dealer_products import router as dealer_products_router
from routers.health import router as health_router
from routers.reference import router as reference_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

app = FastAPI(title="SupplySync API")


@app.on_event("startup")
def _log_startup():
    log = logging.getLogger("uvicorn.error")
    log.info("SupplySync: JWT_SECRET_KEY set=%s", bool(os.environ.get("JWT_SECRET_KEY")))


api_router = APIRouter(prefix="/api")

api_router.include_router(reference_router)
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(dealer_dashboard_router)
api_router.include_router(dealer_inventory_router)
# Image routes before generic /products/{id} where paths overlap by prefix
api_router.include_router(dealer_images_router)
api_router.include_router(dealer_products_router)

api_router.include_router(admin_router)

app.include_router(api_router)

_cors_origins = os.environ.get("CORS_ORIGINS", "").strip()
if not _cors_origins or _cors_origins == "*":
    _cors_origins_list = ["http://localhost:3000", "http://127.0.0.1:3000"]
else:
    _cors_origins_list = [o.strip() for o in _cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)
