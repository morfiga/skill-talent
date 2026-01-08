from enum import Enum as PyEnum

from app.database import Base
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class StatusAprovacao(str, PyEnum):
    PENDENTE = "pendente"
    APROVADO = "aprovado"
    REPROVADO = "reprovado"


class EntregaOutstanding(Base):
    __tablename__ = "entregas_outstanding"

    id = Column(Integer, primary_key=True, index=True)
    colaborador_id = Column(Integer, ForeignKey("colaboradores.id"), nullable=False)
    descricao = Column(Text, nullable=False)
    impacto = Column(Text, nullable=False)
    evidencias = Column(Text, nullable=False)
    status_aprovacao = Column(
        String(20), nullable=False, default=StatusAprovacao.PENDENTE.value
    )
    aprovado_por_id = Column(Integer, ForeignKey("colaboradores.id"), nullable=True)
    aprovado_em = Column(DateTime(timezone=True), nullable=True)
    observacao_aprovacao = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relacionamentos
    colaborador = relationship(
        "Colaborador",
        back_populates="entregas_outstanding",
        foreign_keys="[EntregaOutstanding.colaborador_id]",
    )
    aprovado_por = relationship(
        "Colaborador",
        foreign_keys="[EntregaOutstanding.aprovado_por_id]",
        back_populates="entregas_outstanding_aprovadas",
    )
