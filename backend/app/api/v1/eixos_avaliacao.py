from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.eixo_avaliacao import EixoAvaliacaoListResponse, EixoAvaliacaoResponse
from app.services.eixo_avaliacao_service import EixoAvaliacaoService

router = APIRouter(prefix="/eixos-avaliacao", tags=["eixos-avaliacao"])


def get_eixo_avaliacao_service(db: Session = Depends(get_db)) -> EixoAvaliacaoService:
    return EixoAvaliacaoService(db)


@router.get("/", response_model=EixoAvaliacaoListResponse)
def get_eixos_avaliacao(
    service: EixoAvaliacaoService = Depends(get_eixo_avaliacao_service),
):
    return service.get_all()


@router.get("/{eixo_id}", response_model=EixoAvaliacaoResponse)
def get_eixo_avaliacao(
    eixo_id: int, service: EixoAvaliacaoService = Depends(get_eixo_avaliacao_service)
):
    return service.get(eixo_id)
