from typing import List

from app.models.registro_valor import RegistroValor
from app.repositories.base import BaseRepository
from sqlalchemy.orm import Session


class RegistroValorRepository(BaseRepository[RegistroValor]):
    """Repositório para operações com RegistroValor"""

    def __init__(self, db: Session):
        super().__init__(RegistroValor, db)

    def get_by_colaborador(self, colaborador_id: int) -> List[RegistroValor]:
        return (
            self.db.query(self.model)
            .filter(self.model.colaborador_id == colaborador_id)
            .order_by(self.model.created_at.desc())
            .all()
        )
