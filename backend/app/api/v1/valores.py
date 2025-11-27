from app.database import get_db
from app.schemas.registro_valor import ValorListResponse, ValorResponse
from app.services.valor import ValorService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/valores", tags=["valores"])


def get_valor_service(db: Session = Depends(get_db)) -> ValorService:
    return ValorService(db)


@router.get("/", response_model=ValorListResponse)
def get_valores(service: ValorService = Depends(get_valor_service)):
    """Lista todos os valores disponíveis"""
    valores = service.get_valores()
    return {"valores": valores}


@router.get("/{valor_id}", response_model=ValorResponse)
def get_valor(valor_id: int, service: ValorService = Depends(get_valor_service)):
    """Obtém um valor por ID"""
    valor = service.get_valor(valor_id)
    return valor
