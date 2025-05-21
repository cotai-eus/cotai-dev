"""
Modelos base para SQLAlchemy com mixin de timestamps.
"""
from datetime import datetime
from typing import Any, Dict, TypeVar

from sqlalchemy import Column, DateTime, func
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import Session

from app.db.session import Base

# Tipo para o modelo genérico
ModelType = TypeVar("ModelType", bound=Base)


class TimestampMixin:
    """
    Mixin para adicionar campos de timestamp em modelos.
    Adiciona created_at e updated_at automaticamente.
    """
    @declared_attr
    def created_at(cls) -> Column:
        return Column(DateTime, default=func.now(), nullable=False)

    @declared_attr
    def updated_at(cls) -> Column:
        return Column(
            DateTime,
            default=func.now(),
            onupdate=func.now(),
            nullable=False
        )


class BaseModel(Base):
    """
    Classe base para modelos do SQLAlchemy.
    Implementa métodos comuns e integra com o TimestampMixin.
    """
    __abstract__ = True
    
    # Adiciona as colunas de timestamp
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(
        DateTime,
        default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    def to_dict(self) -> Dict[str, Any]:
        """
        Converte o modelo para um dicionário.
        """
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BaseModel":
        """
        Cria uma instância do modelo a partir de um dicionário.
        """
        return cls(**{
            k: v for k, v in data.items()
            if k in [c.name for c in cls.__table__.columns]
        })
