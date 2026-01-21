from typing import Optional

from app.core.security import get_current_colaborador
from app.database import get_db
from app.models.colaborador import Colaborador
from app.schemas.avaliacao import (
    AvaliacaoCreate,
    AvaliacaoListResponse,
    AvaliacaoResponse,
    AvaliacaoUpdate,
    FeedbackResponse,
)
from app.services.avaliacao import AvaliacaoService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/avaliacoes", tags=["avaliacoes"])


def get_avaliacao_service(db: Session = Depends(get_db)) -> AvaliacaoService:
    return AvaliacaoService(db)


@router.post("/", response_model=AvaliacaoResponse, status_code=201)
def create_avaliacao(
    avaliacao: AvaliacaoCreate,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: AvaliacaoService = Depends(get_avaliacao_service),
):
    return service.create(avaliacao, current_colaborador)


@router.get("/", response_model=AvaliacaoListResponse)
def get_avaliacoes(
    ciclo_id: Optional[int] = None,
    avaliador_id: Optional[int] = None,
    avaliado_id: Optional[int] = None,
    tipo: Optional[str] = None,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: AvaliacaoService = Depends(get_avaliacao_service),
):
    return service.get_avaliacoes(
        ciclo_id, avaliador_id, avaliado_id, tipo, current_colaborador
    )


@router.get("/{avaliacao_id}", response_model=AvaliacaoResponse)
def get_avaliacao(
    avaliacao_id: int,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: AvaliacaoService = Depends(get_avaliacao_service),
):
    return service.get(avaliacao_id, current_colaborador)


@router.put("/{avaliacao_id}", response_model=AvaliacaoResponse)
def update_avaliacao(
    avaliacao_id: int,
    avaliacao: AvaliacaoUpdate,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: AvaliacaoService = Depends(get_avaliacao_service),
):
    return service.update(avaliacao_id, avaliacao, current_colaborador)


@router.get("/ciclo/{ciclo_id}/feedback", response_model=FeedbackResponse)
def get_feedback(
    ciclo_id: int,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: AvaliacaoService = Depends(get_avaliacao_service),
):
    return service.get_feedback(ciclo_id, current_colaborador)


@router.get(
    "/admin/colaborador/{colaborador_id}",
    response_model=AvaliacaoListResponse,
)
def get_avaliacoes_colaborador_admin(
    colaborador_id: int,
    ciclo_id: Optional[int] = None,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: AvaliacaoService = Depends(get_avaliacao_service),
):
    return service.get_avaliacoes_colaborador_admin(
        colaborador_id, ciclo_id, current_colaborador
    )


@router.get(
    "/admin/colaborador/{colaborador_id}/ciclo/{ciclo_id}/feedback",
    response_model=FeedbackResponse,
)
def get_feedback_admin(
    colaborador_id: int,
    ciclo_id: int,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: AvaliacaoService = Depends(get_avaliacao_service),
):
    """Endpoint admin para buscar feedback de qualquer colaborador"""
    return service.get_feedback_admin(ciclo_id, colaborador_id, current_colaborador)
