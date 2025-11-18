from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.colaborador import Colaborador
from app.repositories.base import BaseRepository


class ColaboradorRepository(BaseRepository[Colaborador]):
    """Repositório para operações com Colaborador"""

    def __init__(self, db: Session):
        super().__init__(Colaborador, db)

    def get_by_email(self, email: str) -> Optional[Colaborador]:
        """Busca um colaborador por email"""
        return self.db.query(self.model).filter(self.model.email == email).first()

    def get_active(
        self,
        departamento: Optional[str] = None,
        email: Optional[str] = None,
    ) -> List[Colaborador]:
        """Busca colaboradores ativos com filtros opcionais"""
        query = self.db.query(self.model).filter(self.model.is_active == True)

        if departamento:
            query = query.filter(self.model.departamento == departamento)

        if email:
            query = query.filter(self.model.email == email)

        return query.all()

    def get_by_ids(self, ids: List[int]) -> List[Colaborador]:
        """Busca colaboradores por uma lista de IDs"""
        return self.db.query(self.model).filter(self.model.id.in_(ids)).all()
