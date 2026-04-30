FROM python:3.11-slim

WORKDIR /app

# Paths are relative to the repo root — build context is always the repo root
# (docker compose sets context: . and Railway uses the repo root by default)
COPY bot-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY bot-service/app/ ./app/

# 4 workers handle concurrent requests; each worker is a full async uvicorn process
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
