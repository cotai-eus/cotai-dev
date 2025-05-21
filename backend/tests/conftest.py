"""
Configurações para testes, incluindo testes de performance, fixtures e mocks.
"""
import os
import json
import time
import pytest
from functools import wraps
from pathlib import Path
from typing import Dict, List, Any, Callable
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.db.session import Base
from app.models.user import User, Item  # Importamos os modelos aqui para que sejam criados no banco de teste


# Substitui a URL do banco de dados para testes em memória ou um banco temporário
TEST_SQLALCHEMY_DATABASE_URI = "postgresql+psycopg://postgres:postgres@localhost:5432/test_cotai"


@pytest.fixture(scope="session")
def test_engine():
    """
    Cria uma engine de teste para o SQLAlchemy.
    """
    engine = create_engine(
        TEST_SQLALCHEMY_DATABASE_URI,
        poolclass=NullPool,
    )
    # Cria todas as tabelas no banco de teste
    Base.metadata.create_all(bind=engine)
    yield engine
    # Limpa as tabelas ao final
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(test_engine):
    """
    Cria uma sessão de teste para cada função de teste.
    """
    connection = test_engine.connect()
    transaction = connection.begin()
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    session = SessionLocal()
    
    yield session
    
    # Limpa a sessão ao final de cada teste
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="session")
def mongodb_client():
    """
    Cria um cliente MongoDB para testes.
    """
    from pymongo import MongoClient
    
    # Use a URL do MongoDB de teste
    client = MongoClient(settings.MONGODB_URI)
    yield client
    
    # Limpa o banco de dados ao final
    client.drop_database(settings.MONGO_INITDB_DATABASE)


# Client fixture for FastAPI application
@pytest.fixture
def client():
    """
    Create a test client for the FastAPI application
    """
    with TestClient(app) as test_client:
        yield test_client


# Performance testing fixtures
@pytest.fixture
def performance_metrics():
    """
    Fixture to collect and report performance metrics
    """
    metrics = []
    
    def _add_metric(name: str, value: float, unit: str = "ms"):
        metrics.append({"name": name, "value": value, "unit": unit})
    
    yield _add_metric
    
    # After the test, write metrics to a report file
    report_dir = Path(__file__).parent / "reports" / "performance"
    report_dir.mkdir(exist_ok=True, parents=True)
    
    report_file = report_dir / f"perf_metrics_{time.strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, "w") as f:
        json.dump(metrics, f, indent=2)

def performance_test(threshold: float = 200.0):
    """
    Decorator for performance tests that measures execution time
    and fails if it exceeds the threshold (in milliseconds)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            result = func(*args, **kwargs)
            elapsed_time = (time.time() - start_time) * 1000  # Convert to ms
            
            # Find performance_metrics fixture in args if present
            perf_metric = None
            for arg in args:
                if callable(getattr(arg, '__call__', None)):
                    perf_metric = arg
                    break
            
            if perf_metric:
                perf_metric(func.__name__, elapsed_time)
            
            assert elapsed_time <= threshold, (
                f"Performance test failed: {func.__name__} took {elapsed_time:.2f}ms, "
                f"which exceeds the threshold of {threshold:.2f}ms"
            )
            
            return result
        return wrapper
    return decorator


# Mock data fixture
@pytest.fixture
def mock_data():
    """
    Fixture to load mock data for tests
    """
    mock_data_dir = Path(__file__).parent / "fixtures"
    mock_data_dir.mkdir(exist_ok=True, parents=True)
    
    def _load_mock_data(filename: str) -> Dict:
        file_path = mock_data_dir / filename
        if not file_path.exists():
            raise FileNotFoundError(f"Mock data file not found: {file_path}")
        
        with open(file_path, "r") as f:
            return json.load(f)
    
    return _load_mock_data


# Authentication fixtures
@pytest.fixture
def auth_headers():
    """
    Fixture to generate authentication headers for testing protected endpoints
    """
    from app.core.auth import create_access_token
    
    def _get_token_headers(user_id: str = "test-user", scopes: List[str] = None):
        token_data = {
            "sub": user_id,
            "scopes": scopes or ["user"]
        }
        token = create_access_token(token_data)
        return {"Authorization": f"Bearer {token}"}
    
    return _get_token_headers
