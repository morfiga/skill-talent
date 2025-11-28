from typing import Optional

from app.core.security import get_current_colaborador
from app.database import get_db
from app.models.colaborador import Colaborador
from app.schemas.avaliacao_gestor import (
    AvaliacaoGestorCreate,
    AvaliacaoGestorListResponse,
    AvaliacaoGestorResponse,
    AvaliacaoGestorUpdate,
    PerguntasAvaliacaoGestorResponse,
)
from app.services.avaliacao_gestor import AvaliacaoGestorService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/avaliacoes-gestor", tags=["avaliacoes-gestor"])


def get_avaliacao_gestor_service(db: Session = Depends(get_db)) -> AvaliacaoGestorService:
    return AvaliacaoGestorService(db)


@router.get("/perguntas", response_model=PerguntasAvaliacaoGestorResponse)
def get_perguntas(
    service: AvaliacaoGestorService = Depends(get_avaliacao_gestor_service),
):
    """Retorna as perguntas disponíveis para avaliação de gestor"""
    return service.get_perguntas()


@router.post("/", response_model=AvaliacaoGestorResponse, status_code=201)
def create_avaliacao_gestor(
    avaliacao: AvaliacaoGestorCreate,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: AvaliacaoGestorService = Depends(get_avaliacao_gestor_service),
):
    """Cria uma nova avaliação de gestor"""
    return service.create(avaliacao, current_colaborador)


@router.get("/", response_model=AvaliacaoGestorListResponse)
def get_avaliacoes_gestor(
    ciclo_id: Optional[int] = None,
    colaborador_id: Optional[int] = None,
    gestor_id: Optional[int] = None,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: AvaliacaoGestorService = Depends(get_avaliacao_gestor_service),
):
    """Lista avaliações de gestor com filtros opcionais"""
    return service.get_avaliacoes(
        ciclo_id, colaborador_id, gestor_id, current_colaborador
    )


@router.get("/{avaliacao_id}", response_model=AvaliacaoGestorResponse)
def get_avaliacao_gestor(
    avaliacao_id: int,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: AvaliacaoGestorService = Depends(get_avaliacao_gestor_service),
):
    """Busca uma avaliação de gestor específica"""
    return service.get(avaliacao_id, current_colaborador)


@router.put("/{avaliacao_id}", response_model=AvaliacaoGestorResponse)
def update_avaliacao_gestor(
    avaliacao_id: int,
    avaliacao: AvaliacaoGestorUpdate,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: AvaliacaoGestorService = Depends(get_avaliacao_gestor_service),
):
    """Atualiza uma avaliação de gestor"""
    return service.update(avaliacao_id, avaliacao, current_colaborador)


@router.get(
    "/admin/colaborador/{colaborador_id}",
    response_model=AvaliacaoGestorListResponse,
)
def get_avaliacoes_gestor_colaborador_admin(
    colaborador_id: int,
    ciclo_id: Optional[int] = None,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: AvaliacaoGestorService = Depends(get_avaliacao_gestor_service),
):
    """Endpoint admin para buscar avaliações de gestor realizadas por um colaborador"""
    return service.get_avaliacoes_colaborador_admin(
        colaborador_id, ciclo_id, current_colaborador
    )


@router.get(
    "/admin/gestor/{gestor_id}",
    response_model=AvaliacaoGestorListResponse,
)
def get_avaliacoes_gestor_gestor_admin(
    gestor_id: int,
    ciclo_id: Optional[int] = None,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: AvaliacaoGestorService = Depends(get_avaliacao_gestor_service),
):
    """Endpoint admin para buscar avaliações de gestor recebidas por um gestor"""
    return service.get_avaliacoes_gestor_admin(
        gestor_id, ciclo_id, current_colaborador
    )

