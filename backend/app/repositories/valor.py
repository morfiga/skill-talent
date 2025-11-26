from app.models.registro_valor import Valor
from app.repositories.base import BaseRepository
from sqlalchemy.orm import Session


class ValorRepository(BaseRepository[Valor]):
    """Repositório para operações com Valor"""

    def __init__(self, db: Session):
        super().__init__(Valor, db)
