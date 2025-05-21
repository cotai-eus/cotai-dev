"""
Arquivo para execução dos workers Celery.
Para iniciar os workers:
$ celery -A worker worker --loglevel=info
"""
import os
from app.core.celery import app

# Exporta o app Celery para que possa ser importado pelo CLI do Celery
if __name__ == '__main__':
    app.start()
