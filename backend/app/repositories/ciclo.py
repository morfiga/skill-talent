from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.ciclo import Ciclo, StatusCiclo
from app.repositories.base import BaseRepository


class CicloRepository(BaseRepository[Ciclo]):
    """Repositório para operações com Ciclo"""

    def __init__(self, db: Session):
        super().__init__(Ciclo, db)

    def get_by_status(
        self,
        status: StatusCiclo,
    ) -> List[Ciclo]:
        """Busca ciclos por status"""
        return (
            self.db.query(self.model)
            .filter(self.model.status == status)
            .order_by(self.model.created_at.desc())
            .all()
        )

    def get_aberto(self) -> Optional[Ciclo]:
        """Busca o ciclo aberto mais recente"""
        return (
            self.db.query(self.model)
            .filter(self.model.status == StatusCiclo.ABERTO)
            .order_by(self.model.created_at.desc())
            .first()
        )
