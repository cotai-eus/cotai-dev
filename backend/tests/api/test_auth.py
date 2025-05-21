"""
Testes para as rotas de autenticação.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import json
import pyotp

from app.main import app
from app.core.config import settings
from app.models.user import User, Role
from app.services.security import get_password_hash, generate_totp_secret
from app.db.repositories.user import user_repository, permission_repository
from tests.conftest import override_get_db


# Client de teste
client = TestClient(app)


@pytest.fixture
def normal_user_token(db: Session):
    """Gera um token para um usuário comum."""
    # Cria usuário para teste
    user = User(
        email="user@example.com",
        username="testuser",
        hashed_password=get_password_hash("password123"),
        full_name="Test User",
        is_active=True,
        is_superuser=False,
        role=Role.USER,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Login para obter token
    login_data = {
        "username": "user@example.com",
        "password": "password123"
    }
    response = client.post(f"{settings.API_V1_PREFIX}/auth/login", data=login_data)
    return response.json()["access_token"]


@pytest.fixture
def admin_user_token(db: Session):
    """Gera um token para um usuário administrador."""
    # Cria administrador para teste
    admin = User(
        email="admin@example.com",
        username="testadmin",
        hashed_password=get_password_hash("admin123"),
        full_name="Admin User",
        is_active=True,
        is_superuser=True,
        role=Role.ADMIN,
        is_verified=True
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    # Login para obter token
    login_data = {
        "username": "admin@example.com",
        "password": "admin123"
    }
    response = client.post(f"{settings.API_V1_PREFIX}/auth/login", data=login_data)
    return response.json()["access_token"]


@pytest.fixture
def user_with_2fa(db: Session):
    """Cria um usuário com 2FA ativado."""
    totp_secret = generate_totp_secret()
    user = User(
        email="2fa@example.com",
        username="2fauser",
        hashed_password=get_password_hash("secure123"),
        full_name="2FA User",
        is_active=True,
        is_superuser=False,
        role=Role.USER,
        is_verified=True,
        totp_secret=totp_secret
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_register_user():
    """Testa o registro de um novo usuário."""
    user_data = {
        "email": "new@example.com",
        "username": "newuser",
        "password": "StrongP@ssw0rd",
        "full_name": "New User"
    }
    response = client.post(f"{settings.API_V1_PREFIX}/auth/register", json=user_data)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["username"] == user_data["username"]
    assert "id" in data


def test_login_user():
    """Testa o login de um usuário."""
    # Primeiro registra um usuário
    user_data = {
        "email": "login@example.com",
        "username": "loginuser",
        "password": "SecureP@ss123",
        "full_name": "Login Test"
    }
    client.post(f"{settings.API_V1_PREFIX}/auth/register", json=user_data)
    
    # Tenta fazer login
    login_data = {
        "username": user_data["email"],
        "password": user_data["password"]
    }
    response = client.post(f"{settings.API_V1_PREFIX}/auth/login", data=login_data)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_get_current_user(normal_user_token):
    """Testa a obtenção de informações do usuário atual."""
    headers = {"Authorization": f"Bearer {normal_user_token}"}
    response = client.get(f"{settings.API_V1_PREFIX}/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "user@example.com"
    assert data["username"] == "testuser"


def test_refresh_token(db: Session):
    """Testa a renovação do token de acesso usando um refresh token."""
    # Cria usuário e obtém tokens
    user_data = {
        "email": "refresh@example.com",
        "username": "refreshuser",
        "password": "RefreshP@ss123",
        "full_name": "Refresh Test"
    }
    client.post(f"{settings.API_V1_PREFIX}/auth/register", json=user_data)
    
    # Login para obter tokens
    login_data = {
        "username": user_data["email"],
        "password": user_data["password"]
    }
    login_response = client.post(f"{settings.API_V1_PREFIX}/auth/login", data=login_data)
    tokens = login_response.json()
    
    # Usa o refresh token para obter um novo access token
    refresh_data = {
        "refresh_token": tokens["refresh_token"]
    }
    response = client.post(f"{settings.API_V1_PREFIX}/auth/refresh", json=refresh_data)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_two_factor_auth(user_with_2fa, db: Session):
    """Testa o processo de autenticação de dois fatores."""
    # Tenta fazer login
    login_data = {
        "username": user_with_2fa.email,
        "password": "secure123"
    }
    response = client.post(f"{settings.API_V1_PREFIX}/auth/login", data=login_data)
    assert response.status_code == 200
    data = response.json()
    assert data["requires_2fa"] is True
    assert "partial_token" in data
    
    # Gera código TOTP e verifica
    totp = pyotp.TOTP(user_with_2fa.totp_secret)
    code = totp.now()
    
    verify_data = {
        "partial_token": data["partial_token"],
        "totp_code": code
    }
    verify_response = client.post(
        f"{settings.API_V1_PREFIX}/auth/verify-2fa", 
        json=verify_data
    )
    assert verify_response.status_code == 200
    verify_data = verify_response.json()
    assert "access_token" in verify_data
    assert "refresh_token" in verify_data


def test_oauth_login():
    """Testa a obtenção da URL de autenticação OAuth."""
    response = client.get(f"{settings.API_V1_PREFIX}/auth/oauth/google")
    assert response.status_code == 200
    data = response.json()
    assert "authorization_url" in data


def test_change_password(normal_user_token):
    """Testa a alteração de senha."""
    headers = {"Authorization": f"Bearer {normal_user_token}"}
    password_data = {
        "current_password": "password123",
        "new_password": "NewStrongP@ss456"
    }
    response = client.post(
        f"{settings.API_V1_PREFIX}/auth/change-password", 
        json=password_data,
        headers=headers
    )
    assert response.status_code == 200


def test_logout(normal_user_token):
    """Testa o logout do usuário."""
    headers = {"Authorization": f"Bearer {normal_user_token}"}
    response = client.post(f"{settings.API_V1_PREFIX}/auth/logout", headers=headers)
    assert response.status_code == 200
    
    # Verifica se o token foi invalidado
    get_me_response = client.get(f"{settings.API_V1_PREFIX}/auth/me", headers=headers)
    assert get_me_response.status_code == 401


def test_rbac(admin_user_token, normal_user_token):
    """Testa o controle de acesso baseado em papéis."""
    # O admin deve ter acesso à rota de admin
    admin_headers = {"Authorization": f"Bearer {admin_user_token}"}
    admin_response = client.get(
        f"{settings.API_V1_PREFIX}/auth/admin-only",
        headers=admin_headers
    )
    assert admin_response.status_code == 200
    
    # O usuário normal não deve ter acesso à rota de admin
    user_headers = {"Authorization": f"Bearer {normal_user_token}"}
    user_response = client.get(
        f"{settings.API_V1_PREFIX}/auth/admin-only",
        headers=user_headers
    )
    assert user_response.status_code == 403
