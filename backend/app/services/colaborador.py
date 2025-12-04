import logging
from typing import List, Optional

from app.core.exceptions import (
    DuplicateResourceException,
    ForbiddenException,
    NotFoundException,
)
from app.models.colaborador import Colaborador
from app.repositories.colaborador import ColaboradorRepository
from app.schemas.colaborador import ColaboradorCreate, ColaboradorUpdate
from app.services.base import BaseService
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class ColaboradorService(BaseService[Colaborador]):
    def __init__(self, db: Session):
        super().__init__(db)
        self.repository = ColaboradorRepository(db)

    def get_colaboradores(
        self,
        departamento: Optional[str] = None,
        email: Optional[str] = None,
    ) -> tuple[List[Colaborador], int]:
        colaboradores = self.repository.get_active(
            departamento=departamento, email=email
        )
        total = len(colaboradores)
        return colaboradores, total

    def get_by_id(self, colaborador_id: int) -> Colaborador:
        colaborador = self.repository.get(colaborador_id)
        if not colaborador:
            raise NotFoundException("Colaborador", colaborador_id)
        return colaborador

    def get_liderados(self, gestor_id: int) -> List[Colaborador]:
        return self.repository.get_liderados(gestor_id)

    def create_colaborador(
        self, colaborador_data: ColaboradorCreate, current_colaborador: Colaborador
    ) -> Colaborador:
        if not current_colaborador.is_admin:
            raise ForbiddenException("Apenas administradores podem criar colaboradores")

        existing = self.repository.get_by_email(colaborador_data.email)
        if existing:
            raise DuplicateResourceException(
                "Colaborador", "email", colaborador_data.email
            )

        try:
            colaborador = Colaborador(**colaborador_data.model_dump())
            self.repository.create(colaborador)
            return colaborador
        except SQLAlchemyError:
            self._handle_database_error("criar colaborador")

    def update_colaborador(
        self,
        colaborador_id: int,
        colaborador_data: ColaboradorUpdate,
        current_colaborador: Colaborador,
    ) -> Colaborador:
        db_colaborador = self.repository.get(colaborador_id)
        if not db_colaborador:
            raise NotFoundException("Colaborador", colaborador_id)

        if not current_colaborador.is_admin:
            raise ForbiddenException(
                "Você não tem permissão para atualizar este colaborador"
            )

        update_data = colaborador_data.model_dump(exclude_unset=True)
        if "email" in update_data and update_data["email"] != db_colaborador.email:
            existing = self.repository.get_by_email(update_data["email"])
            if existing:
                raise DuplicateResourceException(
                    "Colaborador", "email", update_data["email"]
                )

        try:
            colaborador = self.repository.update(colaborador_id, **update_data)
            return colaborador
        except SQLAlchemyError:
            self._handle_database_error("atualizar colaborador")

    def get_colaborador_by_email(self, email: str) -> Optional[Colaborador]:
        return self.repository.get_by_email(email)

    def get_colaboradores_by_ids(self, ids: List[int]) -> List[Colaborador]:
        return self.repository.get_by_ids(ids)
