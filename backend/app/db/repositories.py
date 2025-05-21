"""
Repositório base para operações CRUD com SQLAlchemy.
"""
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc, func
from fastapi.encoders import jsonable_encoder

from app.db.session import Base
from app.models.base import ModelType

# Tipo para o ID do modelo (geralmente int, mas pode ser UUID, str, etc.)
IdType = TypeVar("IdType", int, str)


class BaseRepository(Generic[ModelType, IdType]):
    """
    Repositório base para operações CRUD com SQLAlchemy.
    Implementa métodos genéricos para qualquer modelo.
    """
    def __init__(self, model: Type[ModelType]):
        """
        Inicializa o repositório com um modelo específico.
        """
        self.model = model

    def get(self, db: Session, id: IdType) -> Optional[ModelType]:
        """
        Obtém um registro pelo ID.
        """
        return db.query(self.model).filter(self.model.id == id).first()

    def get_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        order_by: str = "id",
        order_dir: str = "asc"
    ) -> List[ModelType]:
        """
        Obtém múltiplos registros com paginação e ordenação.
        """
        query = db.query(self.model)
        
        # Aplica ordenação
        if hasattr(self.model, order_by):
            order_column = getattr(self.model, order_by)
            if order_dir.lower() == "desc":
                query = query.order_by(desc(order_column))
            else:
                query = query.order_by(asc(order_column))
        
        # Aplica paginação
        query = query.offset(skip).limit(limit)
        
        return query.all()

    def create(self, db: Session, *, obj_in: Dict[str, Any]) -> ModelType:
        """
        Cria um novo registro a partir de um dicionário.
        """
        obj_data = {
            k: v for k, v in obj_in.items()
            if k in [c.name for c in self.model.__table__.columns]
        }
        db_obj = self.model(**obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: ModelType,
        obj_in: Union[Dict[str, Any], ModelType]
    ) -> ModelType:
        """
        Atualiza um registro existente.
        """
        obj_data = db_obj.to_dict() if hasattr(db_obj, "to_dict") else jsonable_encoder(db_obj)
        
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = jsonable_encoder(obj_in)
            
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
                
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, *, id: IdType) -> ModelType:
        """
        Remove um registro pelo ID.
        """
        obj = db.query(self.model).get(id)
        db.delete(obj)
        db.commit()
        return obj

    def count(self, db: Session) -> int:
        """
        Conta o número total de registros.
        """
        return db.query(func.count(self.model.id)).scalar()

    def exists(self, db: Session, id: IdType) -> bool:
        """
        Verifica se um registro existe pelo ID.
        """
        return db.query(
            db.query(self.model).filter(self.model.id == id).exists()
        ).scalar()
