from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.validators import CAMPO_TEXTO_LONGO_MAX
from app.schemas.colaborador import ColaboradorResponse

# =============================================================================
# Constantes das Perguntas
# =============================================================================

CATEGORIAS_PERGUNTAS = {
    "lideranca_direcionamento": "Liderança e Direcionamento",
    "comunicacao": "Comunicação",
    "desenvolvimento_suporte": "Desenvolvimento e Suporte",
    "cultura_comportamento": "Cultura e Comportamento",
    "execucao_organizacao": "Execução e Organização",
    "perguntas_abertas": "Perguntas Abertas",
}

PERGUNTAS_FECHADAS = {
    # Liderança e Direcionamento
    "lideranca_expectativas_claras": {
        "categoria": "lideranca_direcionamento",
        "texto": "Meu gestor define expectativas claras sobre prioridades, metas e padrões de qualidade?",
    },
    "lideranca_decisoes_consistentes": {
        "categoria": "lideranca_direcionamento",
        "texto": "Meu gestor toma decisões de forma consistente e transparente?",
    },
    "lideranca_foco_resultado": {
        "categoria": "lideranca_direcionamento",
        "texto": "Meu gestor nos orienta com foco em resultado, mas sem microgerenciar?",
    },
    # Comunicação
    "comunicacao_clareza": {
        "categoria": "comunicacao",
        "texto": "Meu gestor se comunica com clareza e no momento certo?",
    },
    "comunicacao_escuta": {
        "categoria": "comunicacao",
        "texto": "Meu gestor escuta genuinamente as opiniões da equipe antes de decidir?",
    },
    "comunicacao_contexto": {
        "categoria": "comunicacao",
        "texto": "Meu gestor oferece contexto suficiente para entendermos o \"porquê\" das decisões?",
    },
    # Desenvolvimento e Suporte
    "desenvolvimento_apoio": {
        "categoria": "desenvolvimento_suporte",
        "texto": "Meu gestor apoia meu desenvolvimento profissional e me dá oportunidades de crescer?",
    },
    "desenvolvimento_feedback": {
        "categoria": "desenvolvimento_suporte",
        "texto": "Meu gestor oferece feedbacks úteis, acionáveis e frequentes?",
    },
    "desenvolvimento_reconhecimento": {
        "categoria": "desenvolvimento_suporte",
        "texto": "Meu gestor reconhece entregas que superam expectativas?",
    },
    # Cultura e Comportamento
    "cultura_valores": {
        "categoria": "cultura_comportamento",
        "texto": "Meu gestor age de acordo com os valores da empresa no dia a dia?",
    },
    "cultura_ambiente_seguro": {
        "categoria": "cultura_comportamento",
        "texto": "Meu gestor promove um ambiente seguro para opiniões, testes e aprendizados?",
    },
    "cultura_responsabilidade": {
        "categoria": "cultura_comportamento",
        "texto": "Meu gestor assume responsabilidades pelos resultados da equipe?",
    },
    # Execução e Organização
    "execucao_remocao_bloqueios": {
        "categoria": "execucao_organizacao",
        "texto": "Meu gestor remove bloqueios e ajuda a equipe a avançar rapidamente?",
    },
    "execucao_distribuicao_justa": {
        "categoria": "execucao_organizacao",
        "texto": "Meu gestor distribui tarefas e responsabilidades de forma justa?",
    },
    "execucao_rituais_consistencia": {
        "categoria": "execucao_organizacao",
        "texto": "Meu gestor conduz rituais e processos (1:1, alinhamentos, etc.) com consistência?",
    },
}

PERGUNTAS_ABERTAS = {
    "aberta_continuar_fazendo": {
        "categoria": "perguntas_abertas",
        "texto": "O que seu gestor faz muito bem e deveria continuar fazendo?",
    },
    "aberta_melhorar": {
        "categoria": "perguntas_abertas",
        "texto": "O que seu gestor poderia fazer diferente para melhorar seu impacto?",
    },
    "aberta_exemplo_concreto": {
        "categoria": "perguntas_abertas",
        "texto": "Compartilhe um exemplo concreto de uma situação onde seu gestor ajudou (ou deixou de ajudar) a equipe.",
    },
}

# Lista completa de códigos de perguntas fechadas
PERGUNTAS_FECHADAS_CODIGOS = list(PERGUNTAS_FECHADAS.keys())

# Lista completa de códigos de perguntas abertas
PERGUNTAS_ABERTAS_CODIGOS = list(PERGUNTAS_ABERTAS.keys())

# Lista completa de todas as perguntas
TODAS_PERGUNTAS = {**PERGUNTAS_FECHADAS, **PERGUNTAS_ABERTAS}


# =============================================================================
# Schemas
# =============================================================================


class RespostaPerguntaFechada(BaseModel):
    """Schema para resposta de pergunta fechada (escala 1-5)"""
    pergunta_codigo: str
    resposta_escala: int = Field(..., ge=1, le=5, description="Resposta em escala de 1 a 5")


class RespostaPerguntaAberta(BaseModel):
    """Schema para resposta de pergunta aberta (texto)"""
    pergunta_codigo: str
    resposta_texto: str = Field(..., min_length=1, max_length=CAMPO_TEXTO_LONGO_MAX)


class AvaliacaoGestorRespostaResponse(BaseModel):
    """Schema de resposta individual"""
    id: int
    pergunta_codigo: str
    categoria: str
    resposta_escala: Optional[int] = None
    resposta_texto: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AvaliacaoGestorBase(BaseModel):
    """Schema base para avaliação de gestor"""
    ciclo_id: int = Field(..., gt=0)
    respostas_fechadas: List[RespostaPerguntaFechada] = Field(
        ..., min_length=len(PERGUNTAS_FECHADAS_CODIGOS), max_length=len(PERGUNTAS_FECHADAS_CODIGOS)
    )
    respostas_abertas: List[RespostaPerguntaAberta] = Field(
        ..., min_length=len(PERGUNTAS_ABERTAS_CODIGOS), max_length=len(PERGUNTAS_ABERTAS_CODIGOS)
    )

    @field_validator("respostas_fechadas")
    @classmethod
    def validate_respostas_fechadas(cls, v: List[RespostaPerguntaFechada]) -> List[RespostaPerguntaFechada]:
        """Valida que todas as perguntas fechadas foram respondidas"""
        codigos_respondidos = {r.pergunta_codigo for r in v}
        codigos_esperados = set(PERGUNTAS_FECHADAS_CODIGOS)
        
        if codigos_respondidos != codigos_esperados:
            faltando = codigos_esperados - codigos_respondidos
            extras = codigos_respondidos - codigos_esperados
            mensagem = []
            if faltando:
                mensagem.append(f"Perguntas fechadas faltando: {', '.join(faltando)}")
            if extras:
                mensagem.append(f"Perguntas fechadas inválidas: {', '.join(extras)}")
            raise ValueError("; ".join(mensagem))
        
        # Verificar duplicatas
        if len(codigos_respondidos) != len(v):
            raise ValueError("Há perguntas fechadas duplicadas")
        
        return v

    @field_validator("respostas_abertas")
    @classmethod
    def validate_respostas_abertas(cls, v: List[RespostaPerguntaAberta]) -> List[RespostaPerguntaAberta]:
        """Valida que todas as perguntas abertas foram respondidas"""
        codigos_respondidos = {r.pergunta_codigo for r in v}
        codigos_esperados = set(PERGUNTAS_ABERTAS_CODIGOS)
        
        if codigos_respondidos != codigos_esperados:
            faltando = codigos_esperados - codigos_respondidos
            extras = codigos_respondidos - codigos_esperados
            mensagem = []
            if faltando:
                mensagem.append(f"Perguntas abertas faltando: {', '.join(faltando)}")
            if extras:
                mensagem.append(f"Perguntas abertas inválidas: {', '.join(extras)}")
            raise ValueError("; ".join(mensagem))
        
        # Verificar duplicatas
        if len(codigos_respondidos) != len(v):
            raise ValueError("Há perguntas abertas duplicadas")
        
        return v


class AvaliacaoGestorCreate(AvaliacaoGestorBase):
    """Schema para criação de avaliação de gestor"""
    colaborador_id: Optional[int] = Field(
        None,
        gt=0,
        description="Ignorado - sempre será o colaborador_id do usuário logado"
    )
    gestor_id: Optional[int] = Field(
        None,
        gt=0,
        description="Ignorado - será obtido automaticamente do colaborador"
    )


class AvaliacaoGestorUpdate(BaseModel):
    """Schema para atualização de avaliação de gestor"""
    respostas_fechadas: Optional[List[RespostaPerguntaFechada]] = None
    respostas_abertas: Optional[List[RespostaPerguntaAberta]] = None

    @field_validator("respostas_fechadas")
    @classmethod
    def validate_respostas_fechadas(cls, v: Optional[List[RespostaPerguntaFechada]]) -> Optional[List[RespostaPerguntaFechada]]:
        """Valida as respostas fechadas se fornecidas"""
        if v is None:
            return None
        
        codigos_respondidos = {r.pergunta_codigo for r in v}
        codigos_esperados = set(PERGUNTAS_FECHADAS_CODIGOS)
        
        if codigos_respondidos != codigos_esperados:
            faltando = codigos_esperados - codigos_respondidos
            extras = codigos_respondidos - codigos_esperados
            mensagem = []
            if faltando:
                mensagem.append(f"Perguntas fechadas faltando: {', '.join(faltando)}")
            if extras:
                mensagem.append(f"Perguntas fechadas inválidas: {', '.join(extras)}")
            raise ValueError("; ".join(mensagem))
        
        if len(codigos_respondidos) != len(v):
            raise ValueError("Há perguntas fechadas duplicadas")
        
        return v

    @field_validator("respostas_abertas")
    @classmethod
    def validate_respostas_abertas(cls, v: Optional[List[RespostaPerguntaAberta]]) -> Optional[List[RespostaPerguntaAberta]]:
        """Valida as respostas abertas se fornecidas"""
        if v is None:
            return None
        
        codigos_respondidos = {r.pergunta_codigo for r in v}
        codigos_esperados = set(PERGUNTAS_ABERTAS_CODIGOS)
        
        if codigos_respondidos != codigos_esperados:
            faltando = codigos_esperados - codigos_respondidos
            extras = codigos_respondidos - codigos_esperados
            mensagem = []
            if faltando:
                mensagem.append(f"Perguntas abertas faltando: {', '.join(faltando)}")
            if extras:
                mensagem.append(f"Perguntas abertas inválidas: {', '.join(extras)}")
            raise ValueError("; ".join(mensagem))
        
        if len(codigos_respondidos) != len(v):
            raise ValueError("Há perguntas abertas duplicadas")
        
        return v


class AvaliacaoGestorResponse(BaseModel):
    """Schema de resposta da avaliação de gestor"""
    id: int
    ciclo_id: int
    ciclo_avaliacao_id: Optional[int] = None
    colaborador_id: int
    gestor_id: int
    respostas: List[AvaliacaoGestorRespostaResponse] = []
    colaborador: Optional[ColaboradorResponse] = None
    gestor: Optional[ColaboradorResponse] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    @model_validator(mode="before")
    @classmethod
    def convert_respostas(cls, data: Any) -> Any:
        """Converte as respostas do modelo SQLAlchemy"""
        if isinstance(data, dict):
            return data

        if hasattr(data, "respostas"):
            respostas_list = data.respostas
            data_dict = {
                "id": data.id,
                "ciclo_id": data.ciclo_id,
                "ciclo_avaliacao_id": getattr(data, "ciclo_avaliacao_id", None),
                "colaborador_id": data.colaborador_id,
                "gestor_id": data.gestor_id,
                "respostas": respostas_list,
                "colaborador": getattr(data, "colaborador", None),
                "gestor": getattr(data, "gestor", None),
                "created_at": data.created_at,
                "updated_at": getattr(data, "updated_at", None),
            }
            return data_dict

        return data

    class Config:
        from_attributes = True


class AvaliacaoGestorListResponse(BaseModel):
    """Schema para lista de avaliações de gestor"""
    avaliacoes: List[AvaliacaoGestorResponse]
    total: int


class PerguntasAvaliacaoGestorResponse(BaseModel):
    """Schema para retornar as perguntas disponíveis"""
    categorias: Dict[str, str]
    perguntas_fechadas: Dict[str, Dict[str, str]]
    perguntas_abertas: Dict[str, Dict[str, str]]

