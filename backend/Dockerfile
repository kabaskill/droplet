FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend /app/backend
RUN addgroup --system droplet && adduser --system --ingroup droplet droplet
USER droplet

EXPOSE 5000

CMD ["flask", "--app", "backend.wsgi:app", "run", "--host", "0.0.0.0", "--port", "5000"]
