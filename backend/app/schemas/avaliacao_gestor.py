from datetime import datetime
from typing import Any, Dict, List, Optional

from app.core.validators import CAMPO_TEXTO_LONGO_MAX
from app.schemas.colaborador import ColaboradorResponse
from pydantic import BaseModel, Field, field_validator, model_validator

# =============================================================================
# Constantes das Perguntas
# =============================================================================

CATEGORIAS_PERGUNTAS = {
    "lideranca_direcionamento": "Liderança e Direcionamento",
    "comunicacao": "Comunicação",
    "desenvolvimento_suporte": "Desenvolvimento e Suporte",
    "cultura_comportamento": "Cultura e Comportamento",
    "execucao_organizacao": "Execução e Organização",
    "coragem_maturidade_lideranca": "Coragem e Maturidade de Liderança",
    "perguntas_abertas": "Perguntas Abertas",
}

PERGUNTAS_FECHADAS = {
    # Liderança e Direcionamento
    "ld01": {
        "categoria": "lideranca_direcionamento",
        "texto": "Meu gestor define prioridades claras e revisa com o time quando necessário.",
        "texto_gestor": "Defino prioridades claras e reviso com o time quando necessário.",
    },
    "ld02": {
        "categoria": "lideranca_direcionamento",
        "texto": "Meu gestor toma decisões com rapidez e explica o racional de forma objetiva.",
        "texto_gestor": "Tomo decisões com rapidez e explico o racional de forma objetiva.",
    },
    "ld03": {
        "categoria": "lideranca_direcionamento",
        "texto": "Meu gestor estabelece padrões de qualidade e acompanha a consistência das entregas.",
        "texto_gestor": "Estabeleço padrões de qualidade e acompanho a consistência das entregas.",
    },
    # Comunicação
    "c01": {
        "categoria": "comunicacao",
        "texto": "Meu gestor se comunica com clareza, evita ruídos e traz o contexto necessário no momento certo.",
        "texto_gestor": "Me comunico com clareza, evito ruídos e trago o contexto necessário no momento certo.",
    },
    "c02": {
        "categoria": "comunicacao",
        "texto": "Minhas opiniões são consideradas e meu gestor explica quando não as adota.",
        "texto_gestor": "As opiniões dos meus liderados são consideradas e explico quando não as adoto.",
    },
    # Desenvolvimento e Suporte
    "ds01": {
        "categoria": "desenvolvimento_suporte",
        "texto": "Meu gestor oferece feedbacks frequentes, diretos e úteis.",
        "texto_gestor": "Ofereço feedbacks frequentes, diretos e úteis.",
    },
    "ds02": {
        "categoria": "desenvolvimento_suporte",
        "texto": "Meu gestor reconhece boas entregas e ajuda a ajustar rota quando necessário.",
        "texto_gestor": "Reconheço boas entregas e ajudo a ajustar rota quando necessário.",
    },
    # Cultura e Comportamento
    "cc01": {
        "categoria": "cultura_comportamento",
        "texto": "Meu gestor vive os valores da Ada no dia a dia.",
        "texto_gestor": "Vivo os valores da Ada no dia a dia.",
    },
    "cc02": {
        "categoria": "cultura_comportamento",
        "texto": "Meu gestor assume responsabilidades, corrige rapidamente erros e lida com problemas de forma transparente.",
        "texto_gestor": "Assumo responsabilidades, corrigo rapidamente erros e lidio com problemas de forma transparente.",
    },
    # Execução e Organização
    "eo01": {
        "categoria": "execucao_organizacao",
        "texto": "Os rituais do time são consistentes e produtivos.",
        "texto_gestor": "Os rituais do time são consistentes e produtivos.",
    },
    "eo02": {
        "categoria": "execucao_organizacao",
        "texto": "As responsabilidades do time são distribuídas de forma justa e equilibrada, conforme competências e capacidade de entrega.",
        "texto_gestor": "As responsabilidades do time são distribuídas de forma justa e equilibrada, conforme competências e capacidade de entrega.",
    },
    # Coragem e Maturidade de Liderança
    "pa01": {
        "categoria": "coragem_maturidade_lideranca",
        "texto": "Meu gestor endereça conflitos e conversas difíceis com respeito e objetividade.",
        "texto_gestor": "Endereço conflitos e conversas difíceis com respeito e objetividade.",
    },
    "pa02": {
        "categoria": "coragem_maturidade_lideranca",
        "texto": "Meu gestor protege o foco do time e diz “não” quando necessário.",
        "texto_gestor": "Protejo o foco do time e digo “não” quando necessário.",
    },
}

PERGUNTAS_ABERTAS = {
    "aberta_continuar_fazendo": {
        "categoria": "perguntas_abertas",
        "texto": "O que o seu gestor faz bem e que contribui positivamente para seu desenvolvimento ou para o desempenho do time?",
        "texto_gestor": "O que faço bem e que contribui positivamente para o desenvolvimento ou o desempenho do time?",
    },
    "aberta_melhorar": {
        "categoria": "perguntas_abertas",
        "texto": "O que seu gestor poderia fazer de forma diferente para melhorar sua experiência e apoiar melhor seu trabalho no dia a dia?",
        "texto_gestor": "O que eu poderia fazer de forma diferente para melhorar a experiência do time e apoiar melhor no trabalho do dia a dia?",
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
    resposta_escala: int = Field(
        ..., ge=1, le=5, description="Resposta em escala de 1 a 5"
    )
    justificativa: Optional[str] = Field(
        None,
        max_length=CAMPO_TEXTO_LONGO_MAX,
        description="Justificativa obrigatória para respostas 1 ou 5 na avaliação do gestor",
    )


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
    justificativa: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AvaliacaoGestorBase(BaseModel):
    """Schema base para avaliação de gestor"""

    ciclo_id: int = Field(..., gt=0)
    respostas_fechadas: List[RespostaPerguntaFechada] = Field(
        ...,
        min_length=len(PERGUNTAS_FECHADAS_CODIGOS),
        max_length=len(PERGUNTAS_FECHADAS_CODIGOS),
    )
    respostas_abertas: List[RespostaPerguntaAberta] = Field(
        ...,
        min_length=len(PERGUNTAS_ABERTAS_CODIGOS),
        max_length=len(PERGUNTAS_ABERTAS_CODIGOS),
    )

    @field_validator("respostas_fechadas")
    @classmethod
    def validate_respostas_fechadas(
        cls, v: List[RespostaPerguntaFechada]
    ) -> List[RespostaPerguntaFechada]:
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
    def validate_respostas_abertas(
        cls, v: List[RespostaPerguntaAberta]
    ) -> List[RespostaPerguntaAberta]:
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
        description="Ignorado - sempre será o colaborador_id do usuário logado",
    )
    gestor_id: Optional[int] = Field(
        None, gt=0, description="Ignorado - será obtido automaticamente do colaborador"
    )


class AvaliacaoGestorUpdate(BaseModel):
    """Schema para atualização de avaliação de gestor"""

    respostas_fechadas: Optional[List[RespostaPerguntaFechada]] = None
    respostas_abertas: Optional[List[RespostaPerguntaAberta]] = None

    @field_validator("respostas_fechadas")
    @classmethod
    def validate_respostas_fechadas(
        cls, v: Optional[List[RespostaPerguntaFechada]]
    ) -> Optional[List[RespostaPerguntaFechada]]:
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
    def validate_respostas_abertas(
        cls, v: Optional[List[RespostaPerguntaAberta]]
    ) -> Optional[List[RespostaPerguntaAberta]]:
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
    # colaborador_id: int
    gestor_id: int
    respostas: List[AvaliacaoGestorRespostaResponse] = []
    # colaborador: Optional[ColaboradorResponse] = None
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
                # "colaborador_id": data.colaborador_id,
                "gestor_id": data.gestor_id,
                "respostas": respostas_list,
                # "colaborador": getattr(data, "colaborador", None),
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
