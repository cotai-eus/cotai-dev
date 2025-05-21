from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timedelta
import time
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.db.repositories.user import user_repository
from app.models.user import User, Role, Permission
from app.services.security import has_role, has_permission, verify_totp


oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


class TokenData(BaseModel):
    """Modelo para dados armazenados no token JWT."""
    user_id: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[List[str]] = None
    exp: Optional[int] = None
    jti: Optional[str] = None  # JWT ID, para controle de logout/revogação


class TokenResponse(BaseModel):
    """Modelo para resposta de criação de token."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # Duração em segundos do token de acesso


class UserInfo(BaseModel):
    """Modelo para informações do usuário autenticado."""
    id: int
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    is_active: bool
    is_superuser: bool
    role: str
    requires_2fa: bool = False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Cria um token JWT de acesso."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire.timestamp(),
        "iat": datetime.utcnow().timestamp(),  # Issued At
        "jti": str(time.time())  # JWT ID único
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Cria um token JWT de refresh."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire.timestamp(),
        "iat": datetime.utcnow().timestamp(),  # Issued At
        "jti": str(time.time()),  # JWT ID único
        "refresh": True  # Marca que é um token de refresh
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def generate_tokens(user: User) -> TokenResponse:
    """Gera tokens de acesso e refresh para um usuário."""
    # Extrai as permissões do usuário
    permissions = [p.name for p in user.permissions]
    
    # Dados a serem armazenados no token
    token_data = {
        "sub": str(user.id),
        "role": user.role.value,
        "permissions": permissions
    }
    
    # Gera os tokens
    access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(token_data, expires_delta=access_token_expires)
    refresh_token = create_refresh_token(token_data)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


def decode_token(token: str) -> Dict[str, Any]:
    """Decodifica um token JWT e retorna seus dados."""
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_user_from_token(token_data: TokenData, db: Session) -> User:
    """Obtém o usuário a partir dos dados do token."""
    user = user_repository.get(db, id=int(token_data.user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
) -> User:
    """Verifica o token JWT e retorna o usuário atual."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(
            user_id=user_id,
            role=payload.get("role"),
            permissions=payload.get("permissions", []),
            exp=payload.get("exp"),
            jti=payload.get("jti")
        )
    except JWTError:
        raise credentials_exception
    
    # Obtém o usuário do banco de dados
    user = get_user_from_token(token_data, db)
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Verifica se o usuário atual está ativo."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_superuser(current_user: User = Depends(get_current_active_user)) -> User:
    """Verifica se o usuário atual é um superusuário."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not enough permissions"
        )
    return current_user


def require_role(required_role: Role):
    """
    Dependency que verifica se o usuário tem o papel/role necessário.
    Uso: @app.get("/admin", dependencies=[Depends(require_role(Role.ADMIN))])
    """
    async def role_dependency(current_user: User = Depends(get_current_active_user)):
        if not has_role(current_user, required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {required_role.value} required"
            )
        return current_user
    return role_dependency


def require_permission(permission_name: str):
    """
    Dependency que verifica se o usuário tem a permissão específica.
    Uso: @app.get("/reports", dependencies=[Depends(require_permission("reports:read"))])
    """
    async def permission_dependency(current_user: User = Depends(get_current_active_user)):
        if not has_permission(current_user, permission_name):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission {permission_name} required"
            )
        return current_user
    return permission_dependency


def require_2fa(request: Request, current_user: User = Depends(get_current_active_user)):
    """
    Verifica se o usuário já realizou autenticação 2FA (TOTP) para esta sessão.
    """
    # Verifica se o usuário tem 2FA configurado
    if not current_user.totp_secret:
        # Se não tem 2FA configurado, permite passar
        return current_user
    
    # Verifica se o código TOTP foi enviado e validado
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    token = auth_header.replace("Bearer ", "")
    payload = decode_token(token)
    
    # Verifica se o token contém a flag de 2FA validado
    if not payload.get("2fa_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="2FA verification required",
            headers={"X-Requires-2FA": "true"}
        )
    
    return current_user


# Rate limiting baseado em IP ou usuário pode ser implementado com um middleware
class RateLimiter:
    """
    Middleware para implementar rate limiting.
    """
    def __init__(self, times: int = 100, seconds: int = 60):
        self.times = times
        self.seconds = seconds
        self.requests = {}
    
    def _get_key(self, request: Request):
        # Chave baseada em IP ou usuário autenticado
        if request.user.is_authenticated:
            return f"user_{request.user.id}"
        return f"ip_{request.client.host}"
    
    async def __call__(self, request: Request):
        key = self._get_key(request)
        now = time.time()
        request_times = self.requests.get(key, [])
        
        # Remove registros expirados
        request_times = [t for t in request_times if t > now - self.seconds]
        
        # Verifica limite
        if len(request_times) >= self.times:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests"
            )
        
        # Registra esta requisição
        request_times.append(now)
        self.requests[key] = request_times
        
        return None
