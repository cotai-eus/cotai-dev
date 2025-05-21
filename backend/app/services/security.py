"""
Serviço de segurança para autenticação e autorização.
"""
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
from fastapi import Depends, HTTPException, status
from jose import jwt, JWTError
import pyotp
import os
import base64

from app.core.config import settings
from app.models.user import User, Role, Permission

# Contexto de criptografia para senhas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def generate_totp_secret():
    """Gera um segredo para autenticação TOTP (2FA)."""
    return base64.b32encode(os.urandom(20)).decode("utf-8")


def verify_totp(totp_secret: str, totp_code: str) -> bool:
    """Verifica um código TOTP (Time-based One-Time Password)."""
    if not totp_secret or not totp_code:
        return False
    
    totp = pyotp.TOTP(totp_secret)
    return totp.verify(totp_code)


def get_totp_uri(totp_secret: str, email: str) -> str:
    """Obtém a URI para configuração do Google Authenticator ou similar."""
    totp = pyotp.TOTP(totp_secret)
    return totp.provisioning_uri(name=email, issuer_name=settings.PROJECT_NAME)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha em texto corresponde ao hash armazenado."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Gera um hash bcrypt para a senha."""
    return pwd_context.hash(password)


def check_password_strength(password: str) -> Dict[str, Any]:
    """
    Verifica a força da senha baseado em critérios de segurança.
    Retorna um dicionário com resultado da validação e mensagens de erro.
    """
    errors = []
    is_valid = True
    
    # Tamanho mínimo
    if len(password) < 8:
        errors.append("A senha deve ter pelo menos 8 caracteres")
        is_valid = False
    
    # Verifica caracteres minúsculos
    if not any(c.islower() for c in password):
        errors.append("A senha deve conter pelo menos uma letra minúscula")
        is_valid = False
    
    # Verifica caracteres maiúsculos
    if not any(c.isupper() for c in password):
        errors.append("A senha deve conter pelo menos uma letra maiúscula")
        is_valid = False
    
    # Verifica números
    if not any(c.isdigit() for c in password):
        errors.append("A senha deve conter pelo menos um número")
        is_valid = False
    
    # Verifica caracteres especiais
    special_chars = "!@#$%^&*()-_=+[]{}|;:,.<>?/~`"
    if not any(c in special_chars for c in password):
        errors.append("A senha deve conter pelo menos um caractere especial")
        is_valid = False
    
    return {
        "is_valid": is_valid,
        "errors": errors
    }


def has_role(user: User, required_role: Role) -> bool:
    """Verifica se o usuário tem o papel/role necessário."""
    if user.is_superuser:
        return True
    
    # Roles em ordem de privilégio (do maior para o menor)
    role_hierarchy = [Role.ADMIN, Role.MANAGER, Role.STAFF, Role.USER]
    
    # Verifica se o papel do usuário tem privilégio igual ou maior ao requerido
    user_role_index = role_hierarchy.index(user.role)
    required_role_index = role_hierarchy.index(required_role)
    
    return user_role_index <= required_role_index


def has_permission(user: User, permission_name: str) -> bool:
    """Verifica se o usuário tem a permissão específica."""
    if user.is_superuser:
        return True
    
    return any(p.name == permission_name for p in user.permissions)
