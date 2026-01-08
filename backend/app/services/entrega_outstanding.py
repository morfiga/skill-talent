from datetime import datetime
from typing import List

from app.core.exceptions import NotFoundException, UnauthorizedActionException
from app.models.colaborador import Colaborador
from app.models.entrega_outstanding import EntregaOutstanding, StatusAprovacao
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
        entrega = self._validate(entrega_id, current_colaborador)

        if entrega.status_aprovacao != StatusAprovacao.PENDENTE.value:
            raise ValueError(
                f"Não é possível editar uma entrega {entrega.status_aprovacao}. Apenas entregas pendentes podem ser editadas."
            )

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

    def get_by_colaborador_id(self, colaborador_id: int) -> List[EntregaOutstanding]:
        """Retorna entregas de um colaborador específico (usado por admin)"""
        return self.repository.get_all(colaborador_id=colaborador_id)

    def get_by_id(
        self, entrega_id: int, current_colaborador: Colaborador
    ) -> EntregaOutstanding:
        entrega = self._validate(entrega_id, current_colaborador)
        return entrega

    def delete(self, entrega_id: int, current_colaborador: Colaborador) -> bool:
        entrega = self._validate(entrega_id, current_colaborador)

        if entrega.status_aprovacao != StatusAprovacao.PENDENTE.value:
            raise ValueError(
                f"Não é possível excluir uma entrega {entrega.status_aprovacao}. Apenas entregas pendentes podem ser excluídas."
            )

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

    def get_all_pendentes(self) -> List[EntregaOutstanding]:
        """Retorna todas as entregas outstanding pendentes de aprovação"""
        return self.repository.get_all(status_aprovacao=StatusAprovacao.PENDENTE.value)

    def aprovar(
        self, entrega_id: int, admin_colaborador: Colaborador, observacao: str = None
    ) -> EntregaOutstanding:
        """Aprova uma entrega outstanding"""
        if not admin_colaborador.is_admin:
            raise UnauthorizedActionException()

        entrega = self.repository.get(entrega_id)
        if not entrega:
            raise NotFoundException("Entrega outstanding", entrega_id)

        if entrega.status_aprovacao != StatusAprovacao.PENDENTE.value:
            raise ValueError(
                f"Entrega já foi {entrega.status_aprovacao}. Apenas entregas pendentes podem ser aprovadas."
            )

        try:
            entrega.status_aprovacao = StatusAprovacao.APROVADO.value
            entrega.aprovado_por_id = admin_colaborador.id
            entrega.aprovado_em = datetime.now()
            entrega.observacao_aprovacao = observacao

            self.db.flush()
            self.repository.refresh(entrega)
            return entrega
        except SQLAlchemyError:
            self._handle_database_error("aprovar entrega outstanding")

    def reprovar(
        self, entrega_id: int, admin_colaborador: Colaborador, observacao: str
    ) -> EntregaOutstanding:
        """Reprova uma entrega outstanding"""
        if not admin_colaborador.is_admin:
            raise UnauthorizedActionException()

        entrega = self.repository.get(entrega_id)
        if not entrega:
            raise NotFoundException("Entrega outstanding", entrega_id)

        if entrega.status_aprovacao != StatusAprovacao.PENDENTE.value:
            raise ValueError(
                f"Entrega já foi {entrega.status_aprovacao}. Apenas entregas pendentes podem ser reprovadas."
            )

        if not observacao or not observacao.strip():
            raise ValueError("Observação é obrigatória para reprovar uma entrega")

        try:
            entrega.status_aprovacao = StatusAprovacao.REPROVADO.value
            entrega.aprovado_por_id = admin_colaborador.id
            entrega.aprovado_em = datetime.now()
            entrega.observacao_aprovacao = observacao

            self.db.flush()
            self.repository.refresh(entrega)
            return entrega
        except SQLAlchemyError:
            self._handle_database_error("reprovar entrega outstanding")
