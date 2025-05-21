"""
Serviço para autenticação OAuth.
"""
import requests
import json
from typing import Dict, Any

from app.core.config import settings

# Google OAuth
def get_google_auth_url(redirect_uri: str) -> str:
    """
    Retorna a URL para autenticação Google OAuth.
    """
    return (
        f"https://accounts.google.com/o/oauth2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
    )


def verify_google_token(code: str, redirect_uri: str) -> Dict[str, Any]:
    """
    Verifica o código de autorização do Google e retorna informações do usuário.
    """
    # Troca o código de autorização por um token de acesso
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }
    
    token_response = requests.post(token_url, data=token_data)
    if token_response.status_code != 200:
        raise Exception(f"Google OAuth error: {token_response.text}")
    
    token_json = token_response.json()
    access_token = token_json["access_token"]
    
    # Obtém informações do usuário
    user_info_url = "https://www.googleapis.com/oauth2/v1/userinfo"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    user_response = requests.get(user_info_url, headers=headers)
    if user_response.status_code != 200:
        raise Exception(f"Google user info error: {user_response.text}")
    
    user_info = user_response.json()
    
    return {
        "id": user_info["id"],
        "email": user_info["email"],
        "name": user_info.get("name"),
        "picture": user_info.get("picture")
    }


# Microsoft OAuth
def get_microsoft_auth_url(redirect_uri: str) -> str:
    """
    Retorna a URL para autenticação Microsoft OAuth.
    """
    return (
        f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize"
        f"?client_id={settings.MICROSOFT_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile%20User.Read"
    )


def verify_microsoft_token(code: str, redirect_uri: str) -> Dict[str, Any]:
    """
    Verifica o código de autorização da Microsoft e retorna informações do usuário.
    """
    # Troca o código de autorização por um token de acesso
    token_url = f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/token"
    token_data = {
        "code": code,
        "client_id": settings.MICROSOFT_CLIENT_ID,
        "client_secret": settings.MICROSOFT_CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }
    
    token_response = requests.post(token_url, data=token_data)
    if token_response.status_code != 200:
        raise Exception(f"Microsoft OAuth error: {token_response.text}")
    
    token_json = token_response.json()
    access_token = token_json["access_token"]
    
    # Obtém informações do usuário
    user_info_url = "https://graph.microsoft.com/v1.0/me"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    user_response = requests.get(user_info_url, headers=headers)
    if user_response.status_code != 200:
        raise Exception(f"Microsoft user info error: {user_response.text}")
    
    user_info = user_response.json()
    
    return {
        "id": user_info["id"],
        "email": user_info["mail"] or user_info["userPrincipalName"],
        "name": user_info.get("displayName")
    }


# GitHub OAuth
def get_github_auth_url(redirect_uri: str) -> str:
    """
    Retorna a URL para autenticação GitHub OAuth.
    """
    return (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=user:email"
    )


def verify_github_token(code: str, redirect_uri: str) -> Dict[str, Any]:
    """
    Verifica o código de autorização do GitHub e retorna informações do usuário.
    """
    # Troca o código de autorização por um token de acesso
    token_url = "https://github.com/login/oauth/access_token"
    token_data = {
        "code": code,
        "client_id": settings.GITHUB_CLIENT_ID,
        "client_secret": settings.GITHUB_CLIENT_SECRET,
        "redirect_uri": redirect_uri
    }
    headers = {"Accept": "application/json"}
    
    token_response = requests.post(token_url, data=token_data, headers=headers)
    if token_response.status_code != 200:
        raise Exception(f"GitHub OAuth error: {token_response.text}")
    
    token_json = token_response.json()
    access_token = token_json["access_token"]
    
    # Obtém informações do usuário
    user_info_url = "https://api.github.com/user"
    headers = {"Authorization": f"token {access_token}"}
    
    user_response = requests.get(user_info_url, headers=headers)
    if user_response.status_code != 200:
        raise Exception(f"GitHub user info error: {user_response.text}")
    
    user_info = user_response.json()
    
    # O GitHub não retorna o email por padrão, precisamos fazer outra chamada
    emails_url = "https://api.github.com/user/emails"
    emails_response = requests.get(emails_url, headers=headers)
    
    email = None
    if emails_response.status_code == 200:
        emails = emails_response.json()
        primary_email = next((e for e in emails if e["primary"]), None)
        if primary_email:
            email = primary_email["email"]
    
    if not email and user_info.get("email"):
        email = user_info["email"]
    
    if not email:
        raise Exception("Unable to get GitHub user email")
    
    return {
        "id": str(user_info["id"]),
        "email": email,
        "name": user_info.get("name"),
        "username": user_info.get("login"),
        "picture": user_info.get("avatar_url")
    }
