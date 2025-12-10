from app.core.security import get_current_colaborador
from app.database import get_db
from app.models.colaborador import Colaborador
from app.schemas.registro_valor import (
    RegistroValorCreate,
    RegistroValorListResponse,
    RegistroValorResponse,
    RegistroValorUpdate,
)
from app.services.registro_valor import RegistroValorService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/registros-valor", tags=["registros-valor"])


def get_registro_valor_service(db: Session = Depends(get_db)) -> RegistroValorService:
    return RegistroValorService(db)


@router.post("/", response_model=RegistroValorResponse, status_code=201)
def create_registro_valor(
    registro: RegistroValorCreate,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: RegistroValorService = Depends(get_registro_valor_service),
):
    """Cria um novo registro de valor para o usuário logado"""
    return service.create(registro, current_colaborador)


@router.get("/", response_model=RegistroValorListResponse)
def get_registros_valor(
    colaborador_id: int = None,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: RegistroValorService = Depends(get_registro_valor_service),
):
    """Lista registros de valor do usuário logado ou de um colaborador específico (apenas admin)"""
    if colaborador_id is not None and current_colaborador.is_admin:
        # Admin pode ver registros de qualquer colaborador
        registros = service.get_by_colaborador(colaborador_id)
    else:
        # Colaborador comum vê apenas seus próprios registros
        registros = service.get_by_colaborador(current_colaborador.id)
    return {"registros": registros, "total": len(registros)}


@router.get("/{registro_id}", response_model=RegistroValorResponse)
def get_registro_valor(
    registro_id: int,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: RegistroValorService = Depends(get_registro_valor_service),
):
    return service.get(registro_id, current_colaborador)


@router.put("/{registro_id}", response_model=RegistroValorResponse)
def update_registro_valor(
    registro_id: int,
    registro: RegistroValorUpdate,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: RegistroValorService = Depends(get_registro_valor_service),
):
    """Atualiza um registro de valor (apenas se pertencer ao usuário logado)"""
    return service.update(registro_id, registro, current_colaborador)


@router.delete("/{registro_id}", status_code=204)
def delete_registro_valor(
    registro_id: int,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: RegistroValorService = Depends(get_registro_valor_service),
):
    """Deleta um registro de valor (apenas se pertencer ao usuário logado)"""
    return service.delete(registro_id, current_colaborador.id)
