from datetime import datetime
from typing import List

from app.core.exceptions import NotFoundException, UnauthorizedActionException
from app.models.colaborador import Colaborador
from app.models.registro_valor import RegistroValor, StatusAprovacao
from app.repositories.registro_valor import RegistroValorRepository
from app.repositories.valor import ValorRepository
from app.schemas.registro_valor import RegistroValorCreate, RegistroValorUpdate
from app.services.base import BaseService
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session


class RegistroValorService(BaseService[RegistroValor]):
    def __init__(self, db: Session):
        super().__init__(db)
        self.repository = RegistroValorRepository(db)
        self.valor_repository = ValorRepository(db)

    def get(self, registro_id: int, current_colaborador: Colaborador) -> RegistroValor:
        registro = self.repository.get(registro_id)

        if not registro:
            raise NotFoundException("Registro de valor", registro_id)

        if registro.colaborador_id != current_colaborador.id:
            raise UnauthorizedActionException()

        return registro

    def create(
        self, registro_valor_data: RegistroValorCreate, current_colaborador: Colaborador
    ) -> RegistroValor:
        valores = self.valor_repository.get_all(id__in=registro_valor_data.valores_ids)

        if len(valores) != len(registro_valor_data.valores_ids):
            raise ValueError("Um ou mais valores selecionados não foram encontrados")

        try:
            db_registro_valor = RegistroValor(
                colaborador_id=current_colaborador.id,
                descricao=registro_valor_data.descricao,
                impacto=registro_valor_data.impacto,
                valores=valores,
            )
            self.repository.create(db_registro_valor)
            self.repository.refresh(db_registro_valor)
            return db_registro_valor
        except SQLAlchemyError:
            self._handle_database_error("criar registro de valor")

    def get_by_colaborador(self, colaborador_id: int) -> List[RegistroValor]:
        return self.repository.get_by_colaborador(colaborador_id)

    def update(
        self,
        registro_id: int,
        registro_valor_data: RegistroValorUpdate,
        current_colaborador: Colaborador,
    ) -> RegistroValor:
        registro = self.repository.get(registro_id)

        if not registro:
            raise NotFoundException("Registro de valor", registro_id)

        if registro.colaborador_id != current_colaborador.id:
            raise UnauthorizedActionException()

        if registro.status_aprovacao != StatusAprovacao.PENDENTE.value:
            raise ValueError(
                f"Não é possível editar um registro {registro.status_aprovacao}. Apenas registros pendentes podem ser editados."
            )

        try:
            # Atualizar campos básicos manualmente
            if registro_valor_data.descricao is not None:
                registro.descricao = registro_valor_data.descricao

            # Atualizar valores se fornecidos
            if registro_valor_data.valores_ids is not None:
                valores = self.valor_repository.get_all(
                    id__in=registro_valor_data.valores_ids
                )

                if len(valores) != len(registro_valor_data.valores_ids):
                    raise ValueError(
                        "Um ou mais valores selecionados não foram encontrados"
                    )

                registro.valores = valores

            # Deixar o SQLAlchemy persistir as mudanças deste registro
            self.db.flush()
            return registro
        except SQLAlchemyError:
            self._handle_database_error("atualizar registro de valor")

    def delete(self, registro_id: int, current_colaborador_id: int) -> bool:
        registro = self.repository.get(registro_id)

        if not registro:
            raise NotFoundException("Registro de valor", registro_id)

        if registro.colaborador_id != current_colaborador_id:
            raise UnauthorizedActionException()

        if registro.status_aprovacao != StatusAprovacao.PENDENTE.value:
            raise ValueError(
                f"Não é possível excluir um registro {registro.status_aprovacao}. Apenas registros pendentes podem ser excluídos."
            )

        return self.repository.delete(registro_id)

    def get_all_pendentes(self) -> List[RegistroValor]:
        """Retorna todos os registros de valor pendentes de aprovação"""
        return self.repository.get_all(status_aprovacao=StatusAprovacao.PENDENTE.value)

    def aprovar(
        self, registro_id: int, admin_colaborador: Colaborador, observacao: str = None
    ) -> RegistroValor:
        """Aprova um registro de valor"""
        if not admin_colaborador.is_admin:
            raise UnauthorizedActionException()

        registro = self.repository.get(registro_id)
        if not registro:
            raise NotFoundException("Registro de valor", registro_id)

        if registro.status_aprovacao != StatusAprovacao.PENDENTE.value:
            raise ValueError(
                f"Registro já foi {registro.status_aprovacao}. Apenas registros pendentes podem ser aprovados."
            )

        try:
            registro.status_aprovacao = StatusAprovacao.APROVADO.value
            registro.aprovado_por_id = admin_colaborador.id
            registro.aprovado_em = datetime.now()
            registro.observacao_aprovacao = observacao

            self.db.flush()
            self.repository.refresh(registro)
            return registro
        except SQLAlchemyError:
            self._handle_database_error("aprovar registro de valor")

    def reprovar(
        self, registro_id: int, admin_colaborador: Colaborador, observacao: str
    ) -> RegistroValor:
        """Reprova um registro de valor"""
        if not admin_colaborador.is_admin:
            raise UnauthorizedActionException()

        registro = self.repository.get(registro_id)
        if not registro:
            raise NotFoundException("Registro de valor", registro_id)

        if registro.status_aprovacao != StatusAprovacao.PENDENTE.value:
            raise ValueError(
                f"Registro já foi {registro.status_aprovacao}. Apenas registros pendentes podem ser reprovados."
            )

        if not observacao or not observacao.strip():
            raise ValueError("Observação é obrigatória para reprovar um registro")

        try:
            registro.status_aprovacao = StatusAprovacao.REPROVADO.value
            registro.aprovado_por_id = admin_colaborador.id
            registro.aprovado_em = datetime.now()
            registro.observacao_aprovacao = observacao

            self.db.flush()
            self.repository.refresh(registro)
            return registro
        except SQLAlchemyError:
            self._handle_database_error("reprovar registro de valor")
