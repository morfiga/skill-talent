from datetime import datetime
from typing import List, Optional

from app.schemas.ciclo import CicloResponse
from app.schemas.colaborador import ColaboradorResponse
from pydantic import BaseModel


class CicloAvaliacaoBase(BaseModel):
    pass


class CicloAvaliacaoCreate(CicloAvaliacaoBase):
    ciclo_id: int
    pares_ids: List[int]  # IDs dos 4 pares selecionados
    # colaborador_id será sempre do usuário logado


class CicloAvaliacaoUpdate(BaseModel):
    pares_ids: List[int]  # IDs dos 4 pares selecionados


class ParSelecionadoResponse(BaseModel):
    id: int
    par_id: int
    par: Optional[ColaboradorResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CicloAvaliacaoResponse(CicloAvaliacaoBase):
    id: int
    ciclo_id: int
    ciclo: Optional[CicloResponse] = None
    colaborador_id: int
    colaborador: Optional[ColaboradorResponse] = None
    pares_selecionados: List[ParSelecionadoResponse] = []
    pares_para_avaliar: List[ColaboradorResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CicloAvaliacaoListResponse(BaseModel):
    ciclos: List[CicloAvaliacaoResponse]
    total: int
