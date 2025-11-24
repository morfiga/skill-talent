from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_colaborador
from app.database import get_db
from app.models.colaborador import Colaborador
from app.models.registro_valor import RegistroValor, Valor
from app.schemas.registro_valor import (
    RegistroValorCreate,
    RegistroValorListResponse,
    RegistroValorResponse,
    RegistroValorUpdate,
)
from app.services.registro_valor import RegistroValorService

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
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: RegistroValorService = Depends(get_registro_valor_service),
):
    """Lista registros de valor do usuário logado"""
    registros = service.get_by_colaborador(current_colaborador.id)
    return {"registros": registros, "total": len(registros)}


@router.get("/{registro_id}", response_model=RegistroValorResponse)
def get_registro_valor(
    registro_id: int,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    db: Session = Depends(get_db),
):
    """Obtém um registro de valor por ID (apenas se pertencer ao usuário logado)"""
    registro = db.query(RegistroValor).filter(RegistroValor.id == registro_id).first()

    if not registro:
        raise HTTPException(status_code=404, detail="Registro de valor não encontrado")

    # Validar que o registro pertence ao colaborador logado
    if registro.colaborador_id != current_colaborador.id:
        raise HTTPException(
            status_code=403,
            detail="Você só pode buscar seus próprios registros de valor",
        )

    return registro


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
