from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from app.schemas.colaborador import ColaboradorResponse


class ValorBase(BaseModel):
    codigo: str
    nome: str
    icone: Optional[str] = None


class ValorResponse(ValorBase):
    id: int

    class Config:
        from_attributes = True


class ValorListResponse(BaseModel):
    valores: List[ValorResponse]


class RegistroValorBase(BaseModel):
    descricao: str
    reflexao: str
    impacto: str
    valores_ids: List[int]


class RegistroValorCreate(RegistroValorBase):
    pass


class RegistroValorUpdate(BaseModel):
    descricao: Optional[str] = None
    reflexao: Optional[str] = None
    impacto: Optional[str] = None
    valores_ids: Optional[List[int]] = None


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
