from pydantic_settings import BaseSettings
from typing import List, Optional
import secrets
import os


class Settings(BaseSettings):
    """Configurações da aplicação, carregadas de variáveis de ambiente."""
    
    # Core settings
    PROJECT_NAME: str = "CotAi API"
    DEBUG: bool = False
    SECRET_KEY: str = secrets.token_urlsafe(32)
    API_V1_PREFIX: str = "/api/v1"
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    
    # Database settings
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_PORT: str
    
    # MongoDB settings
    MONGO_INITDB_ROOT_USERNAME: str
    MONGO_INITDB_ROOT_PASSWORD: str
    MONGO_INITDB_DATABASE: str
    MONGO_HOST: str
    MONGO_PORT: str
    
    # Redis settings
    REDIS_PASSWORD: str
    REDIS_HOST: str
    REDIS_PORT: str
    
    # JWT settings
    JWT_SECRET_KEY: str = SECRET_KEY
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Email settings
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[str] = None
    EMAILS_FROM_NAME: Optional[str] = None
    
    # OAuth settings
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    
    # Document storage settings
    DOCUMENT_STORAGE_PATH: str = os.path.join(os.getcwd(), "data", "documents")
    DOCUMENT_MAX_SIZE: int = 20 * 1024 * 1024  # 20 MB
    ALLOWED_DOCUMENT_TYPES: List[str] = [
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt", 
        ".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp"
    ]
    
    # OCR settings
    TESSERACT_PATH: Optional[str] = None  # Path to tesseract executable, if not in PATH
    OCR_ENABLED: bool = True
    OCR_LANGUAGE: str = "por"  # Default language for OCR (Portuguese)
    
    # Celery settings
    CELERY_BROKER_URL: str = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/0"
    CELERY_RESULT_BACKEND: str = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/0"
    MICROSOFT_CLIENT_ID: Optional[str] = None
    MICROSOFT_CLIENT_SECRET: Optional[str] = None
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    
    # Frontend URL for OAuth redirects
    FRONTEND_URL: str = "http://localhost:3000"
    
    # 2FA settings
    TOTP_ISSUER: str = "CotAi"
    
    # Security settings
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_DIGITS: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = True
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        """Constrói a URI de conexão ao PostgreSQL."""
        return f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def MONGODB_URI(self) -> str:
        """Constrói a URI de conexão ao MongoDB."""
        return f"mongodb://{self.MONGO_INITDB_ROOT_USERNAME}:{self.MONGO_INITDB_ROOT_PASSWORD}@{self.MONGO_HOST}:{self.MONGO_PORT}/{self.MONGO_INITDB_DATABASE}"
    
    @property
    def REDIS_URI(self) -> str:
        """Constrói a URI de conexão ao Redis."""
        return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/0"
    
    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
