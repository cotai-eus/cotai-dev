"""
Modelo de exemplo para demonstrar o uso do ORM.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, Table, Enum
from sqlalchemy.orm import relationship
from uuid import uuid4
import enum

from app.models.base import BaseModel


class Role(enum.Enum):
    """Enum de papéis/roles disponíveis no sistema."""
    ADMIN = "admin"
    MANAGER = "manager"
    STAFF = "staff"
    USER = "user"


class Provider(enum.Enum):
    """Provedores de autenticação OAuth."""
    LOCAL = "local"
    GOOGLE = "google"
    MICROSOFT = "microsoft"
    GITHUB = "github"


# Tabela de associação para relacionamento many-to-many entre usuários e permissões
user_permission = Table(
    "user_permission",
    BaseModel.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id"), primary_key=True)
)


class Permission(BaseModel):
    """
    Modelo para permissões no sistema.
    """
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    
    # Relacionamentos
    users = relationship("User", secondary=user_permission, back_populates="permissions")

    def __repr__(self):
        return f"<Permission {self.name}>"


class User(BaseModel):
    """
    Modelo para usuários do sistema.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
    # Novos campos para autenticação e autorização
    role = Column(Enum(Role), default=Role.USER, nullable=False)
    auth_provider = Column(Enum(Provider), default=Provider.LOCAL, nullable=False)
    oauth_id = Column(String(255))  # ID no provedor externo para usuários OAuth
    totp_secret = Column(String(255))  # Segredo para 2FA/TOTP
    is_verified = Column(Boolean, default=False)  # Email verificado
    failed_login_attempts = Column(Integer, default=0)  # Controle de tentativas de login
    last_login = Column(String(255))  # Último login bem-sucedido

    # Relacionamentos
    items = relationship("Item", back_populates="owner")
    permissions = relationship("Permission", secondary=user_permission, back_populates="users")

    def __repr__(self):
        return f"<User {self.username}>"


class Item(BaseModel):
    """
    Modelo para itens genéricos.
    """
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), index=True, nullable=False)
    description = Column(Text)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    # Relacionamentos
    owner = relationship("User", back_populates="items")

    def __repr__(self):
        return f"<Item {self.title}>"
