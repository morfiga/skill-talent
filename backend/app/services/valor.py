from typing import List, Optional

from app.models.registro_valor import Valor
from app.repositories.valor import ValorRepository
from app.services.base import BaseService
from sqlalchemy.orm import Session


class ValorService(BaseService[Valor]):
    def __init__(self, db: Session):
        super().__init__(db)
        self.repository = ValorRepository(db)

    def get_valores(self, valores_ids: Optional[List[int]] = None) -> List[Valor]:
        if valores_ids:
            valores = self.repository.get_all(id__in=valores_ids)
            return valores
        else:
            return self.repository.get_all()

    def get_valor(self, valor_id: int) -> Valor:
        return self.repository.get(valor_id)
