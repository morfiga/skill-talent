from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_colaborador
from app.database import get_db
from app.models import colaborador as colaborador_models
from app.models import entrega_outstanding as entrega_models
from app.schemas import entrega_outstanding as entrega_schemas

router = APIRouter(prefix="/entregas-outstanding", tags=["entregas-outstanding"])


@router.post(
    "/", response_model=entrega_schemas.EntregaOutstandingResponse, status_code=201
)
def create_entrega_outstanding(
    entrega: entrega_schemas.EntregaOutstandingCreate,
    current_colaborador: colaborador_models.Colaborador = Depends(get_current_colaborador),
    db: Session = Depends(get_db),
):
    """Cria uma nova entrega outstanding para o usuário logado"""
    db_entrega = entrega_models.EntregaOutstanding(
        colaborador_id=current_colaborador.id, **entrega.model_dump()
    )
    db.add(db_entrega)
    db.commit()
    db.refresh(db_entrega)
    return db_entrega


@router.get("/", response_model=entrega_schemas.EntregaOutstandingListResponse)
def get_entregas_outstanding(
    current_colaborador: colaborador_models.Colaborador = Depends(get_current_colaborador),
    db: Session = Depends(get_db),
):
    """Lista entregas outstanding do usuário logado"""
    query = db.query(entrega_models.EntregaOutstanding).filter(
        entrega_models.EntregaOutstanding.colaborador_id == current_colaborador.id
    )

    entregas = query.order_by(entrega_models.EntregaOutstanding.created_at.desc()).all()
    total = len(entregas)

    return {"entregas": entregas, "total": total}


@router.get("/{entrega_id}", response_model=entrega_schemas.EntregaOutstandingResponse)
def get_entrega_outstanding(
    entrega_id: int,
    current_colaborador: colaborador_models.Colaborador = Depends(get_current_colaborador),
    db: Session = Depends(get_db),
):
    """Obtém uma entrega outstanding por ID (apenas se pertencer ao usuário logado)"""
    entrega = (
        db.query(entrega_models.EntregaOutstanding)
        .filter(entrega_models.EntregaOutstanding.id == entrega_id)
        .first()
    )

    if not entrega:
        raise HTTPException(
            status_code=404, detail="Entrega outstanding não encontrada"
        )

    # Validar que a entrega pertence ao colaborador logado
    if entrega.colaborador_id != current_colaborador.id:
        raise HTTPException(
            status_code=403,
            detail="Você só pode buscar suas próprias entregas outstanding",
        )

    return entrega


@router.put("/{entrega_id}", response_model=entrega_schemas.EntregaOutstandingResponse)
def update_entrega_outstanding(
    entrega_id: int,
    entrega: entrega_schemas.EntregaOutstandingUpdate,
    current_colaborador: colaborador_models.Colaborador = Depends(get_current_colaborador),
    db: Session = Depends(get_db),
):
    """Atualiza uma entrega outstanding (apenas se pertencer ao usuário logado)"""
    db_entrega = (
        db.query(entrega_models.EntregaOutstanding)
        .filter(entrega_models.EntregaOutstanding.id == entrega_id)
        .first()
    )

    if not db_entrega:
        raise HTTPException(
            status_code=404, detail="Entrega outstanding não encontrada"
        )

    # Validar que a entrega pertence ao colaborador logado
    if db_entrega.colaborador_id != current_colaborador.id:
        raise HTTPException(
            status_code=403,
            detail="Você só pode atualizar suas próprias entregas outstanding",
        )

    update_data = entrega.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_entrega, field, value)

    db.commit()
    db.refresh(db_entrega)
    return db_entrega


@router.delete("/{entrega_id}", status_code=204)
def delete_entrega_outstanding(
    entrega_id: int,
    current_colaborador: colaborador_models.Colaborador = Depends(get_current_colaborador),
    db: Session = Depends(get_db),
):
    """Deleta uma entrega outstanding (apenas se pertencer ao usuário logado)"""
    entrega = (
        db.query(entrega_models.EntregaOutstanding)
        .filter(entrega_models.EntregaOutstanding.id == entrega_id)
        .first()
    )

    if not entrega:
        raise HTTPException(
            status_code=404, detail="Entrega outstanding não encontrada"
        )

    # Validar que a entrega pertence ao colaborador logado
    if entrega.colaborador_id != current_colaborador.id:
        raise HTTPException(
            status_code=403,
            detail="Você só pode deletar suas próprias entregas outstanding",
        )

    db.delete(entrega)
    db.commit()
    return None
