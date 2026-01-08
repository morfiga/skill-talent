import logging
from typing import List

from app.core.exceptions import (
    BusinessRuleException,
    ForbiddenException,
    NotFoundException,
)
from app.models.ciclo import EtapaCiclo
from app.models.colaborador import Colaborador
from app.models.feedback_liberacao import FeedbackLiberacao
from app.repositories import CicloRepository, ColaboradorRepository
from app.repositories.feedback_liberacao import FeedbackLiberacaoRepository
from app.schemas.feedback_liberacao import (
    FeedbackLiberacaoListResponse,
    FeedbackLiberacaoResponse,
)
from app.services.base import BaseService
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class FeedbackLiberacaoService(BaseService[FeedbackLiberacao]):
    def __init__(self, db: Session):
        super().__init__(db)
        self.repository = FeedbackLiberacaoRepository(db)
        self.ciclo_repository = CicloRepository(db)
        self.colaborador_repository = ColaboradorRepository(db)

    def liberar_feedback(
        self,
        ciclo_id: int,
        colaborador_id: int,
        current_colaborador: Colaborador,
    ) -> FeedbackLiberacaoResponse:
        """Libera o feedback para um colaborador em um ciclo"""
        try:
            # Validar que o usuário é admin ou gestor
            if not current_colaborador.is_admin:
                logger.warning(
                    f"Tentativa de liberar feedback sem permissão. Colaborador ID: {current_colaborador.id}"
                )
                raise ForbiddenException(
                    "Apenas administradores podem liberar feedbacks"
                )

            # Validar que o ciclo existe
            ciclo = self.ciclo_repository.get(ciclo_id)
            if not ciclo:
                raise NotFoundException("Ciclo", ciclo_id)

            # Validar que o ciclo está na fase de feedback
            if ciclo.etapa_atual != EtapaCiclo.FEEDBACK:
                raise BusinessRuleException(
                    "Só é possível liberar feedback durante a etapa de feedback"
                )

            # Validar que o colaborador existe
            colaborador = self.colaborador_repository.get(colaborador_id)
            if not colaborador:
                raise NotFoundException("Colaborador", colaborador_id)

            logger.info(
                f"Liberando feedback. Ciclo: {ciclo_id}, Colaborador: {colaborador_id}, Liberado por: {current_colaborador.id}"
            )

            # Liberar feedback
            feedback_liberacao = self.repository.liberar_feedback(
                ciclo_id=ciclo_id,
                colaborador_id=colaborador_id,
                liberado_por_id=current_colaborador.id,
            )

            self.db.commit()

            logger.info(
                f"Feedback liberado com sucesso. ID: {feedback_liberacao.id}"
            )
            return feedback_liberacao

        except SQLAlchemyError:
            self._handle_database_error("liberar feedback")

    def revogar_feedback(
        self,
        ciclo_id: int,
        colaborador_id: int,
        current_colaborador: Colaborador,
    ) -> FeedbackLiberacaoResponse:
        """Revoga o feedback de um colaborador em um ciclo"""
        try:
            # Validar que o usuário é admin
            if not current_colaborador.is_admin:
                logger.warning(
                    f"Tentativa de revogar feedback sem permissão. Colaborador ID: {current_colaborador.id}"
                )
                raise ForbiddenException(
                    "Apenas administradores podem revogar feedbacks"
                )

            # Validar que o ciclo existe
            ciclo = self.ciclo_repository.get(ciclo_id)
            if not ciclo:
                raise NotFoundException("Ciclo", ciclo_id)

            # Validar que o colaborador existe
            colaborador = self.colaborador_repository.get(colaborador_id)
            if not colaborador:
                raise NotFoundException("Colaborador", colaborador_id)

            logger.info(
                f"Revogando feedback. Ciclo: {ciclo_id}, Colaborador: {colaborador_id}"
            )

            # Revogar feedback
            feedback_liberacao = self.repository.revogar_feedback(
                ciclo_id=ciclo_id,
                colaborador_id=colaborador_id,
            )

            if not feedback_liberacao:
                raise NotFoundException(
                    "Liberação de feedback",
                    f"ciclo_id={ciclo_id}, colaborador_id={colaborador_id}",
                )

            self.db.commit()

            logger.info(
                f"Feedback revogado com sucesso. ID: {feedback_liberacao.id}"
            )
            return feedback_liberacao

        except SQLAlchemyError:
            self._handle_database_error("revogar feedback")

    def get_by_ciclo(
        self, ciclo_id: int, current_colaborador: Colaborador
    ) -> FeedbackLiberacaoListResponse:
        """Lista todas as liberações de feedback de um ciclo"""
        # Validar que o usuário é admin
        if not current_colaborador.is_admin:
            logger.warning(
                f"Tentativa de listar liberações de feedback sem permissão. Colaborador ID: {current_colaborador.id}"
            )
            raise ForbiddenException(
                "Apenas administradores podem listar liberações de feedback"
            )

        # Validar que o ciclo existe
        ciclo = self.ciclo_repository.get(ciclo_id)
        if not ciclo:
            raise NotFoundException("Ciclo", ciclo_id)

        logger.debug(
            f"Listando liberações de feedback. Ciclo: {ciclo_id}"
        )

        liberacoes = self.repository.get_all_by_ciclo(ciclo_id)

        return FeedbackLiberacaoListResponse(
            liberacoes=liberacoes,
            total=len(liberacoes),
        )

    def verificar_feedback_liberado(
        self, ciclo_id: int, colaborador_id: int
    ) -> bool:
        """Verifica se o feedback está liberado para um colaborador em um ciclo"""
        return self.repository.is_feedback_liberado(ciclo_id, colaborador_id)

