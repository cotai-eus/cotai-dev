"""
Schemas para autenticação e usuários.
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

from app.models.user import Role, Provider


class RoleEnum(str, Enum):
    """Enum para papéis/roles no sistema."""
    ADMIN = "admin"
    MANAGER = "manager"
    STAFF = "staff"
    USER = "user"


class ProviderEnum(str, Enum):
    """Enum para provedores de autenticação."""
    LOCAL = "local"
    GOOGLE = "google"
    MICROSOFT = "microsoft"
    GITHUB = "github"


class Token(BaseModel):
    """Schema para resposta de token de autenticação."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenPayload(BaseModel):
    """Schema para dados do payload JWT."""
    sub: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[List[str]] = []
    exp: Optional[float] = None
    iat: Optional[float] = None
    jti: Optional[str] = None
    refresh: Optional[bool] = False


class UserLogin(BaseModel):
    """Schema para login de usuário."""
    email: EmailStr
    password: str


class UserRegistration(BaseModel):
    """Schema para registro de usuário."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None
    
    @validator('password')
    def password_strength(cls, v):
        """Valida a força da senha."""
        if len(v) < 8:
            raise ValueError("A senha deve ter pelo menos 8 caracteres")
        if not any(c.isupper() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra maiúscula")
        if not any(c.islower() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra minúscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("A senha deve conter pelo menos um número")
        special_chars = "!@#$%^&*()-_=+[]{}|;:,.<>?/~`"
        if not any(c in special_chars for c in v):
            raise ValueError("A senha deve conter pelo menos um caractere especial")
        return v
    
    @validator('username')
    def username_validate(cls, v):
        """Valida o formato do nome de usuário."""
        if not v.isalnum() and not any(c in "_-" for c in v):
            raise ValueError("Nome de usuário deve conter apenas letras, números, '_' ou '-'")
        return v


class UserCreate(UserRegistration):
    """Schema para criação de usuário (admin)."""
    role: Optional[RoleEnum] = RoleEnum.USER
    is_active: bool = True
    is_superuser: bool = False
    auth_provider: ProviderEnum = ProviderEnum.LOCAL


class UserUpdate(BaseModel):
    """Schema para atualização de usuário."""
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[RoleEnum] = None


class PasswordChange(BaseModel):
    """Schema para alterar senha."""
    current_password: str
    new_password: str
    
    @validator('new_password')
    def password_strength(cls, v):
        """Valida a força da senha."""
        if len(v) < 8:
            raise ValueError("A senha deve ter pelo menos 8 caracteres")
        if not any(c.isupper() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra maiúscula")
        if not any(c.islower() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra minúscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("A senha deve conter pelo menos um número")
        special_chars = "!@#$%^&*()-_=+[]{}|;:,.<>?/~`"
        if not any(c in special_chars for c in v):
            raise ValueError("A senha deve conter pelo menos um caractere especial")
        return v


class PasswordReset(BaseModel):
    """Schema para redefinição de senha."""
    token: str
    new_password: str
    
    @validator('new_password')
    def password_strength(cls, v):
        """Valida a força da senha."""
        if len(v) < 8:
            raise ValueError("A senha deve ter pelo menos 8 caracteres")
        if not any(c.isupper() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra maiúscula")
        if not any(c.islower() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra minúscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("A senha deve conter pelo menos um número")
        special_chars = "!@#$%^&*()-_=+[]{}|;:,.<>?/~`"
        if not any(c in special_chars for c in v):
            raise ValueError("A senha deve conter pelo menos um caractere especial")
        return v


class RefreshToken(BaseModel):
    """Schema para requisição de refresh token."""
    refresh_token: str


class TwoFactorSetup(BaseModel):
    """Schema para configuração de 2FA."""
    totp_secret: str
    qr_code_url: str


class TwoFactorVerify(BaseModel):
    """Schema para verificação de código 2FA."""
    code: str = Field(..., min_length=6, max_length=6)


class UserResponse(BaseModel):
    """Schema para resposta com dados do usuário."""
    id: int
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    is_active: bool
    is_superuser: bool
    role: RoleEnum
    auth_provider: ProviderEnum
    last_login: Optional[str] = None
    has_2fa: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True


class UserList(BaseModel):
    """Schema para listagem de usuários."""
    total: int
    items: List[UserResponse]
    
    class Config:
        orm_mode = True


class OAuthRequest(BaseModel):
    """Schema para requisição de autenticação OAuth."""
    provider: ProviderEnum
    code: str
    redirect_uri: str


class Permission(BaseModel):
    """Schema para permissão."""
    id: int
    name: str
    description: Optional[str] = None
    
    class Config:
        orm_mode = True
