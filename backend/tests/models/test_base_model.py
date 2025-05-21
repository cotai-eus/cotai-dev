"""
Testes para modelos base.
"""
import pytest
from datetime import datetime

from app.models.user import User, Item
from app.models.base import BaseModel


def test_base_model_timestamps():
    """
    Testa se o modelo base possui timestamps.
    """
    # Cria uma instância de User (que herda de BaseModel)
    user = User(email="test@example.com", username="testuser", hashed_password="hashedpassword")
    
    # Verifica se os campos de timestamp estão presentes
    assert hasattr(user, "created_at"), "O campo created_at não está presente no modelo"
    assert hasattr(user, "updated_at"), "O campo updated_at não está presente no modelo"


def test_to_dict_method(db_session):
    """
    Testa o método to_dict() do modelo base.
    """
    # Cria um usuário
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password="hashedpassword",
        full_name="Test User",
        is_active=True,
        is_superuser=False
    )
    
    # Adiciona ao banco de dados
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    # Converte para dicionário
    user_dict = user.to_dict()
    
    # Verifica se os campos estão presentes
    assert "id" in user_dict
    assert "email" in user_dict
    assert "username" in user_dict
    assert "hashed_password" in user_dict
    assert "full_name" in user_dict
    assert "is_active" in user_dict
    assert "is_superuser" in user_dict
    assert "created_at" in user_dict
    assert "updated_at" in user_dict
    
    # Verifica os valores
    assert user_dict["email"] == "test@example.com"
    assert user_dict["username"] == "testuser"
    assert isinstance(user_dict["created_at"], datetime)
    assert isinstance(user_dict["updated_at"], datetime)


def test_from_dict_method():
    """
    Testa o método from_dict() do modelo base.
    """
    # Cria um dicionário com dados de usuário
    user_data = {
        "email": "test@example.com",
        "username": "testuser",
        "hashed_password": "hashedpassword",
        "full_name": "Test User",
        "is_active": True,
        "is_superuser": False,
        "extra_field": "Este campo não deve ser incluído"
    }
    
    # Cria um usuário a partir do dicionário
    user = User.from_dict(user_data)
    
    # Verifica se os campos foram corretamente atribuídos
    assert user.email == "test@example.com"
    assert user.username == "testuser"
    assert user.hashed_password == "hashedpassword"
    assert user.full_name == "Test User"
    assert user.is_active == True
    assert user.is_superuser == False
    
    # Verifica se o campo extra não foi incluído
    assert not hasattr(user, "extra_field")
