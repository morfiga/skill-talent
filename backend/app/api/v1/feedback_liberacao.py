from app.core.security import get_current_colaborador
from app.database import get_db
from app.models.colaborador import Colaborador
from app.schemas.feedback_liberacao import (
    FeedbackLiberacaoListResponse,
    FeedbackLiberacaoResponse,
)
from app.services.feedback_liberacao import FeedbackLiberacaoService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/feedback-liberacao", tags=["feedback-liberacao"])


def get_feedback_liberacao_service(
    db: Session = Depends(get_db),
) -> FeedbackLiberacaoService:
    return FeedbackLiberacaoService(db)


@router.post(
    "/ciclo/{ciclo_id}/colaborador/{colaborador_id}/liberar",
    response_model=FeedbackLiberacaoResponse,
)
def liberar_feedback(
    ciclo_id: int,
    colaborador_id: int,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: FeedbackLiberacaoService = Depends(get_feedback_liberacao_service),
):
    """
    Libera o feedback para um colaborador em um ciclo específico.
    Apenas administradores podem executar esta ação.
    """
    return service.liberar_feedback(ciclo_id, colaborador_id, current_colaborador)


@router.post(
    "/ciclo/{ciclo_id}/colaborador/{colaborador_id}/revogar",
    response_model=FeedbackLiberacaoResponse,
)
def revogar_feedback(
    ciclo_id: int,
    colaborador_id: int,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: FeedbackLiberacaoService = Depends(get_feedback_liberacao_service),
):
    """
    Revoga o feedback de um colaborador em um ciclo específico.
    Apenas administradores podem executar esta ação.
    """
    return service.revogar_feedback(ciclo_id, colaborador_id, current_colaborador)


@router.get(
    "/ciclo/{ciclo_id}",
    response_model=FeedbackLiberacaoListResponse,
)
def get_liberacoes_por_ciclo(
    ciclo_id: int,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: FeedbackLiberacaoService = Depends(get_feedback_liberacao_service),
):
    """
    Lista todas as liberações de feedback de um ciclo.
    Apenas administradores podem executar esta ação.
    """
    return service.get_by_ciclo(ciclo_id, current_colaborador)

