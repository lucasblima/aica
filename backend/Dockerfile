# =============================================================================
# AICA Agents Service - Dockerfile
# =============================================================================
# Python ADK multi-agent backend for AICA Life OS
# Deployed as a separate Cloud Run service
#
# Build:
#   docker build -t aica-agents -f backend/Dockerfile backend/
#
# Run locally:
#   docker run -p 8081:8081 --env-file backend/.env aica-agents
# =============================================================================

FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create non-root user for security
RUN adduser --disabled-password --gecos "" appuser && \
    chown -R appuser:appuser /app

# Copy application code
COPY . .

# Switch to non-root user
USER appuser

ENV PATH="/home/appuser/.local/bin:$PATH"
ENV PORT=8081

EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8081/health')" || exit 1

# Run the agents service
CMD ["sh", "-c", "uvicorn main_agents:app --host 0.0.0.0 --port $PORT"]
