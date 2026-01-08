from app.core.security import get_current_colaborador
from app.database import get_db
from app.models.colaborador import Colaborador
from app.schemas.entrega_outstanding import (
    AprovarEntregaOutstandingRequest,
    EntregaOutstandingCreate,
    EntregaOutstandingListResponse,
    EntregaOutstandingResponse,
    EntregaOutstandingUpdate,
    ReprovarEntregaOutstandingRequest,
)
from app.services.entrega_outstanding import EntregaOutstandingService
from fastapi import APIRouter, Depends, HTTPException
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
    colaborador_id: int = None,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: EntregaOutstandingService = Depends(get_entrega_outstanding_service),
):
    """Lista entregas outstanding do usuário logado ou de um colaborador específico (apenas admin)"""
    if colaborador_id is not None and current_colaborador.is_admin:
        # Admin pode ver entregas de qualquer colaborador
        entregas = service.get_by_colaborador_id(colaborador_id)
    else:
        # Colaborador comum vê apenas suas próprias entregas
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


@router.get("/admin/pendentes", response_model=EntregaOutstandingListResponse)
def get_entregas_pendentes(
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: EntregaOutstandingService = Depends(get_entrega_outstanding_service),
):
    """Lista todas as entregas outstanding pendentes de aprovação (apenas admin)"""
    if not current_colaborador.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Acesso negado. Apenas administradores podem acessar esta funcionalidade.",
        )

    entregas = service.get_all_pendentes()
    return {"entregas": entregas, "total": len(entregas)}


@router.post("/{entrega_id}/aprovar", response_model=EntregaOutstandingResponse)
def aprovar_entrega_outstanding(
    entrega_id: int,
    request: AprovarEntregaOutstandingRequest,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: EntregaOutstandingService = Depends(get_entrega_outstanding_service),
):
    """Aprova uma entrega outstanding (apenas admin)"""
    if not current_colaborador.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Acesso negado. Apenas administradores podem aprovar entregas.",
        )

    try:
        return service.aprovar(entrega_id, current_colaborador, request.observacao)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{entrega_id}/reprovar", response_model=EntregaOutstandingResponse)
def reprovar_entrega_outstanding(
    entrega_id: int,
    request: ReprovarEntregaOutstandingRequest,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: EntregaOutstandingService = Depends(get_entrega_outstanding_service),
):
    """Reprova uma entrega outstanding (apenas admin)"""
    if not current_colaborador.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Acesso negado. Apenas administradores podem reprovar entregas.",
        )

    try:
        return service.reprovar(entrega_id, current_colaborador, request.observacao)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
