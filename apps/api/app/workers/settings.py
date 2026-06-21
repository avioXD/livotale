from arq.connections import RedisSettings

from app.core.config import get_settings
from app.workers.ai_extraction import process_ai_extraction_job
from app.workers.notification_dispatch import dispatch_notifications
from app.workers.pdf_generation import generate_pdf_job

settings = get_settings()


class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    functions = [dispatch_notifications, process_ai_extraction_job, generate_pdf_job]
    cron_jobs = []
    max_jobs = 20
    job_timeout = 300
