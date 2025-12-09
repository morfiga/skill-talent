from datetime import datetime
from typing import Any, List, Optional

from app.core.validators import CAMPO_NOME_MAX, CAMPO_NOME_MIN, validate_nome
from app.models.ciclo import EtapaCiclo, StatusCiclo
from pydantic import BaseModel, Field, field_validator, model_validator


class CicloBase(BaseModel):
    nome: str = Field(..., min_length=CAMPO_NOME_MIN, max_length=CAMPO_NOME_MAX)
    status: StatusCiclo = StatusCiclo.ABERTO
    etapa_atual: EtapaCiclo = EtapaCiclo.ESCOLHA_PARES
    data_inicio: Optional[datetime] = None
    data_fim: Optional[datetime] = None

    @field_validator("nome")
    @classmethod
    def validate_nome_field(cls, v: str) -> str:
        return validate_nome(v)

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: Any) -> StatusCiclo:
        if isinstance(v, StatusCiclo):
            return v
        if isinstance(v, str):
            try:
                return StatusCiclo(v)
            except ValueError:
                valid_values = [s.value for s in StatusCiclo]
                raise ValueError(
                    f"Status inválido. Valores aceitos: {', '.join(valid_values)}"
                )
        raise ValueError("Status deve ser uma string válida")

    @field_validator("etapa_atual", mode="before")
    @classmethod
    def validate_etapa(cls, v: Any) -> EtapaCiclo:
        if isinstance(v, EtapaCiclo):
            return v
        if isinstance(v, str):
            try:
                return EtapaCiclo(v)
            except ValueError:
                valid_values = [e.value for e in EtapaCiclo]
                raise ValueError(
                    f"Etapa inválida. Valores aceitos: {', '.join(valid_values)}"
                )
        raise ValueError("Etapa deve ser uma string válida")


class CicloCreate(CicloBase):
    pass


class CicloUpdate(BaseModel):
    nome: Optional[str] = Field(
        None, min_length=CAMPO_NOME_MIN, max_length=CAMPO_NOME_MAX
    )
    status: Optional[StatusCiclo] = None
    etapa_atual: Optional[EtapaCiclo] = None
    data_inicio: Optional[datetime] = None
    data_fim: Optional[datetime] = None

    @field_validator("nome")
    @classmethod
    def validate_nome_field(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return validate_nome(v)
        return v

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: Any) -> Optional[StatusCiclo]:
        if v is None:
            return None
        if isinstance(v, StatusCiclo):
            return v
        if isinstance(v, str):
            try:
                return StatusCiclo(v)
            except ValueError:
                valid_values = [s.value for s in StatusCiclo]
                raise ValueError(
                    f"Status inválido. Valores aceitos: {', '.join(valid_values)}"
                )
        raise ValueError("Status deve ser uma string válida")

    @field_validator("etapa_atual", mode="before")
    @classmethod
    def validate_etapa(cls, v: Any) -> Optional[EtapaCiclo]:
        if v is None:
            return None
        if isinstance(v, EtapaCiclo):
            return v
        if isinstance(v, str):
            try:
                return EtapaCiclo(v)
            except ValueError:
                valid_values = [e.value for e in EtapaCiclo]
                raise ValueError(
                    f"Etapa inválida. Valores aceitos: {', '.join(valid_values)}"
                )
        raise ValueError("Etapa deve ser uma string válida")


class CicloResponse(BaseModel):
    id: int
    nome: str
    status: str
    etapa_atual: str
    data_inicio: Optional[datetime] = None
    data_fim: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    @model_validator(mode="before")
    @classmethod
    def convert_enums(cls, data: Any) -> Any:
        """Converte enums para strings"""
        if isinstance(data, dict):
            return data

        if hasattr(data, "status") and hasattr(data.status, "value"):
            data_dict = {
                "id": data.id,
                "nome": data.nome,
                "status": (
                    data.status.value
                    if hasattr(data.status, "value")
                    else str(data.status)
                ),
                "etapa_atual": (
                    data.etapa_atual.value
                    if hasattr(data.etapa_atual, "value")
                    else str(data.etapa_atual)
                ),
                "data_inicio": data.data_inicio,
                "data_fim": data.data_fim,
                "created_at": data.created_at,
                "updated_at": getattr(data, "updated_at", None),
            }
            return data_dict
        return data

    class Config:
        from_attributes = True


class CicloListResponse(BaseModel):
    ciclos: List[CicloResponse]
    total: int


# =============================================================================
# Schemas de Acompanhamento
# =============================================================================


class ColaboradorAcompanhamentoResponse(BaseModel):
    """Schema para acompanhamento de um colaborador no ciclo"""

    colaborador_id: int
    nome: str
    email: str
    cargo: Optional[str] = None
    departamento: Optional[str] = None
    avatar: Optional[str] = None

    # Status das etapas
    escolheu_pares: bool
    qtd_pares_escolhidos: int

    avaliacoes_pares_total: int  # Quantas avaliações de pares ele deve fazer
    avaliacoes_pares_realizadas: int  # Quantas já fez

    fez_autoavaliacao: bool
    fez_avaliacao_gestor: bool
    tem_gestor: bool  # Se o colaborador tem gestor cadastrado

    # Status específicos para gestores
    fez_autoavaliacao_gestor: bool  # Se é gestor e fez autoavaliação como gestor
    avaliacoes_liderados_total: int  # Quantos liderados ele tem
    avaliacoes_liderados_realizadas: int  # Quantos liderados ele já avaliou


class AcompanhamentoCicloResponse(BaseModel):
    """Schema para resposta do acompanhamento do ciclo"""

    ciclo_id: int
    ciclo_nome: str
    etapa_atual: str
    colaboradores: List[ColaboradorAcompanhamentoResponse]
    total: int
