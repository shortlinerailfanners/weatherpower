FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MPLBACKEND=Agg \
    SOUNDING_CACHE_DIR=/tmp/weatherpower-soundings

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libeccodes0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py ./

ENV PORT=8080
CMD exec uvicorn app:app --host 0.0.0.0 --port ${PORT} --workers 1
