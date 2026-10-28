import os

from celery import Celery

refresh_interval_minutes = int(os.getenv("WATER_REFRESH_INTERVAL_MINUTES", "30"))

celery_app = Celery(
    "droplet",
    backend=os.getenv("CELERY_RESULT_BACKEND", os.getenv("REDIS_URL", "redis://localhost:6379/1")),
    broker=os.getenv("CELERY_BROKER_URL", os.getenv("REDIS_URL", "redis://localhost:6379/0")),
    include=["backend.tasks.water"],
)
celery_app.conf.broker_connection_retry_on_startup = True
celery_app.conf.broker_connection_timeout = 1
celery_app.conf.broker_transport_options = {
    "socket_connect_timeout": 1,
    "socket_timeout": 1,
}
celery_app.conf.task_publish_retry = False
celery_app.conf.task_track_started = True
celery_app.conf.beat_schedule = {
    "refresh-water-observations": {
        "task": "droplet.refresh_water_observations",
        "schedule": refresh_interval_minutes * 60,
    },
}
