from typing import List

from app.models.eixo_avaliacao import EixoAvaliacao
from app.repositories.eixo_avaliacao import EixoAvaliacaoRepository
from app.services.base import BaseService
from sqlalchemy.orm import Session


class EixoAvaliacaoService(BaseService[EixoAvaliacao]):
    def __init__(self, db: Session):
        super().__init__(db)
        self.repository = EixoAvaliacaoRepository(db)

    def get_all(self) -> List[EixoAvaliacao]:
        return self.repository.get_all()

    def get(self, eixo_id: int) -> EixoAvaliacao:
        return self.repository.get(eixo_id)
