from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import eixo_avaliacao as eixo_models
from app.schemas import eixo_avaliacao as eixo_schemas

router = APIRouter(prefix="/eixos-avaliacao", tags=["eixos-avaliacao"])


@router.get("/", response_model=eixo_schemas.EixoAvaliacaoListResponse)
def get_eixos_avaliacao(db: Session = Depends(get_db)):
    """Lista todos os eixos de avaliação com seus níveis"""
    eixos = db.query(eixo_models.EixoAvaliacao).all()
    return {"eixos": eixos}


@router.get("/{eixo_id}", response_model=eixo_schemas.EixoAvaliacaoResponse)
def get_eixo_avaliacao(eixo_id: int, db: Session = Depends(get_db)):
    """Obtém um eixo de avaliação por ID"""
    eixo = (
        db.query(eixo_models.EixoAvaliacao)
        .filter(eixo_models.EixoAvaliacao.id == eixo_id)
        .first()
    )

    if not eixo:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Eixo de avaliação não encontrado")

    return eixo
