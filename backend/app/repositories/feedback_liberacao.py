from datetime import datetime
from typing import List, Optional

from app.models.feedback_liberacao import FeedbackLiberacao
from app.repositories.base import BaseRepository
from sqlalchemy import and_
from sqlalchemy.orm import Session


class FeedbackLiberacaoRepository(BaseRepository[FeedbackLiberacao]):
    """Repositório para operações com FeedbackLiberacao"""

    def __init__(self, db: Session):
        super().__init__(FeedbackLiberacao, db)

    def get_by_ciclo_and_colaborador(
        self, ciclo_id: int, colaborador_id: int
    ) -> Optional[FeedbackLiberacao]:
        """Busca a liberação de feedback para um colaborador específico em um ciclo"""
        return (
            self.db.query(self.model)
            .filter(
                and_(
                    self.model.ciclo_id == ciclo_id,
                    self.model.colaborador_id == colaborador_id,
                )
            )
            .first()
        )

    def get_all_by_ciclo(self, ciclo_id: int) -> List[FeedbackLiberacao]:
        """Busca todas as liberações de feedback de um ciclo"""
        return (
            self.db.query(self.model)
            .filter(self.model.ciclo_id == ciclo_id)
            .order_by(self.model.created_at.desc())
            .all()
        )

    def liberar_feedback(
        self, ciclo_id: int, colaborador_id: int, liberado_por_id: int
    ) -> FeedbackLiberacao:
        """Libera o feedback para um colaborador em um ciclo"""
        feedback_liberacao = self.get_by_ciclo_and_colaborador(ciclo_id, colaborador_id)

        if feedback_liberacao:
            # Atualizar existente
            feedback_liberacao.liberado = True
            feedback_liberacao.liberado_por_id = liberado_por_id
            feedback_liberacao.liberado_em = datetime.utcnow()
            self.db.flush()
            self.db.refresh(feedback_liberacao)
        else:
            # Criar novo
            feedback_liberacao = self.create(
                FeedbackLiberacao(
                    ciclo_id=ciclo_id,
                    colaborador_id=colaborador_id,
                    liberado=True,
                    liberado_por_id=liberado_por_id,
                    liberado_em=datetime.utcnow(),
                )
            )

        return feedback_liberacao

    def revogar_feedback(
        self, ciclo_id: int, colaborador_id: int
    ) -> Optional[FeedbackLiberacao]:
        """Revoga o feedback de um colaborador em um ciclo"""
        feedback_liberacao = self.get_by_ciclo_and_colaborador(ciclo_id, colaborador_id)

        if feedback_liberacao:
            feedback_liberacao.liberado = False
            feedback_liberacao.liberado_por_id = None
            feedback_liberacao.liberado_em = None
            self.db.flush()
            self.db.refresh(feedback_liberacao)

        return feedback_liberacao

    def is_feedback_liberado(self, ciclo_id: int, colaborador_id: int) -> bool:
        """Verifica se o feedback está liberado para um colaborador em um ciclo"""
        feedback_liberacao = self.get_by_ciclo_and_colaborador(ciclo_id, colaborador_id)
        return feedback_liberacao.liberado if feedback_liberacao else False

