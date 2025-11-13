from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import registro_valor as registro_models
from app.schemas import registro_valor as registro_schemas

router = APIRouter(prefix="/valores", tags=["valores"])


@router.get("/", response_model=registro_schemas.ValorListResponse)
def get_valores(db: Session = Depends(get_db)):
    """Lista todos os valores disponíveis"""
    valores = db.query(registro_models.Valor).all()
    return {"valores": valores}


@router.get("/{valor_id}", response_model=registro_schemas.ValorResponse)
def get_valor(valor_id: int, db: Session = Depends(get_db)):
    """Obtém um valor por ID"""
    valor = (
        db.query(registro_models.Valor)
        .filter(registro_models.Valor.id == valor_id)
        .first()
    )

    if not valor:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Valor não encontrado")

    return valor
