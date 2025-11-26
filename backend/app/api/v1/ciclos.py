import logging
from typing import Optional

from app.database import get_db
from app.schemas.ciclo import CicloCreate, CicloListResponse, CicloResponse, CicloUpdate
from app.services import CicloService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ciclos", tags=["ciclos"])


def get_ciclo_service(db: Session = Depends(get_db)) -> CicloService:
    return CicloService(db)


@router.post("/", response_model=CicloResponse, status_code=201)
def create_ciclo(
    ciclo: CicloCreate, service: CicloService = Depends(get_ciclo_service)
):
    """Cria um novo ciclo"""
    return service.create_ciclo(ciclo)


@router.get("/", response_model=CicloListResponse)
def get_ciclos(
    status: Optional[str] = None, service: CicloService = Depends(get_ciclo_service)
):
    """Lista todos os ciclos"""
    ciclos, total = service.get_ciclos(status=status)
    return {"ciclos": ciclos, "total": total}


@router.get("/{ciclo_id}", response_model=CicloResponse)
def get_ciclo(ciclo_id: int, service: CicloService = Depends(get_ciclo_service)):
    """Obtém um ciclo por ID"""
    return service.get_ciclo_by_id(ciclo_id)


@router.put("/{ciclo_id}", response_model=CicloResponse)
def update_ciclo(
    ciclo_id: int,
    ciclo: CicloUpdate,
    service: CicloService = Depends(get_ciclo_service),
):
    """Atualiza um ciclo"""
    return service.update_ciclo(ciclo_id, ciclo)


@router.get("/ativo/aberto", response_model=CicloResponse)
def get_ciclo_aberto(service: CicloService = Depends(get_ciclo_service)):
    """Obtém o ciclo aberto ativo"""
    logger.debug("GET /ciclos/ativo/aberto - Buscando ciclo aberto")
    ciclo = service.get_ciclo_aberto()
    logger.debug(
        f"Ciclo aberto encontrado. ID: {ciclo.id}, Nome: {ciclo.nome}, Status: {ciclo.status}"
    )
    return ciclo


@router.post("/{ciclo_id}/avancar-etapa", response_model=CicloResponse)
def avancar_etapa(ciclo_id: int, service: CicloService = Depends(get_ciclo_service)):
    """Avança a etapa atual do ciclo para a próxima"""
    return service.avancar_etapa(ciclo_id)


@router.delete("/{ciclo_id}", status_code=204)
def delete_ciclo(ciclo_id: int, service: CicloService = Depends(get_ciclo_service)):
    """Exclui um ciclo"""
    service.delete_ciclo(ciclo_id)
    return None
