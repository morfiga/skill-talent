from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from app.schemas.colaborador import ColaboradorResponse


class EntregaOutstandingBase(BaseModel):
    descricao: str
    impacto: str
    evidencias: str


class EntregaOutstandingCreate(EntregaOutstandingBase):
    pass


class EntregaOutstandingUpdate(BaseModel):
    descricao: Optional[str] = None
    impacto: Optional[str] = None
    evidencias: Optional[str] = None


class EntregaOutstandingResponse(EntregaOutstandingBase):
    id: int
    colaborador_id: int
    colaborador: Optional[ColaboradorResponse] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EntregaOutstandingListResponse(BaseModel):
    entregas: List[EntregaOutstandingResponse]
    total: int
