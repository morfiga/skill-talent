from typing import List, Optional

from app.database import get_db
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


@router.get("/", response_model=ColaboradorListResponse)
def get_colaboradores(
    departamento: Optional[str] = None,
    email: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Lista todos os colaboradores"""
    service = ColaboradorService(db)
    colaboradores, total = service.get_colaboradores(
        departamento=departamento, email=email
    )
    return {"colaboradores": colaboradores, "total": total}


@router.get("/{colaborador_id}", response_model=ColaboradorResponse)
def get_colaborador(colaborador_id: int, db: Session = Depends(get_db)):
    """Obtém um colaborador por ID"""
    service = ColaboradorService(db)
    return service.get_colaborador_by_id(colaborador_id)


@router.post("/", response_model=ColaboradorResponse, status_code=201)
def create_colaborador(colaborador: ColaboradorCreate, db: Session = Depends(get_db)):
    """Cria um novo colaborador"""
    service = ColaboradorService(db)
    return service.create_colaborador(colaborador)


@router.put("/{colaborador_id}", response_model=ColaboradorResponse)
def update_colaborador(
    colaborador_id: int,
    colaborador: ColaboradorUpdate,
    db: Session = Depends(get_db),
):
    """Atualiza um colaborador"""
    service = ColaboradorService(db)
    return service.update_colaborador(colaborador_id, colaborador)
