from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.validators import (
    CAMPO_NOME_MAX,
    CAMPO_NOME_MIN,
    CAMPO_TEXTO_MAX,
    NIVEL_CARREIRA_PATTERN,
    validate_nivel_carreira,
    validate_nome,
)


class ColaboradorBase(BaseModel):
    nome: str = Field(..., min_length=CAMPO_NOME_MIN, max_length=CAMPO_NOME_MAX)
    email: EmailStr
    cargo: Optional[str] = Field(None, max_length=CAMPO_TEXTO_MAX)
    departamento: Optional[str] = Field(None, max_length=CAMPO_TEXTO_MAX)
    avatar: Optional[str] = Field(None, max_length=500)
    nivel_carreira: Optional[str] = Field(None, pattern=NIVEL_CARREIRA_PATTERN)
    gestor_id: Optional[int] = Field(None, gt=0)
    google_id: Optional[str] = Field(None, max_length=100)

    @field_validator("nome")
    @classmethod
    def validate_nome_field(cls, v: str) -> str:
        return validate_nome(v)

    @field_validator("nivel_carreira")
    @classmethod
    def validate_nivel_carreira_field(cls, v: Optional[str]) -> Optional[str]:
        return validate_nivel_carreira(v)


class ColaboradorCreate(ColaboradorBase):
    pass


class ColaboradorUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=CAMPO_NOME_MIN, max_length=CAMPO_NOME_MAX)
    email: Optional[EmailStr] = None
    cargo: Optional[str] = Field(None, max_length=CAMPO_TEXTO_MAX)
    departamento: Optional[str] = Field(None, max_length=CAMPO_TEXTO_MAX)
    avatar: Optional[str] = Field(None, max_length=500)
    nivel_carreira: Optional[str] = Field(None, pattern=NIVEL_CARREIRA_PATTERN)
    gestor_id: Optional[int] = Field(None, gt=0)
    google_id: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None

    @field_validator("nome")
    @classmethod
    def validate_nome_field(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return validate_nome(v)
        return v

    @field_validator("nivel_carreira")
    @classmethod
    def validate_nivel_carreira_field(cls, v: Optional[str]) -> Optional[str]:
        return validate_nivel_carreira(v)


class ColaboradorResponse(BaseModel):
    id: int
    nome: str
    email: EmailStr
    cargo: Optional[str] = None
    departamento: Optional[str] = None
    avatar: Optional[str] = None
    nivel_carreira: Optional[str] = None
    gestor_id: Optional[int] = None
    google_id: Optional[str] = None
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ColaboradorAuthResponse(BaseModel):
    """Schema para resposta de autenticação"""

    id: int
    email: EmailStr
    nome: str
    avatar: Optional[str] = None
    is_active: bool
    is_admin: bool

    class Config:
        from_attributes = True


class ColaboradorListResponse(BaseModel):
    colaboradores: List[ColaboradorResponse]
    total: int
