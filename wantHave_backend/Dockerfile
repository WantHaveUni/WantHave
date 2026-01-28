# Nutzen eines schmalen Python-Images (2026 Standard)
FROM python:3.12-slim

# Verhindert, dass Python .pyc-Dateien schreibt und puffert
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System-Abhängigkeiten (z.B. für Postgres-Treiber)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Abhängigkeiten installieren
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Quellcode kopieren ci start forcen
COPY . .

# Port für Django/Daphne
EXPOSE 8000

# Entrypoint script ausführbar machen
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Start-Befehl (führt Migrations aus und startet Daphne)
CMD ["./entrypoint.sh"]