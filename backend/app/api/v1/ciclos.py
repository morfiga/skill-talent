import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ciclo as ciclo_models
from app.schemas import ciclo as ciclo_schemas

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ciclos", tags=["ciclos"])


@router.post("/", response_model=ciclo_schemas.CicloResponse, status_code=201)
def create_ciclo(ciclo: ciclo_schemas.CicloCreate, db: Session = Depends(get_db)):
    """Cria um novo ciclo"""
    db_ciclo = ciclo_models.Ciclo(**ciclo.model_dump())
    db.add(db_ciclo)
    db.commit()
    db.refresh(db_ciclo)
    return db_ciclo


@router.get("/", response_model=ciclo_schemas.CicloListResponse)
def get_ciclos(
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Lista todos os ciclos"""
    query = db.query(ciclo_models.Ciclo)

    if status:
        try:
            status_enum = ciclo_models.StatusCiclo(status)
            query = query.filter(ciclo_models.Ciclo.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail="Status inválido")

    total = query.count()
    ciclos = (
        query.order_by(ciclo_models.Ciclo.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {"ciclos": ciclos, "total": total}


@router.get("/{ciclo_id}", response_model=ciclo_schemas.CicloResponse)
def get_ciclo(ciclo_id: int, db: Session = Depends(get_db)):
    """Obtém um ciclo por ID"""
    ciclo = (
        db.query(ciclo_models.Ciclo).filter(ciclo_models.Ciclo.id == ciclo_id).first()
    )

    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo não encontrado")

    return ciclo


@router.put("/{ciclo_id}", response_model=ciclo_schemas.CicloResponse)
def update_ciclo(
    ciclo_id: int,
    ciclo: ciclo_schemas.CicloUpdate,
    db: Session = Depends(get_db),
):
    """Atualiza um ciclo"""
    db_ciclo = (
        db.query(ciclo_models.Ciclo).filter(ciclo_models.Ciclo.id == ciclo_id).first()
    )

    if not db_ciclo:
        raise HTTPException(status_code=404, detail="Ciclo não encontrado")

    update_data = ciclo.model_dump(exclude_unset=True)

    # Converter status string para enum se fornecido
    if "status" in update_data and update_data["status"]:
        try:
            update_data["status"] = ciclo_models.StatusCiclo(update_data["status"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Status inválido")

    for field, value in update_data.items():
        setattr(db_ciclo, field, value)

    db.commit()
    db.refresh(db_ciclo)
    return db_ciclo


@router.get("/ativo/aberto", response_model=ciclo_schemas.CicloResponse)
def get_ciclo_aberto(db: Session = Depends(get_db)):
    """Obtém o ciclo aberto ativo"""
    logger.debug("GET /ciclos/ativo/aberto - Buscando ciclo aberto")
    
    ciclo = (
        db.query(ciclo_models.Ciclo)
        .filter(ciclo_models.Ciclo.status == ciclo_models.StatusCiclo.ABERTO)
        .order_by(ciclo_models.Ciclo.created_at.desc())
        .first()
    )

    if not ciclo:
        logger.warning("Nenhum ciclo aberto encontrado")
        raise HTTPException(
            status_code=404,
            detail="Nenhum ciclo aberto encontrado",
        )

    logger.debug(f"Ciclo aberto encontrado. ID: {ciclo.id}, Nome: {ciclo.nome}, Status: {ciclo.status}")
    return ciclo
