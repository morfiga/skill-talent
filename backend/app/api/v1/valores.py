from app.database import get_db
from app.models.registro_valor import Valor
from app.schemas.registro_valor import ValorListResponse, ValorResponse
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/valores", tags=["valores"])


@router.get("/", response_model=ValorListResponse)
def get_valores(db: Session = Depends(get_db)):
    """Lista todos os valores disponíveis"""
    valores = db.query(Valor).all()
    return {"valores": valores}


@router.get("/{valor_id}", response_model=ValorResponse)
def get_valor(valor_id: int, db: Session = Depends(get_db)):
    """Obtém um valor por ID"""
    valor = db.query(Valor).filter(Valor.id == valor_id).first()

    if not valor:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Valor não encontrado")

    return valor
