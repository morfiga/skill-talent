from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr


class ColaboradorBase(BaseModel):
    nome: str
    email: EmailStr
    cargo: Optional[str] = None
    departamento: Optional[str] = None
    avatar: Optional[str] = None
    nivel_carreira: Optional[str] = None
    gestor_id: Optional[int] = None
    google_id: Optional[str] = None


class ColaboradorCreate(ColaboradorBase):
    pass


class ColaboradorUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    cargo: Optional[str] = None
    departamento: Optional[str] = None
    avatar: Optional[str] = None
    nivel_carreira: Optional[str] = None
    gestor_id: Optional[int] = None
    google_id: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class ColaboradorResponse(ColaboradorBase):
    id: int
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
