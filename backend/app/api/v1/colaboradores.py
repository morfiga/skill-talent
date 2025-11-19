from typing import List, Optional

from app.database import get_db
from app.models.colaborador import Colaborador
from app.schemas.colaborador import (
    ColaboradorCreate,
    ColaboradorListResponse,
    ColaboradorResponse,
    ColaboradorUpdate,
)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="/colaboradores", tags=["colaboradores"])


@router.get("/", response_model=ColaboradorListResponse)
def get_colaboradores(
    departamento: Optional[str] = None,
    email: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Lista todos os colaboradores"""
    query = db.query(Colaborador).filter(Colaborador.is_active == True)

    if departamento:
        query = query.filter(Colaborador.departamento == departamento)

    if email:
        query = query.filter(Colaborador.email == email)

    colaboradores = query.all()
    total = len(colaboradores)

    return {"colaboradores": colaboradores, "total": total}


@router.get("/{colaborador_id}", response_model=ColaboradorResponse)
def get_colaborador(colaborador_id: int, db: Session = Depends(get_db)):
    """Obtém um colaborador por ID"""
    colaborador = db.query(Colaborador).filter(Colaborador.id == colaborador_id).first()

    if not colaborador:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")

    return colaborador


@router.post("/", response_model=ColaboradorResponse, status_code=201)
def create_colaborador(colaborador: ColaboradorCreate, db: Session = Depends(get_db)):
    """Cria um novo colaborador"""
    db_colaborador = (
        db.query(Colaborador).filter(Colaborador.email == colaborador.email).first()
    )

    if db_colaborador:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    db_colaborador = Colaborador(**colaborador.model_dump())
    db.add(db_colaborador)
    db.commit()
    db.refresh(db_colaborador)
    return db_colaborador


@router.put("/{colaborador_id}", response_model=ColaboradorResponse)
def update_colaborador(
    colaborador_id: int,
    colaborador: ColaboradorUpdate,
    db: Session = Depends(get_db),
):
    """Atualiza um colaborador"""
    db_colaborador = (
        db.query(Colaborador).filter(Colaborador.id == colaborador_id).first()
    )

    if not db_colaborador:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")

    update_data = colaborador.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_colaborador, field, value)

    db.commit()
    db.refresh(db_colaborador)
    return db_colaborador
