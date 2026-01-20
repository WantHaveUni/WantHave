# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# System-Abhängigkeiten
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

# Python-Abhängigkeiten
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install uvicorn

COPY . .

# In der Produktion führen wir collectstatic aus
# RUN python manage.py collectstatic --noinput

EXPOSE 8000
CMD ["uvicorn", "wantHave_com.asgi:application", "--host", "0.0.0.0", "--port", "8000"]
