from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class FeedbackLiberacaoBase(BaseModel):
    ciclo_id: int = Field(..., gt=0)
    colaborador_id: int = Field(..., gt=0)
    liberado: bool = False


class FeedbackLiberacaoCreate(FeedbackLiberacaoBase):
    """Schema para criar uma nova liberação de feedback"""
    pass


class FeedbackLiberacaoUpdate(BaseModel):
    """Schema para atualizar uma liberação de feedback"""
    liberado: bool


class FeedbackLiberacaoResponse(FeedbackLiberacaoBase):
    """Schema de resposta para liberação de feedback"""
    id: int
    liberado_por_id: Optional[int] = None
    liberado_em: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FeedbackLiberacaoListResponse(BaseModel):
    """Schema de resposta para lista de liberações de feedback"""
    liberacoes: list[FeedbackLiberacaoResponse]
    total: int

