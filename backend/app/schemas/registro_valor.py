from datetime import datetime
from typing import List, Optional

from app.core.validators import CAMPO_TEXTO_LONGO_MAX, CAMPO_TEXTO_MAX
from app.schemas.colaborador import ColaboradorResponse
from pydantic import BaseModel, Field


class ValorBase(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=50)
    nome: str = Field(..., min_length=1, max_length=100)
    icone: Optional[str] = Field(None, max_length=100)


class ValorResponse(ValorBase):
    id: int

    class Config:
        from_attributes = True


class ValorListResponse(BaseModel):
    valores: List[ValorResponse]


class RegistroValorBase(BaseModel):
    descricao: str = Field(..., min_length=1, max_length=CAMPO_TEXTO_LONGO_MAX)
    impacto: str = Field(..., min_length=1, max_length=CAMPO_TEXTO_LONGO_MAX)


class RegistroValorCreate(RegistroValorBase):
    valores_ids: List[int] = Field(
        ..., min_length=1, description="IDs dos valores associados"
    )


class RegistroValorUpdate(BaseModel):
    descricao: Optional[str] = Field(
        None, min_length=1, max_length=CAMPO_TEXTO_LONGO_MAX
    )
    impacto: Optional[str] = Field(None, min_length=1, max_length=CAMPO_TEXTO_LONGO_MAX)
    valores_ids: Optional[List[int]] = Field(None, min_length=1)


class RegistroValorResponse(RegistroValorBase):
    id: int
    colaborador_id: int
    colaborador: Optional[ColaboradorResponse] = None
    valores: List[ValorResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RegistroValorListResponse(BaseModel):
    registros: List[RegistroValorResponse]
    total: int
