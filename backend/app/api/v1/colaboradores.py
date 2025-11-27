from typing import Optional

from app.core.security import get_current_colaborador
from app.database import get_db
from app.models.colaborador import Colaborador
from app.schemas.colaborador import (
    ColaboradorCreate,
    ColaboradorListResponse,
    ColaboradorResponse,
    ColaboradorUpdate,
)
from app.services import ColaboradorService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/colaboradores", tags=["colaboradores"])


def get_colaborador_service(db: Session = Depends(get_db)) -> ColaboradorService:
    return ColaboradorService(db)


@router.get("/", response_model=ColaboradorListResponse)
def get_colaboradores(
    departamento: Optional[str] = None,
    email: Optional[str] = None,
    service: ColaboradorService = Depends(get_colaborador_service),
):
    colaboradores, total = service.get_colaboradores(
        departamento=departamento, email=email
    )
    return {"colaboradores": colaboradores, "total": total}


@router.get("/{colaborador_id}", response_model=ColaboradorResponse)
def get_colaborador(
    colaborador_id: int,
    service: ColaboradorService = Depends(get_colaborador_service),
):
    return service.get_colaborador_by_id(colaborador_id)


@router.post("/", response_model=ColaboradorResponse, status_code=201)
def create_colaborador(
    colaborador: ColaboradorCreate,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: ColaboradorService = Depends(get_colaborador_service),
):
    return service.create_colaborador(colaborador, current_colaborador)


@router.put("/{colaborador_id}", response_model=ColaboradorResponse)
def update_colaborador(
    colaborador_id: int,
    colaborador: ColaboradorUpdate,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    service: ColaboradorService = Depends(get_colaborador_service),
):
    return service.update_colaborador(colaborador_id, colaborador, current_colaborador)
