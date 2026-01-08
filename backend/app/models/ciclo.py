import enum

from app.database import Base
from sqlalchemy import Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


def get_enum_values(enum_class):
    return [member.value for member in enum_class]


class StatusCiclo(str, enum.Enum):
    ABERTO = "aberto"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDO = "concluido"
    FECHADO = "fechado"


class EtapaCiclo(str, enum.Enum):
    ESCOLHA_PARES = "escolha_pares"
    APROVACAO_PARES = "aprovacao_pares"
    AVALIACOES = "avaliacoes"
    CALIBRACAO = "calibracao"
    FEEDBACK = "feedback"


class Ciclo(Base):
    __tablename__ = "ciclos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)  # Ex: "Ciclo 2024 Q1"
    status = Column(
        SQLEnum(StatusCiclo, values_callable=get_enum_values),
        default=StatusCiclo.ABERTO,
    )
    etapa_atual = Column(
        SQLEnum(EtapaCiclo, values_callable=get_enum_values),
        default=EtapaCiclo.ESCOLHA_PARES,
    )
    data_inicio = Column(DateTime(timezone=True), server_default=func.now())
    data_fim = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relacionamentos
    ciclos_avaliacao = relationship("CicloAvaliacao", back_populates="ciclo")
    avaliacoes = relationship("Avaliacao", back_populates="ciclo")
    avaliacoes_gestor = relationship("AvaliacaoGestor", back_populates="ciclo")
    feedbacks_liberacao = relationship("FeedbackLiberacao", back_populates="ciclo")
