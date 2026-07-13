from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager
import manticoresearch
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from .core.redis import redis_client
from .core.dodo import dodo_client
from .services.usage_service import sync_all_dirty_users
from .services.translation_service import TranslationService

from .core.config import get_settings
from .core.manticore_client import get_manticore_configuration
from .core.limiter import limiter
from .core.logging import logger, setup_logging
from . import models # Force model registration for relationships
from .db.init_db import init_database
from .api.routes import router
from .api.auth import router as auth_router
from .api.billing import router as billing_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize logging first
    setup_logging()

    app.state.api_client = None
    app.state.search_api = None

    # 1. Create PostgreSQL tables if they don't exist
    try:
        await init_database()
    except Exception as e:
        logger.error(f"Failed to initialize database tables: {e}")

    # 2. Initialize Manticore Search Client
    try:
        config = get_manticore_configuration()
        api_client = manticoresearch.ApiClient(config)
        app.state.api_client = api_client
        app.state.search_api = manticoresearch.SearchApi(api_client)
        app.state.utils_api = manticoresearch.UtilsApi(api_client)
        try:
            await app.state.utils_api.sql("SHOW STATUS LIKE 'uptime'")
            logger.success(f"Connected to Manticore at {settings.manticore_url}")
        except Exception as health_err:
            logger.warning(f"Manticore health check failed: {health_err}")
    except Exception as e:
        logger.error(f"Failed to initialize Manticore client: {e}")
    
    # 3. Initialize Background Scheduler
    try:
        scheduler = AsyncIOScheduler()
        # Use the dedicated redis_client singleton
        redis_conn = await redis_client.get_client()
        app.state.redis = redis_conn
        scheduler.add_job(
            sync_all_dirty_users, 
            "interval", 
            minutes=5, 
            args=[redis_conn],
            id="usage_sync",
            replace_existing=True
        )
        scheduler.start()
        app.state.scheduler = scheduler
        logger.success("Background scheduler started (AsyncIO)")
    except Exception as e:
        logger.error(f"Failed to start background scheduler: {e}")
    
    # 4. Initialize Dodo Payments client
    try:
        await dodo_client.connect()
        logger.success("Dodo Payments client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Dodo client: {e}")

    logger.info("Application startup complete")
    yield
    
    # Shutdown
    if hasattr(app.state, "scheduler"):
        app.state.scheduler.shutdown()
        logger.info("Background scheduler shut down")

    if app.state.api_client:
        await app.state.api_client.close()
        logger.info("Manticore client closed")

    # Close shared translation HTTP client
    await TranslationService.close()
    logger.info("Translation HTTP client closed")

    # Close Redis connection pool
    await redis_client.close()
    logger.info("Redis connection closed")

    # Close Dodo Payments client
    await dodo_client.close()
    logger.info("Dodo Payments client closed")

    logger.info("Application shutdown complete")


app = FastAPI(
    title="Verbalingo API",
    description="Search API powered by Manticore Search",
    version="3.0.0",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None
)

# Rate limiting setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 1. Session Middleware - Required for OAuth state management
# Authlib stores the 'state' parameter in session to prevent CSRF attacks
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

# 2. CORS Middleware - MUST be added AFTER SessionMiddleware to be the OUTERMOST 
# layer so it can handle preflight (OPTIONS) requests before sessions logic.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.BACKEND_CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "RateLimit-Limit",
        "RateLimit-Remaining",
        "RateLimit-Reset",
        "RateLimit-Policy",
    ],
)

app.include_router(auth_router)
app.include_router(router)
app.include_router(billing_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
