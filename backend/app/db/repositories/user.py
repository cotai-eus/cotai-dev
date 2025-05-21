"""
Repositório para operações com usuários, incluindo autenticação.
"""
from typing import List, Optional, Dict, Any, Union
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.repositories import BaseRepository
from app.models.user import User, Role, Provider, Permission
from app.services.security import (
    get_password_hash, 
    verify_password, 
    generate_totp_secret
)


class UserRepository(BaseRepository[User, int]):
    """
    Repositório para operações com usuários.
    Estende o repositório base com métodos específicos para usuários e autenticação.
    """
    def __init__(self):
        super().__init__(User)

    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        """
        Obtém um usuário pelo email.
        """
        return db.query(User).filter(User.email == email).first()

    def get_by_username(self, db: Session, username: str) -> Optional[User]:
        """
        Obtém um usuário pelo username.
        """
        return db.query(User).filter(User.username == username).first()

    def get_by_oauth_id(self, db: Session, provider: Provider, oauth_id: str) -> Optional[User]:
        """
        Obtém um usuário pelo ID do provedor OAuth.
        """
        return db.query(User).filter(
            User.auth_provider == provider, 
            User.oauth_id == oauth_id
        ).first()

    def get_active_users(self, db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        """
        Obtém todos os usuários ativos.
        """
        return db.query(User).filter(User.is_active == True).offset(skip).limit(limit).all()

    def get_superusers(self, db: Session) -> List[User]:
        """
        Obtém todos os super usuários.
        """
        return db.query(User).filter(User.is_superuser == True).all()

    def authenticate(self, db: Session, email: str, password: str) -> Optional[User]:
        """
        Autentica um usuário verificando email e senha.
        """
        user = self.get_by_email(db, email)
        if not user or not verify_password(password, user.hashed_password):
            return None
        return user

    def create_user(
        self, 
        db: Session, 
        user_data: Dict[str, Any], 
        plain_password: Optional[str] = None,
        auth_provider: Provider = Provider.LOCAL
    ) -> User:
        """
        Cria um novo usuário, gerando hash de senha se fornecida.
        """
        user_dict = user_data.copy()
        
        # Se fornecida senha e provider local, gera hash
        if plain_password and auth_provider == Provider.LOCAL:
            user_dict["hashed_password"] = get_password_hash(plain_password)
        elif auth_provider != Provider.LOCAL:
            user_dict["auth_provider"] = auth_provider
        
        # Garantir que superuser só pode ser criado explicitamente
        if "is_superuser" not in user_dict:
            user_dict["is_superuser"] = False
            
        # Definir papel/role padrão se não fornecido
        if "role" not in user_dict:
            user_dict["role"] = Role.USER
            
        # Gerar segredo TOTP se 2FA requerido
        if user_dict.get("require_2fa", False):
            user_dict["totp_secret"] = generate_totp_secret()
            
        # Remove campos extras que não são colunas do modelo
        if "require_2fa" in user_dict:
            del user_dict["require_2fa"]
            
        if "password" in user_dict:
            del user_dict["password"]
            
        return self.create(db, obj_in=user_dict)

    def update_password(self, db: Session, user: User, plain_password: str) -> User:
        """
        Atualiza a senha de um usuário.
        """
        hashed_password = get_password_hash(plain_password)
        return self.update(db, db_obj=user, obj_in={"hashed_password": hashed_password})

    def update_last_login(self, db: Session, user: User) -> User:
        """
        Atualiza o timestamp do último login e reseta tentativas de login.
        """
        update_data = {
            "last_login": datetime.utcnow().isoformat(),
            "failed_login_attempts": 0
        }
        return self.update(db, db_obj=user, obj_in=update_data)

    def increment_failed_login(self, db: Session, user: User) -> User:
        """
        Incrementa o contador de tentativas de login falhas.
        """
        update_data = {"failed_login_attempts": user.failed_login_attempts + 1}
        return self.update(db, db_obj=user, obj_in=update_data)

    def enable_2fa(self, db: Session, user: User) -> Dict[str, str]:
        """
        Ativa 2FA para um usuário e retorna segredo TOTP.
        """
        if not user.totp_secret:
            totp_secret = generate_totp_secret()
            self.update(db, db_obj=user, obj_in={"totp_secret": totp_secret})
        else:
            totp_secret = user.totp_secret
            
        return {"totp_secret": totp_secret}

    def disable_2fa(self, db: Session, user: User) -> User:
        """
        Desativa 2FA para um usuário.
        """
        return self.update(db, db_obj=user, obj_in={"totp_secret": None})

    def verify_email(self, db: Session, user: User) -> User:
        """
        Marca o email do usuário como verificado.
        """
        return self.update(db, db_obj=user, obj_in={"is_verified": True})

    def assign_role(self, db: Session, user: User, role: Role) -> User:
        """
        Atribui um papel/role ao usuário.
        """
        return self.update(db, db_obj=user, obj_in={"role": role})

    def add_permission(self, db: Session, user: User, permission: Permission) -> User:
        """
        Adiciona uma permissão ao usuário.
        """
        user.permissions.append(permission)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def remove_permission(self, db: Session, user: User, permission: Permission) -> User:
        """
        Remove uma permissão do usuário.
        """
        user.permissions.remove(permission)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user


class PermissionRepository(BaseRepository[Permission, int]):
    """
    Repositório para gerenciamento de permissões.
    """
    def __init__(self):
        super().__init__(Permission)

    def get_by_name(self, db: Session, name: str) -> Optional[Permission]:
        """
        Obtém uma permissão pelo nome.
        """
        return db.query(Permission).filter(Permission.name == name).first()

    def create_if_not_exists(self, db: Session, name: str, description: Optional[str] = None) -> Permission:
        """
        Cria uma permissão se ela não existir e a retorna.
        """
        permission = self.get_by_name(db, name)
        if not permission:
            permission_data = {"name": name}
            if description:
                permission_data["description"] = description
            permission = self.create(db, obj_in=permission_data)
        return permission


# Instâncias singleton dos repositórios
user_repository = UserRepository()
permission_repository = PermissionRepository()
