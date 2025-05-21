"""
Testes para o repositório base.
"""
import pytest
from typing import Dict, Any

from app.db.repositories import BaseRepository
from app.models.user import User, Item


class UserRepository(BaseRepository[User, int]):
    """Repositório de teste para usuários."""
    def __init__(self):
        super().__init__(User)


@pytest.fixture
def user_repo():
    """Fixture para o repositório de usuários."""
    return UserRepository()


@pytest.fixture
def sample_user() -> Dict[str, Any]:
    """Fixture para um usuário de exemplo."""
    return {
        "email": "test@example.com",
        "username": "testuser",
        "hashed_password": "hashedpassword",
        "full_name": "Test User",
        "is_active": True,
        "is_superuser": False
    }


def test_create_user(db_session, user_repo, sample_user):
    """
    Testa a criação de um usuário através do repositório.
    """
    # Cria o usuário
    user = user_repo.create(db_session, obj_in=sample_user)
    
    # Verifica se o usuário foi criado corretamente
    assert user.id is not None
    assert user.email == sample_user["email"]
    assert user.username == sample_user["username"]
    assert user.hashed_password == sample_user["hashed_password"]
    assert user.full_name == sample_user["full_name"]
    assert user.is_active == sample_user["is_active"]
    assert user.is_superuser == sample_user["is_superuser"]


def test_get_user(db_session, user_repo, sample_user):
    """
    Testa a obtenção de um usuário através do repositório.
    """
    # Cria o usuário
    user = user_repo.create(db_session, obj_in=sample_user)
    
    # Obtém o usuário
    retrieved_user = user_repo.get(db_session, id=user.id)
    
    # Verifica se o usuário foi obtido corretamente
    assert retrieved_user is not None
    assert retrieved_user.id == user.id
    assert retrieved_user.email == user.email
    assert retrieved_user.username == user.username


def test_update_user(db_session, user_repo, sample_user):
    """
    Testa a atualização de um usuário através do repositório.
    """
    # Cria o usuário
    user = user_repo.create(db_session, obj_in=sample_user)
    
    # Atualiza o usuário
    update_data = {"full_name": "Updated Name", "is_active": False}
    updated_user = user_repo.update(db_session, db_obj=user, obj_in=update_data)
    
    # Verifica se o usuário foi atualizado corretamente
    assert updated_user.id == user.id
    assert updated_user.full_name == "Updated Name"
    assert updated_user.is_active == False
    # Verifica se os outros campos permanecem inalterados
    assert updated_user.email == user.email
    assert updated_user.username == user.username


def test_delete_user(db_session, user_repo, sample_user):
    """
    Testa a exclusão de um usuário através do repositório.
    """
    # Cria o usuário
    user = user_repo.create(db_session, obj_in=sample_user)
    
    # Obtém o ID do usuário
    user_id = user.id
    
    # Exclui o usuário
    deleted_user = user_repo.delete(db_session, id=user_id)
    
    # Verifica se o usuário foi excluído corretamente
    assert deleted_user.id == user_id
    
    # Verifica se o usuário não pode mais ser encontrado
    retrieved_user = user_repo.get(db_session, id=user_id)
    assert retrieved_user is None


def test_get_multi_users(db_session, user_repo):
    """
    Testa a obtenção de múltiplos usuários através do repositório.
    """
    # Cria múltiplos usuários
    users_data = [
        {
            "email": f"user{i}@example.com",
            "username": f"user{i}",
            "hashed_password": "hashedpassword",
            "full_name": f"User {i}",
            "is_active": True,
            "is_superuser": False
        }
        for i in range(5)
    ]
    
    for user_data in users_data:
        user_repo.create(db_session, obj_in=user_data)
    
    # Obtém todos os usuários
    users = user_repo.get_multi(db_session)
    
    # Verifica se todos os usuários foram obtidos
    assert len(users) >= 5  # Pode haver mais usuários de outros testes


def test_count_users(db_session, user_repo, sample_user):
    """
    Testa a contagem de usuários através do repositório.
    """
    # Conta os usuários iniciais
    initial_count = user_repo.count(db_session)
    
    # Cria um novo usuário
    user_repo.create(db_session, obj_in=sample_user)
    
    # Conta os usuários novamente
    new_count = user_repo.count(db_session)
    
    # Verifica se a contagem aumentou em 1
    assert new_count == initial_count + 1


def test_exists_user(db_session, user_repo, sample_user):
    """
    Testa a verificação de existência de um usuário através do repositório.
    """
    # Cria o usuário
    user = user_repo.create(db_session, obj_in=sample_user)
    
    # Verifica se o usuário existe
    assert user_repo.exists(db_session, id=user.id) is True
    
    # Verifica um ID que não deve existir
    assert user_repo.exists(db_session, id=999999) is False
