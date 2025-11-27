from typing import List, Optional

from pydantic import BaseModel


class NivelEixoBase(BaseModel):
    nivel: int
    descricao: str


class NivelEixoResponse(NivelEixoBase):
    id: int

    class Config:
        from_attributes = True


class EixoAvaliacaoBase(BaseModel):
    codigo: str
    nome: str


class EixoAvaliacaoResponse(EixoAvaliacaoBase):
    id: int
    niveis: List[NivelEixoResponse] = []

    class Config:
        from_attributes = True


class EixoAvaliacaoListResponse(BaseModel):
    eixos: List[EixoAvaliacaoResponse]
