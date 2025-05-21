"""
Rotas para autenticação e gerenciamento de usuários.
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import pyotp
import qrcode
import io
import base64
from typing import Any, List, Optional

from app.api.schemas.auth import (
    Token, UserLogin, UserRegistration, UserCreate, UserUpdate, 
    UserResponse, UserList, PasswordChange, PasswordReset,
    RefreshToken, TwoFactorSetup, TwoFactorVerify, OAuthRequest,
    Permission as PermissionSchema
)
from app.core.auth import (
    create_access_token, create_refresh_token, generate_tokens,
    get_current_user, get_current_active_user, get_current_superuser,
    require_role, require_permission, require_2fa, decode_token
)
from app.core.config import settings
from app.db.session import get_db
from app.db.repositories.user import user_repository, permission_repository
from app.models.user import User, Role, Provider, Permission
from app.services.security import (
    verify_password, get_password_hash, verify_totp,
    get_totp_uri, generate_totp_secret, check_password_strength
)
from app.services.oauth import (
    get_google_auth_url, get_microsoft_auth_url, get_github_auth_url,
    verify_google_token, verify_microsoft_token, verify_github_token
)
from app.services.email import send_password_reset_email, send_verification_email

# Rate limiting para endpoints sensíveis
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserRegistration,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Registra um novo usuário no sistema.
    """
    # Verifica se o email já está em uso
    db_user = user_repository.get_by_email(db, email=user_in.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Verifica se o username já está em uso
    db_user = user_repository.get_by_username(db, username=user_in.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already in use"
        )
    
    # Verificação adicional de senha
    password_check = check_password_strength(user_in.password)
    if not password_check["is_valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"password_errors": password_check["errors"]}
        )
    
    # Cria o usuário
    user_data = user_in.dict(exclude={"password"})
    user_data["role"] = Role.USER
    user_data["is_active"] = True  # Usuário ativo por padrão, pode mudar para False se quiser verificação por email
    user_data["auth_provider"] = Provider.LOCAL
    
    # Cria o usuário no banco de dados
    user = user_repository.create_user(
        db=db, 
        user_data=user_data, 
        plain_password=user_in.password
    )
    
    # Envia email de verificação em background
    if not settings.SKIP_EMAIL_VERIFICATION:
        verification_token = create_access_token(
            data={"sub": str(user.id), "type": "email_verification"},
            expires_delta=timedelta(hours=24)
        )
        background_tasks.add_task(
            send_verification_email,
            email=user.email,
            token=verification_token
        )
    
    return user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Autentica um usuário e retorna os tokens de acesso e refresh.
    """
    # Autentica o usuário
    user = user_repository.authenticate(db, email=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verifica se o usuário está ativo
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Atualiza o último login
    user_repository.update_last_login(db, user)
    
    # Gera os tokens
    tokens = generate_tokens(user)
    
    # Se o usuário tem 2FA habilitado, retorna flag especial
    if user.totp_secret:
        return {
            **tokens.dict(),
            "requires_2fa": True
        }
    
    return tokens


@router.post("/verify-2fa", response_model=Token)
async def verify_two_factor(
    totp_data: TwoFactorVerify,
    token: str = Depends(OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")),
    db: Session = Depends(get_db)
):
    """
    Verifica o código 2FA (TOTP) e retorna novo token com flag de verificação 2FA.
    """
    # Decodifica o token existente
    payload = decode_token(token)
    user_id = payload.get("sub")
    
    # Obtém o usuário
    user = user_repository.get(db, id=int(user_id))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Verifica se o usuário tem 2FA habilitado
    if not user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA not enabled for this user"
        )
    
    # Verifica o código TOTP
    if not verify_totp(user.totp_secret, totp_data.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 2FA code"
        )
    
    # Gera novos tokens com flag de 2FA verificado
    permissions = [p.name for p in user.permissions]
    token_data = {
        "sub": str(user.id),
        "role": user.role.value,
        "permissions": permissions,
        "2fa_verified": True  # Adiciona flag de 2FA verificado
    }
    
    access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(token_data, expires_delta=access_token_expires)
    refresh_token = create_refresh_token(token_data)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_data: RefreshToken,
    db: Session = Depends(get_db)
):
    """
    Renova o token de acesso usando o token de refresh.
    """
    try:
        # Decodifica o token de refresh
        payload = decode_token(refresh_data.refresh_token)
        
        # Verifica se é um token de refresh
        if not payload.get("refresh", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid refresh token"
            )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token"
            )
        
        # Obtém o usuário
        user = user_repository.get(db, id=int(user_id))
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Gera novos tokens
        tokens = generate_tokens(user)
        return tokens
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )


@router.post("/logout")
async def logout(
    response: Response,
    current_user: User = Depends(get_current_active_user)
):
    """
    Realiza o logout do usuário.
    
    Na implementação atual, o logout é tratado apenas no cliente, invalidando tokens.
    Em uma implementação mais robusta, tokens revogados seriam armazenados em uma blacklist.
    """
    # Aqui poderíamos adicionar o token atual a uma blacklist (redis por exemplo)
    # Por simplicidade, apenas retornamos sucesso e o cliente deve descartar os tokens
    
    return {"detail": "Successfully logged out"}


@router.post("/setup-2fa", response_model=TwoFactorSetup)
async def setup_two_factor(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Configura a autenticação de dois fatores (2FA) para o usuário.
    """
    # Habilita 2FA para o usuário
    result = user_repository.enable_2fa(db, current_user)
    totp_secret = result["totp_secret"]
    
    # Gera QR code para configuração do Google Authenticator
    totp_uri = get_totp_uri(totp_secret, current_user.email)
    
    # Gera QR code como imagem base64
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(totp_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered)
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    return {
        "totp_secret": totp_secret,
        "qr_code_url": f"data:image/png;base64,{img_str}"
    }


@router.post("/disable-2fa")
async def disable_two_factor(
    totp_data: TwoFactorVerify,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Desativa a autenticação de dois fatores (2FA) para o usuário.
    """
    # Verifica se o usuário tem 2FA habilitado
    if not current_user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA not enabled for this user"
        )
    
    # Verifica o código TOTP
    if not verify_totp(current_user.totp_secret, totp_data.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 2FA code"
        )
    
    # Desativa 2FA
    user_repository.disable_2fa(db, current_user)
    
    return {"detail": "2FA disabled successfully"}


@router.post("/password-reset-request")
async def request_password_reset(
    email: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Inicia o processo de redefinição de senha.
    """
    # Busca o usuário pelo email
    user = user_repository.get_by_email(db, email=email)
    
    # Mesmo que o usuário não exista, não revelamos isso por segurança
    if user:
        # Gera token de redefinição de senha
        reset_token = create_access_token(
            data={"sub": str(user.id), "type": "password_reset"},
            expires_delta=timedelta(hours=1)
        )
        
        # Envia email em background
        background_tasks.add_task(
            send_password_reset_email,
            email=user.email,
            token=reset_token
        )
    
    return {"detail": "If your email is registered, you will receive a password reset link"}


@router.post("/password-reset", response_model=UserResponse)
async def reset_password(
    reset_data: PasswordReset,
    db: Session = Depends(get_db)
):
    """
    Redefine a senha do usuário usando o token de redefinição.
    """
    try:
        # Decodifica o token
        payload = decode_token(reset_data.token)
        
        # Verifica se é um token de redefinição de senha
        if payload.get("type") != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token type"
            )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token"
            )
        
        # Obtém o usuário
        user = user_repository.get(db, id=int(user_id))
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verificação adicional de senha
        password_check = check_password_strength(reset_data.new_password)
        if not password_check["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"password_errors": password_check["errors"]}
            )
        
        # Atualiza a senha
        user = user_repository.update_password(db, user, reset_data.new_password)
        
        return user
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


@router.post("/verify-email")
async def verify_email(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Verifica o email do usuário usando o token de verificação.
    """
    try:
        # Decodifica o token
        payload = decode_token(token)
        
        # Verifica se é um token de verificação de email
        if payload.get("type") != "email_verification":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token type"
            )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token"
            )
        
        # Obtém o usuário
        user = user_repository.get(db, id=int(user_id))
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Marca o email como verificado
        user = user_repository.verify_email(db, user)
        
        return {"detail": "Email verified successfully"}
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


@router.post("/oauth/{provider}")
async def oauth_login(
    provider: str,
    oauth_data: OAuthRequest,
    db: Session = Depends(get_db)
):
    """
    Autentica o usuário via OAuth 2.0.
    """
    if provider == "google":
        user_info = verify_google_token(oauth_data.code, oauth_data.redirect_uri)
    elif provider == "microsoft":
        user_info = verify_microsoft_token(oauth_data.code, oauth_data.redirect_uri)
    elif provider == "github":
        user_info = verify_github_token(oauth_data.code, oauth_data.redirect_uri)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider: {provider}"
        )
    
    # Verifica se o usuário já existe pelo OAuth ID
    oauth_provider = getattr(Provider, provider.upper())
    user = user_repository.get_by_oauth_id(db, provider=oauth_provider, oauth_id=user_info["id"])
    
    if not user:
        # Verifica se existe usuário com mesmo email
        user = user_repository.get_by_email(db, email=user_info["email"])
        
        if user:
            # Associa a conta OAuth ao usuário existente
            user = user_repository.update(db, db_obj=user, obj_in={
                "auth_provider": oauth_provider,
                "oauth_id": user_info["id"]
            })
        else:
            # Cria um novo usuário
            username = user_info.get("username") or user_info["email"].split("@")[0]
            
            # Garante que o username é único
            base_username = username
            counter = 1
            while user_repository.get_by_username(db, username=username):
                username = f"{base_username}{counter}"
                counter += 1
            
            user_data = {
                "email": user_info["email"],
                "username": username,
                "full_name": user_info.get("name", ""),
                "auth_provider": oauth_provider,
                "oauth_id": user_info["id"],
                "is_active": True,
                "is_verified": True,  # Emails OAuth são considerados verificados
                "hashed_password": get_password_hash(secrets.token_urlsafe(16))  # Senha aleatória que não será usada
            }
            
            user = user_repository.create(db, obj_in=user_data)
    
    # Atualiza o último login
    user_repository.update_last_login(db, user)
    
    # Gera os tokens
    tokens = generate_tokens(user)
    
    return tokens


@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: User = Depends(get_current_active_user)
):
    """
    Retorna as informações do usuário autenticado.
    """
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_user_me(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Atualiza as informações do usuário autenticado.
    """
    # Verifica se o email já está em uso
    if user_in.email and user_in.email != current_user.email:
        db_user = user_repository.get_by_email(db, email=user_in.email)
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Verifica se o username já está em uso
    if user_in.username and user_in.username != current_user.username:
        db_user = user_repository.get_by_username(db, username=user_in.username)
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already in use"
            )
    
    # Campos que o usuário não pode alterar
    user_data = user_in.dict(exclude_unset=True)
    if "role" in user_data:
        del user_data["role"]
    if "is_superuser" in user_data:
        del user_data["is_superuser"]
    if "is_active" in user_data:
        del user_data["is_active"]
    
    # Atualiza o usuário
    user = user_repository.update(db, db_obj=current_user, obj_in=user_data)
    
    return user


@router.post("/me/change-password")
async def change_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Altera a senha do usuário autenticado.
    """
    # Verifica a senha atual
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password"
        )
    
    # Verificação adicional de senha
    password_check = check_password_strength(password_data.new_password)
    if not password_check["is_valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"password_errors": password_check["errors"]}
        )
    
    # Atualiza a senha
    user_repository.update_password(db, current_user, password_data.new_password)
    
    return {"detail": "Password updated successfully"}


# Rotas protegidas para administração de usuários
@router.get("/users", response_model=UserList)
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN))
):
    """
    Retorna a lista de usuários (apenas para administradores).
    """
    users = user_repository.get_multi(db, skip=skip, limit=limit)
    total = user_repository.count(db)
    
    return {
        "total": total,
        "items": users
    }


@router.get("/users/{user_id}", response_model=UserResponse)
async def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN))
):
    """
    Retorna as informações de um usuário específico (apenas para administradores).
    """
    user = user_repository.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN))
):
    """
    Cria um novo usuário (apenas para administradores).
    """
    # Verifica se o email já está em uso
    db_user = user_repository.get_by_email(db, email=user_in.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Verifica se o username já está em uso
    db_user = user_repository.get_by_username(db, username=user_in.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already in use"
        )
    
    # Verificação adicional de senha
    password_check = check_password_strength(user_in.password)
    if not password_check["is_valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"password_errors": password_check["errors"]}
        )
    
    # Prepara os dados do usuário
    user_data = user_in.dict(exclude={"password"})
    
    # Converte enums para valores do modelo
    user_data["role"] = getattr(Role, user_in.role.name)
    user_data["auth_provider"] = getattr(Provider, user_in.auth_provider.name)
    
    # Cria o usuário
    user = user_repository.create_user(
        db=db,
        user_data=user_data,
        plain_password=user_in.password
    )
    
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN))
):
    """
    Atualiza as informações de um usuário (apenas para administradores).
    """
    user = user_repository.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verifica se o email já está em uso
    if user_in.email and user_in.email != user.email:
        db_user = user_repository.get_by_email(db, email=user_in.email)
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Verifica se o username já está em uso
    if user_in.username and user_in.username != user.username:
        db_user = user_repository.get_by_username(db, username=user_in.username)
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already in use"
            )
    
    # Prepara os dados para atualização
    user_data = user_in.dict(exclude_unset=True)
    
    # Converte enum para valor do modelo
    if "role" in user_data:
        user_data["role"] = getattr(Role, user_in.role.name)
    
    # Atualiza o usuário
    updated_user = user_repository.update(db, db_obj=user, obj_in=user_data)
    
    return updated_user


@router.delete("/users/{user_id}", response_model=UserResponse)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN))
):
    """
    Remove um usuário (apenas para administradores).
    """
    user = user_repository.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Impede a remoção do próprio usuário administrador
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own user"
        )
    
    # Remove o usuário
    user = user_repository.delete(db, id=user_id)
    
    return user


# Gerenciamento de permissões
@router.get("/permissions", response_model=List[PermissionSchema])
async def read_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN))
):
    """
    Retorna todas as permissões disponíveis (apenas para administradores).
    """
    permissions = permission_repository.get_multi(db)
    return permissions


@router.post("/permissions/user/{user_id}", response_model=UserResponse)
async def add_user_permission(
    user_id: int,
    permission_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN))
):
    """
    Adiciona uma permissão a um usuário (apenas para administradores).
    """
    user = user_repository.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Obtém ou cria a permissão
    permission = permission_repository.create_if_not_exists(db, name=permission_name)
    
    # Adiciona a permissão ao usuário
    user = user_repository.add_permission(db, user, permission)
    
    return user


@router.delete("/permissions/user/{user_id}", response_model=UserResponse)
async def remove_user_permission(
    user_id: int,
    permission_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN))
):
    """
    Remove uma permissão de um usuário (apenas para administradores).
    """
    user = user_repository.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Obtém a permissão
    permission = permission_repository.get_by_name(db, name=permission_name)
    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found"
        )
    
    # Remove a permissão do usuário
    user = user_repository.remove_permission(db, user, permission)
    
    return user
