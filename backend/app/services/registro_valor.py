from typing import List

from app.core.exceptions import NotFoundException, UnauthorizedActionException
from app.models.colaborador import Colaborador
from app.models.registro_valor import RegistroValor
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
                reflexao=registro_valor_data.reflexao,
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

        try:
            # Atualizar campos básicos manualmente
            if registro_valor_data.descricao is not None:
                registro.descricao = registro_valor_data.descricao
            if registro_valor_data.reflexao is not None:
                registro.reflexao = registro_valor_data.reflexao
            if registro_valor_data.impacto is not None:
                registro.impacto = registro_valor_data.impacto

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

        return self.repository.delete(registro_id)
