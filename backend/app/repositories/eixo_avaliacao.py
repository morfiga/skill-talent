from typing import List

from sqlalchemy.orm import Session

from app.models.eixo_avaliacao import EixoAvaliacao
from app.repositories.base import BaseRepository


class EixoAvaliacaoRepository(BaseRepository[EixoAvaliacao]):
    """Repositório para operações com EixoAvaliacao"""

    def __init__(self, db: Session):
        super().__init__(EixoAvaliacao, db)

    def get_all(self) -> List[EixoAvaliacao]:
        """Busca todos os eixos de avaliação"""
        return self.db.query(self.model).all()
