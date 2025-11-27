from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.validators import CAMPO_TEXTO_LONGO_MAX
from app.models.avaliacao import TipoAvaliacao
from app.schemas.colaborador import ColaboradorResponse
from app.schemas.eixo_avaliacao import EixoAvaliacaoResponse


class AvaliacaoEixoBase(BaseModel):
    eixo_id: int = Field(..., gt=0)
    nivel: int = Field(..., ge=1, le=5, description="Nível de 1 a 5")
    justificativa: str = Field(..., min_length=1, max_length=CAMPO_TEXTO_LONGO_MAX)


class AvaliacaoEixoResponse(AvaliacaoEixoBase):
    id: int
    eixo: Optional[EixoAvaliacaoResponse] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AvaliacaoBase(BaseModel):
    tipo: TipoAvaliacao  # Enum validado automaticamente
    avaliacao_geral: Optional[str] = Field(None, max_length=CAMPO_TEXTO_LONGO_MAX)
    eixos: Dict[str, Dict[str, Any]]  # {eixo_id: {nivel: int, justificativa: str}}

    @field_validator("tipo", mode="before")
    @classmethod
    def validate_tipo(cls, v: Any) -> TipoAvaliacao:
        if isinstance(v, TipoAvaliacao):
            return v
        if isinstance(v, str):
            try:
                return TipoAvaliacao(v)
            except ValueError:
                valid_types = [t.value for t in TipoAvaliacao]
                raise ValueError(f"Tipo inválido. Valores aceitos: {', '.join(valid_types)}")
        raise ValueError("Tipo deve ser uma string válida")


class AvaliacaoCreate(AvaliacaoBase):
    ciclo_id: int = Field(..., gt=0)
    avaliador_id: Optional[int] = Field(
        None,
        gt=0,
        description="Ignorado - sempre será o colaborador_id do usuário logado"
    )
    avaliado_id: int = Field(
        ...,
        gt=0,
        description="Para autoavaliacao, deve ser o próprio usuário logado"
    )


class AvaliacaoUpdate(BaseModel):
    avaliacao_geral: Optional[str] = Field(None, max_length=CAMPO_TEXTO_LONGO_MAX)
    eixos: Optional[Dict[str, Dict[str, Any]]] = None


class AvaliacaoResponse(BaseModel):
    id: int
    ciclo_id: int
    avaliador_id: int
    avaliado_id: int
    tipo: str
    avaliacao_geral: Optional[str] = None
    eixos: Dict[str, Dict[str, Any]] = {}
    avaliador: Optional[ColaboradorResponse] = None
    avaliado: Optional[ColaboradorResponse] = None
    eixos_detalhados: List[AvaliacaoEixoResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    @model_validator(mode="before")
    @classmethod
    def convert_eixos_to_dict(cls, data: Any) -> Any:
        """Converte a lista de eixos do modelo SQLAlchemy em dicionário"""
        if isinstance(data, dict):
            return data

        # Se for um objeto do SQLAlchemy
        if hasattr(data, "eixos"):
            eixos_list = data.eixos
            if isinstance(eixos_list, list):
                # Converter lista de AvaliacaoEixo em dicionário
                eixos_dict = {}
                for eixo_obj in eixos_list:
                    if hasattr(eixo_obj, "eixo_id"):
                        eixos_dict[str(eixo_obj.eixo_id)] = {
                            "nivel": eixo_obj.nivel,
                            "justificativa": eixo_obj.justificativa,
                        }
                # Criar um dict com os dados do objeto
                data_dict = {
                    "id": data.id,
                    "ciclo_id": data.ciclo_id,
                    "avaliador_id": data.avaliador_id,
                    "avaliado_id": data.avaliado_id,
                    "tipo": (
                        data.tipo.value
                        if hasattr(data.tipo, "value")
                        else str(data.tipo)
                    ),
                    "avaliacao_geral": data.avaliacao_geral,
                    "eixos": eixos_dict,
                    "eixos_detalhados": eixos_list,
                    "avaliador": getattr(data, "avaliador", None),
                    "avaliado": getattr(data, "avaliado", None),
                    "created_at": data.created_at,
                    "updated_at": getattr(data, "updated_at", None),
                }
                return data_dict

        return data

    class Config:
        from_attributes = True


class AvaliacaoListResponse(BaseModel):
    avaliacoes: List[AvaliacaoResponse]
    total: int


class FeedbackResponse(BaseModel):
    """Resposta com dados consolidados para feedback"""

    autoavaliacao: Optional[AvaliacaoResponse] = None
    avaliacao_gestor: Optional[AvaliacaoResponse] = None
    avaliacoes_pares: List[AvaliacaoResponse] = []
    media_pares_por_eixo: Dict[str, float] = {}  # {eixo_id: media}
    niveis_esperados: List[int] = []  # Níveis esperados por eixo baseado no nível de carreira
