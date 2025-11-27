from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from app.core.validators import NUMERO_PARES_OBRIGATORIO, validate_pares_ids
from app.schemas.ciclo import CicloResponse
from app.schemas.colaborador import ColaboradorResponse


class CicloAvaliacaoBase(BaseModel):
    pass


class CicloAvaliacaoCreate(CicloAvaliacaoBase):
    ciclo_id: int = Field(..., gt=0)
    pares_ids: List[int] = Field(
        ...,
        min_length=NUMERO_PARES_OBRIGATORIO,
        max_length=NUMERO_PARES_OBRIGATORIO,
        description=f"IDs dos {NUMERO_PARES_OBRIGATORIO} pares selecionados"
    )

    @field_validator("pares_ids")
    @classmethod
    def validate_pares(cls, v: List[int]) -> List[int]:
        return validate_pares_ids(v)


class CicloAvaliacaoUpdate(BaseModel):
    pares_ids: List[int] = Field(
        ...,
        min_length=NUMERO_PARES_OBRIGATORIO,
        max_length=NUMERO_PARES_OBRIGATORIO,
        description=f"IDs dos {NUMERO_PARES_OBRIGATORIO} pares selecionados"
    )

    @field_validator("pares_ids")
    @classmethod
    def validate_pares(cls, v: List[int]) -> List[int]:
        return validate_pares_ids(v)


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
