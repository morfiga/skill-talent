from datetime import datetime
from typing import List, Optional

from app.models.ciclo import EtapaCiclo, StatusCiclo
from pydantic import BaseModel


class CicloBase(BaseModel):
    nome: str
    status: Optional[str] = StatusCiclo.ABERTO.value
    etapa_atual: Optional[str] = EtapaCiclo.ESCOLHA_PARES.value
    data_inicio: Optional[datetime] = None
    data_fim: Optional[datetime] = None


class CicloCreate(CicloBase):
    pass


class CicloUpdate(BaseModel):
    nome: Optional[str] = None
    status: Optional[str] = None
    etapa_atual: Optional[str] = None
    data_inicio: Optional[datetime] = None
    data_fim: Optional[datetime] = None


class CicloResponse(CicloBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CicloListResponse(BaseModel):
    ciclos: List[CicloResponse]
    total: int
