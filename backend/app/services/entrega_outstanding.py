from typing import List

from app.core.exceptions import NotFoundException, UnauthorizedActionException
from app.models.colaborador import Colaborador
from app.models.entrega_outstanding import EntregaOutstanding
from app.repositories.entrega_outstanding import EntregaOutstandingRepository
from app.schemas.entrega_outstanding import (
    EntregaOutstandingCreate,
    EntregaOutstandingUpdate,
)
from app.services.base import BaseService
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session


class EntregaOutstandingService(BaseService[EntregaOutstanding]):
    def __init__(self, db: Session):
        super().__init__(db)
        self.repository = EntregaOutstandingRepository(db)

    def create(
        self, entrega_data: EntregaOutstandingCreate, current_colaborador: Colaborador
    ) -> EntregaOutstanding:
        entrega = EntregaOutstanding(
            colaborador_id=current_colaborador.id, **entrega_data.model_dump()
        )
        return self.repository.create(entrega)

    def update(
        self,
        entrega_id: int,
        entrega_data: EntregaOutstandingUpdate,
        current_colaborador: Colaborador,
    ) -> EntregaOutstanding:
        self._validate(entrega_id, current_colaborador)
        update_data = entrega_data.model_dump(exclude_unset=True)
        try:
            entrega = self.repository.update(entrega_id, **update_data)
            return entrega
        except SQLAlchemyError:
            self._handle_database_error("atualizar entrega outstanding")

    def get_by_colaborador(
        self, current_colaborador: Colaborador
    ) -> List[EntregaOutstanding]:
        # Filtra corretamente usando kwargs, compatível com BaseRepository.get_all
        return self.repository.get_all(colaborador_id=current_colaborador.id)

    def get_by_id(
        self, entrega_id: int, current_colaborador: Colaborador
    ) -> EntregaOutstanding:
        entrega = self._validate(entrega_id, current_colaborador)
        return entrega

    def delete(self, entrega_id: int, current_colaborador: Colaborador) -> bool:
        self._validate(entrega_id, current_colaborador)
        return self.repository.delete(entrega_id)

    def _validate(
        self, entrega_id: int, current_colaborador: Colaborador
    ) -> EntregaOutstanding:
        entrega = self.repository.get(entrega_id)

        if not entrega:
            raise NotFoundException("Entrega outstanding", entrega_id)

        if entrega.colaborador_id != current_colaborador.id:
            raise UnauthorizedActionException()

        return entrega
