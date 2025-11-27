from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.core.validators import CAMPO_TEXTO_LONGO_MAX
from app.schemas.colaborador import ColaboradorResponse


class EntregaOutstandingBase(BaseModel):
    descricao: str = Field(..., min_length=1, max_length=CAMPO_TEXTO_LONGO_MAX)
    impacto: str = Field(..., min_length=1, max_length=CAMPO_TEXTO_LONGO_MAX)
    evidencias: str = Field(..., min_length=1, max_length=CAMPO_TEXTO_LONGO_MAX)


class EntregaOutstandingCreate(EntregaOutstandingBase):
    pass


class EntregaOutstandingUpdate(BaseModel):
    descricao: Optional[str] = Field(None, min_length=1, max_length=CAMPO_TEXTO_LONGO_MAX)
    impacto: Optional[str] = Field(None, min_length=1, max_length=CAMPO_TEXTO_LONGO_MAX)
    evidencias: Optional[str] = Field(None, min_length=1, max_length=CAMPO_TEXTO_LONGO_MAX)


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
