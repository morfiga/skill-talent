import logging
from typing import Optional

from app.database import get_db
from app.models.ciclo import Ciclo, EtapaCiclo, StatusCiclo
from app.schemas.ciclo import CicloCreate, CicloListResponse, CicloResponse, CicloUpdate
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ciclos", tags=["ciclos"])


@router.post("/", response_model=CicloResponse, status_code=201)
def create_ciclo(ciclo: CicloCreate, db: Session = Depends(get_db)):
    """Cria um novo ciclo"""
    db_ciclo = Ciclo(**ciclo.model_dump())
    db.add(db_ciclo)
    db.commit()
    db.refresh(db_ciclo)
    return db_ciclo


@router.get("/", response_model=CicloListResponse)
def get_ciclos(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Lista todos os ciclos"""
    query = db.query(Ciclo)

    if status:
        try:
            status_enum = StatusCiclo(status)
            query = query.filter(Ciclo.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail="Status inválido")

    ciclos = query.order_by(Ciclo.created_at.desc()).all()
    total = len(ciclos)

    return {"ciclos": ciclos, "total": total}


@router.get("/{ciclo_id}", response_model=CicloResponse)
def get_ciclo(ciclo_id: int, db: Session = Depends(get_db)):
    """Obtém um ciclo por ID"""
    ciclo = db.query(Ciclo).filter(Ciclo.id == ciclo_id).first()

    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo não encontrado")

    return ciclo


@router.put("/{ciclo_id}", response_model=CicloResponse)
def update_ciclo(
    ciclo_id: int,
    ciclo: CicloUpdate,
    db: Session = Depends(get_db),
):
    """Atualiza um ciclo"""
    db_ciclo = db.query(Ciclo).filter(Ciclo.id == ciclo_id).first()

    if not db_ciclo:
        raise HTTPException(status_code=404, detail="Ciclo não encontrado")

    update_data = ciclo.model_dump(exclude_unset=True)

    # Converter status string para enum se fornecido
    if "status" in update_data and update_data["status"]:
        try:
            update_data["status"] = StatusCiclo(update_data["status"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Status inválido")

    # Converter etapa_atual string para enum se fornecido
    if "etapa_atual" in update_data and update_data["etapa_atual"]:
        try:
            update_data["etapa_atual"] = EtapaCiclo(update_data["etapa_atual"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Etapa inválida")

    for field, value in update_data.items():
        setattr(db_ciclo, field, value)

    db.commit()
    db.refresh(db_ciclo)
    return db_ciclo


@router.get("/ativo/aberto", response_model=CicloResponse)
def get_ciclo_aberto(db: Session = Depends(get_db)):
    """Obtém o ciclo aberto ativo"""
    logger.debug("GET /ciclos/ativo/aberto - Buscando ciclo aberto")

    ciclo = (
        db.query(Ciclo)
        .filter(Ciclo.status == StatusCiclo.ABERTO)
        .order_by(Ciclo.created_at.desc())
        .first()
    )

    if not ciclo:
        logger.warning("Nenhum ciclo aberto encontrado")
        raise HTTPException(
            status_code=404,
            detail="Nenhum ciclo aberto encontrado",
        )

    logger.debug(
        f"Ciclo aberto encontrado. ID: {ciclo.id}, Nome: {ciclo.nome}, Status: {ciclo.status}"
    )
    return ciclo


@router.post("/{ciclo_id}/avancar-etapa", response_model=CicloResponse)
def avancar_etapa(ciclo_id: int, db: Session = Depends(get_db)):
    """Avança a etapa atual do ciclo para a próxima"""
    db_ciclo = db.query(Ciclo).filter(Ciclo.id == ciclo_id).first()

    if not db_ciclo:
        raise HTTPException(status_code=404, detail="Ciclo não encontrado")

    # Sequência de etapas
    etapas_sequencia = [
        EtapaCiclo.ESCOLHA_PARES,
        EtapaCiclo.APROVACAO_PARES,
        EtapaCiclo.AVALIACOES,
        EtapaCiclo.CALIBRACAO,
        EtapaCiclo.FEEDBACK,
    ]

    try:
        etapa_atual_idx = etapas_sequencia.index(db_ciclo.etapa_atual)
        if etapa_atual_idx < len(etapas_sequencia) - 1:
            db_ciclo.etapa_atual = etapas_sequencia[etapa_atual_idx + 1]
            db.commit()
            db.refresh(db_ciclo)
            return db_ciclo
        else:
            raise HTTPException(status_code=400, detail="Ciclo já está na última etapa")
    except ValueError:
        raise HTTPException(status_code=400, detail="Etapa atual inválida")


@router.delete("/{ciclo_id}", status_code=204)
def delete_ciclo(ciclo_id: int, db: Session = Depends(get_db)):
    """Exclui um ciclo"""
    db_ciclo = db.query(Ciclo).filter(Ciclo.id == ciclo_id).first()

    if not db_ciclo:
        raise HTTPException(status_code=404, detail="Ciclo não encontrado")

    db.delete(db_ciclo)
    db.commit()
    return None
