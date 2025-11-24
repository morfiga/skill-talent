from app.models.registro_valor import RegistroValor
from app.repositories.base import BaseRepository
from sqlalchemy.orm import Session


class RegistroValorRepository(BaseRepository[RegistroValor]):
    """Repositório para operações com RegistroValor"""

    def __init__(self, db: Session):
        super().__init__(RegistroValor, db)
