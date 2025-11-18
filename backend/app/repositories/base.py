from typing import Generic, TypeVar, Type, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

ModelType = TypeVar("ModelType")


class BaseRepository(Generic[ModelType]):
    """Classe base para repositórios com operações CRUD comuns"""

    def __init__(self, model: Type[ModelType], db: Session):
        """
        Inicializa o repositório
        
        Args:
            model: Classe do modelo SQLAlchemy
            db: Sessão do banco de dados
        """
        self.model = model
        self.db = db

    def get(self, id: int) -> Optional[ModelType]:
        """Busca um registro por ID"""
        return self.db.query(self.model).filter(self.model.id == id).first()

    def get_all(
        self, order_by=None, **filters
    ) -> List[ModelType]:
        """
        Lista todos os registros com filtros opcionais
        
        Args:
            order_by: Campo para ordenação (ex: self.model.created_at.desc())
            **filters: Filtros adicionais (ex: status="ativo")
        """
        query = self.db.query(self.model)
        
        # Aplicar filtros
        for key, value in filters.items():
            if hasattr(self.model, key) and value is not None:
                query = query.filter(getattr(self.model, key) == value)
        
        # Aplicar ordenação se fornecida
        if order_by is not None:
            query = query.order_by(order_by)
        
        return query.all()

    def count(self, **filters) -> int:
        """Conta o número de registros com filtros opcionais"""
        query = self.db.query(self.model)
        
        # Aplicar filtros
        for key, value in filters.items():
            if hasattr(self.model, key) and value is not None:
                query = query.filter(getattr(self.model, key) == value)
        
        return query.count()

    def create(self, **kwargs) -> ModelType:
        """Cria um novo registro"""
        db_obj = self.model(**kwargs)
        self.db.add(db_obj)
        self.db.flush()
        return db_obj

    def update(self, id: int, **kwargs) -> Optional[ModelType]:
        """Atualiza um registro existente"""
        db_obj = self.get(id)
        if not db_obj:
            return None
        
        for key, value in kwargs.items():
            if hasattr(db_obj, key):
                setattr(db_obj, key, value)
        
        self.db.flush()
        return db_obj

    def delete(self, id: int) -> bool:
        """Remove um registro"""
        db_obj = self.get(id)
        if not db_obj:
            return False
        
        self.db.delete(db_obj)
        self.db.flush()
        return True

    def commit(self):
        """Confirma as alterações no banco de dados"""
        self.db.commit()

    def refresh(self, obj: ModelType):
        """Atualiza o objeto com dados do banco"""
        self.db.refresh(obj)

    def rollback(self):
        """Reverte as alterações"""
        self.db.rollback()

