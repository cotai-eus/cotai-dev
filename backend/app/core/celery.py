"""
Configuração do Celery para processamento assíncrono de tarefas.
"""
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "cotai",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.document_processing"
    ]
)

# Configurações do Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hora de timeout para tarefas
    worker_max_memory_per_child=200000,  # 200MB por worker
    worker_prefetch_multiplier=1,  # Reduz multiplex para tarefas pesadas de processamento
)

# Exporta o app para ser importado em outros módulos
app = celery_app
