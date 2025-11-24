from sqlalchemy.orm import Session

from app.models.entrega_outstanding import EntregaOutstanding
from app.repositories.base import BaseRepository


class EntregaOutstandingRepository(BaseRepository[EntregaOutstanding]):
    def __init__(self, db: Session):
        super().__init__(EntregaOutstanding, db)
