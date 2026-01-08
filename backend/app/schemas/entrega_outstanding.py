from datetime import datetime
from enum import Enum
from typing import List, Optional

from app.core.validators import CAMPO_TEXTO_LONGO_MAX
from app.schemas.colaborador import ColaboradorResponse
from pydantic import BaseModel, Field


class StatusAprovacao(str, Enum):
    PENDENTE = "pendente"
    APROVADO = "aprovado"
    REPROVADO = "reprovado"


class EntregaOutstandingBase(BaseModel):
    descricao: str = Field(..., min_length=1, max_length=CAMPO_TEXTO_LONGO_MAX)
    impacto: str = Field(..., min_length=1, max_length=CAMPO_TEXTO_LONGO_MAX)
    evidencias: str = Field(..., min_length=1, max_length=CAMPO_TEXTO_LONGO_MAX)


class EntregaOutstandingCreate(EntregaOutstandingBase):
    pass


class EntregaOutstandingUpdate(BaseModel):
    descricao: Optional[str] = Field(
        None, min_length=1, max_length=CAMPO_TEXTO_LONGO_MAX
    )
    impacto: Optional[str] = Field(None, min_length=1, max_length=CAMPO_TEXTO_LONGO_MAX)
    evidencias: Optional[str] = Field(
        None, min_length=1, max_length=CAMPO_TEXTO_LONGO_MAX
    )


class EntregaOutstandingResponse(EntregaOutstandingBase):
    id: int
    colaborador_id: int
    colaborador: Optional[ColaboradorResponse] = None
    status_aprovacao: StatusAprovacao = StatusAprovacao.PENDENTE
    aprovado_por_id: Optional[int] = None
    aprovado_por: Optional[ColaboradorResponse] = None
    aprovado_em: Optional[datetime] = None
    observacao_aprovacao: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EntregaOutstandingListResponse(BaseModel):
    entregas: List[EntregaOutstandingResponse]
    total: int


class AprovarEntregaOutstandingRequest(BaseModel):
    observacao: Optional[str] = Field(None, max_length=CAMPO_TEXTO_LONGO_MAX)


class ReprovarEntregaOutstandingRequest(BaseModel):
    observacao: str = Field(..., min_length=1, max_length=CAMPO_TEXTO_LONGO_MAX)
