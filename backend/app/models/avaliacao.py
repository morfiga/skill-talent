import enum

from sqlalchemy import Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


def get_enum_values(enum_class):
    return [member.value for member in enum_class]


class TipoAvaliacao(str, enum.Enum):
    AUTOAVALIACAO = "autoavaliacao"
    PAR = "par"
    GESTOR = "gestor"


class Avaliacao(Base):
    __tablename__ = "avaliacoes"

    id = Column(Integer, primary_key=True, index=True)
    ciclo_id = Column(Integer, ForeignKey("ciclos.id"), nullable=False)
    ciclo_avaliacao_id = Column(
        Integer, ForeignKey("ciclos_avaliacao.id"), nullable=True
    )
    avaliador_id = Column(Integer, ForeignKey("colaboradores.id"), nullable=False)
    avaliado_id = Column(Integer, ForeignKey("colaboradores.id"), nullable=False)
    tipo = Column(
        SQLEnum(TipoAvaliacao, values_callable=get_enum_values),
        nullable=False,
    )
    avaliacao_geral = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relacionamentos
    ciclo = relationship("Ciclo", back_populates="avaliacoes")
    ciclo_avaliacao = relationship("CicloAvaliacao")
    avaliador = relationship(
        "Colaborador",
        foreign_keys=[avaliador_id],
        back_populates="avaliacoes_realizadas",
    )
    avaliado = relationship(
        "Colaborador", foreign_keys=[avaliado_id], back_populates="avaliacoes_recebidas"
    )
    eixos = relationship("AvaliacaoEixo", back_populates="avaliacao")


class AvaliacaoEixo(Base):
    __tablename__ = "avaliacoes_eixos"

    id = Column(Integer, primary_key=True, index=True)
    avaliacao_id = Column(Integer, ForeignKey("avaliacoes.id"), nullable=False)
    eixo_id = Column(Integer, ForeignKey("eixos_avaliacao.id"), nullable=False)
    nivel = Column(Integer, nullable=False)  # 1 a 5
    justificativa = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relacionamentos
    avaliacao = relationship("Avaliacao", back_populates="eixos")
    eixo = relationship("EixoAvaliacao", back_populates="avaliacoes_eixos")
