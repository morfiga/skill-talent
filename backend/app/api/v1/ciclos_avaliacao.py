import logging

from app.core.security import get_current_colaborador
from app.database import get_db
from app.models.colaborador import Colaborador
from app.schemas.ciclo_avaliacao import (
    CicloAvaliacaoCreate,
    CicloAvaliacaoListResponse,
    CicloAvaliacaoResponse,
    CicloAvaliacaoUpdate,
)
from app.services.ciclo_avaliacao import CicloAvaliacaoService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ciclos-avaliacao", tags=["ciclos-avaliacao"])


def get_ciclo_avaliacao_service(db: Session = Depends(get_db)) -> CicloAvaliacaoService:
    return CicloAvaliacaoService(db)


@router.post("/", response_model=CicloAvaliacaoResponse, status_code=201)
def create_ciclo_avaliacao(
    ciclo: CicloAvaliacaoCreate,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: CicloAvaliacaoService = Depends(get_ciclo_avaliacao_service),
):
    return service.create(ciclo, current_colaborador)


@router.get("/", response_model=CicloAvaliacaoListResponse)
def get_ciclos_avaliacao(
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: CicloAvaliacaoService = Depends(get_ciclo_avaliacao_service),
):
    return service.get_ciclos_avaliacao(current_colaborador.id)


@router.get(
    "/ativo",
    response_model=CicloAvaliacaoResponse,
)
def get_ciclo_avaliacao_ativo(
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: CicloAvaliacaoService = Depends(get_ciclo_avaliacao_service),
):
    return service.get_ciclo_avaliacao_ativo(current_colaborador.id)


@router.get("/{ciclo_id}", response_model=CicloAvaliacaoResponse)
def get_ciclo_avaliacao(
    ciclo_id: int,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: CicloAvaliacaoService = Depends(get_ciclo_avaliacao_service),
):
    return service.get_ciclo_avaliacao(ciclo_id, current_colaborador.id)


@router.put("/{ciclo_id}", response_model=CicloAvaliacaoResponse)
def update_ciclo_avaliacao(
    ciclo_id: int,
    ciclo_update: CicloAvaliacaoUpdate,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: CicloAvaliacaoService = Depends(get_ciclo_avaliacao_service),
):
    return service.update_ciclo_avaliacao(
        ciclo_id, ciclo_update, current_colaborador.id
    )


@router.get(
    "/gestor/liderados",
    response_model=CicloAvaliacaoListResponse,
)
def get_ciclos_avaliacao_liderados(
    ciclo_id: int,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: CicloAvaliacaoService = Depends(get_ciclo_avaliacao_service),
):
    return service.get_ciclos_avaliacao_liderados(ciclo_id, current_colaborador)


@router.put(
    "/gestor/{ciclo_avaliacao_id}/pares",
    response_model=CicloAvaliacaoResponse,
)
def update_pares_liderado(
    ciclo_avaliacao_id: int,
    ciclo_update: CicloAvaliacaoUpdate,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: CicloAvaliacaoService = Depends(get_ciclo_avaliacao_service),
):
    return service.update_pares_liderado(
        ciclo_avaliacao_id, ciclo_update, current_colaborador
    )
