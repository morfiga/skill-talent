from app.core.security import get_current_colaborador
from app.database import get_db
from app.models.colaborador import Colaborador
from app.schemas.entrega_outstanding import (
    EntregaOutstandingCreate,
    EntregaOutstandingListResponse,
    EntregaOutstandingResponse,
    EntregaOutstandingUpdate,
)
from app.services.entrega_outstanding import EntregaOutstandingService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/entregas-outstanding", tags=["entregas-outstanding"])


def get_entrega_outstanding_service(
    db: Session = Depends(get_db),
) -> EntregaOutstandingService:
    return EntregaOutstandingService(db)


@router.post("/", response_model=EntregaOutstandingResponse, status_code=201)
def create_entrega_outstanding(
    entrega: EntregaOutstandingCreate,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: EntregaOutstandingService = Depends(get_entrega_outstanding_service),
):
    return service.create(entrega, current_colaborador)


@router.get("/", response_model=EntregaOutstandingListResponse)
def get_entregas_outstanding(
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: EntregaOutstandingService = Depends(get_entrega_outstanding_service),
):
    """Lista entregas outstanding do usuário logado"""
    entregas = service.get_by_colaborador(current_colaborador)
    return {"entregas": entregas, "total": len(entregas)}


@router.get("/{entrega_id}", response_model=EntregaOutstandingResponse)
def get_entrega_outstanding(
    entrega_id: int,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: EntregaOutstandingService = Depends(get_entrega_outstanding_service),
):
    """Obtém uma entrega outstanding por ID (apenas se pertencer ao usuário logado)"""
    return service.get_by_id(entrega_id, current_colaborador)


@router.put("/{entrega_id}", response_model=EntregaOutstandingResponse)
def update_entrega_outstanding(
    entrega_id: int,
    entrega: EntregaOutstandingUpdate,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: EntregaOutstandingService = Depends(get_entrega_outstanding_service),
):
    return service.update(entrega_id, entrega, current_colaborador)


@router.delete("/{entrega_id}", status_code=204)
def delete_entrega_outstanding(
    entrega_id: int,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: EntregaOutstandingService = Depends(get_entrega_outstanding_service),
):
    return service.delete(entrega_id, current_colaborador)
