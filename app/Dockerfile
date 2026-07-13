# ─────────────────────────────────────────────────────────
# VerbaLingo Backend — Production Dockerfile (Multi-Stage)
# ─────────────────────────────────────────────────────────
#
# WHY MULTI-STAGE?
# ────────────────
# Some Python packages (argon2, asyncpg) need C compilation.
# The compiler (gcc + build-essential) adds ~200MB to the image.
# Multi-stage lets us compile in Stage 1, then copy ONLY the
# compiled wheels to a clean Stage 2. Final image: ~140MB vs ~900MB.
#
# HOW TO BUILD (from project root, NOT from app/):
#   docker build -f app/Dockerfile -t verbalingo-backend .
#
# HOW TO RUN:
#   docker run -p 5001:5001 --env-file .env verbalingo-backend
#


# ═══════════════════════════════════════════
# STAGE 1: Builder — compile dependencies
# ═══════════════════════════════════════════
# Why python:3.11-slim? 
# - "slim" = Debian-based but stripped of extras (~150MB vs ~900MB for full)
# - We use 3.11 specifically because our code is tested against it
# - "alpine" exists (~50MB) but causes issues with C extensions like asyncpg
#   because Alpine uses musl libc instead of glibc. Slim is the sweet spot.
FROM python:3.11-slim AS builder

# These ENV vars are best practice for ANY Python Docker image:
# PYTHONDONTWRITEBYTECODE=1 → Don't create .pyc files (saves disk space in container)
# PYTHONUNBUFFERED=1 → Print output immediately (crucial for logging in Docker)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /build

# Install system-level build dependencies
# These are needed to compile Python C extensions:
#   - gcc: The C compiler
#   - libpq-dev: PostgreSQL client headers (needed by asyncpg)
#   - python3-dev: Python C headers (needed by cffi, argon2)
# We install them HERE and they stay in this stage only — they're not
# copied to the final image. This is the magic of multi-stage builds.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       gcc \
       git \
       libpq-dev \
       python3-dev \
    && rm -rf /var/lib/apt/lists/*
# ↑ Always clean up apt cache to reduce layer size

# Copy requirements FIRST for layer caching
# ─────────────────────────────────────────
# Docker caches each instruction as a "layer." If requirements.txt
# hasn't changed since last build, Docker skips pip install entirely.
# This turns a 2-minute step into a 0-second step on rebuilds.
COPY app/requirements.txt .

# Build wheels instead of installing directly
# ─────────────────────────────────────────
# A "wheel" (.whl) is a pre-compiled Python package.
# We compile them here with gcc available, then copy JUST the wheels
# to Stage 2 where gcc doesn't exist. Think of it as:
# "Cook the ingredients in a full kitchen, then plate them in a clean room."
RUN pip install --no-cache-dir --upgrade pip \
    && pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt


# ═══════════════════════════════════════════
# STAGE 2: Runner — production image
# ═══════════════════════════════════════════
# We start FROM SCRATCH with a fresh python:3.11-slim.
# Nothing from Stage 1 exists here unless we explicitly COPY it.
# No gcc, no build-essential, no source files from Stage 1.
FROM python:3.11-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install only RUNTIME system dependencies
# libpq5 = PostgreSQL client library (runtime version, without headers)
# asyncpg needs this to actually connect to Postgres at runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/*
# ↑ curl is included for healthchecks (to check if the server is alive)

# Security: Create a non-root user
# ─────────────────────────────────
# By default, Docker runs as root. If someone exploits a vulnerability
# in your app, they'd have root access to the container. Running as
# a non-root user limits the blast radius of any security breach.
RUN groupadd --system --gid 1001 appgroup \
    && useradd --system --uid 1001 --gid appgroup appuser

WORKDIR /code

# Install the pre-compiled wheels from Stage 1
# No compilation happens here — just extracting .whl files. Fast.
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir /wheels/* \
    && rm -rf /wheels

# Copy application code
# ─────────────────────
# We copy the entire app/ directory as a Python package.
# The directory structure inside the container will be:
#   /code/app/main.py
#   /code/app/core/
#   /code/app/api/
#   /code/app/services/
#   /code/app/models/
# This way, "app" is a proper Python package and relative imports work.
COPY app/ /code/app/

# Copy Alembic files for database migrations in production
COPY alembic.ini /code/alembic.ini
COPY alembic/ /code/alembic/

# Create writable directories for the non-root user
# ──────────────────────────────────────────────────
# The app creates a logs/ folder at runtime to write log files.
# Since COPY runs as root, everything in /code/ is owned by root.
# We must create any directories the app needs to WRITE to and
# chown them to appuser BEFORE switching to non-root.
RUN mkdir -p /code/logs \
    && chown -R appuser:appgroup /code/logs

# Switch to non-root user BEFORE exposing ports
USER appuser

# EXPOSE is documentation — it tells humans/tools which port the app uses.
# It doesn't actually publish the port (that's done with -p flag).
EXPOSE 5001

# Healthcheck: Docker/compose will ping this to check if the app is alive
# If it fails 3 times in a row, the container is marked "unhealthy" and
# can be auto-restarted (depending on your restart policy).
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5001/health || exit 1

# Start the server
# ────────────────
# --host 0.0.0.0: Listen on ALL interfaces (required in Docker, otherwise
#                  the container can't receive external traffic)
# --port 5001:    Match the EXPOSE above
# --workers 2:    Number of concurrent server processes. The formula is
#                  2 × CPU cores + 1. On our 2-vCPU VPS: 2 × 2 + 1 = 5,
#                  but we use 2 to leave room for other services.
# "app.main:app": Python path → app package → main.py → FastAPI "app" object
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5001", "--workers", "2"]
