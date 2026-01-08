from enum import Enum as PyEnum

from app.database import Base
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

# Tabela de associação muitos-para-muitos entre RegistroValor e Valor
registro_valor_association = Table(
    "registro_valor_association",
    Base.metadata,
    Column("registro_id", Integer, ForeignKey("registros_valor.id"), primary_key=True),
    Column("valor_id", Integer, ForeignKey("valores.id"), primary_key=True),
)


class StatusAprovacao(str, PyEnum):
    PENDENTE = "pendente"
    APROVADO = "aprovado"
    REPROVADO = "reprovado"


class RegistroValor(Base):
    __tablename__ = "registros_valor"

    id = Column(Integer, primary_key=True, index=True)
    colaborador_id = Column(Integer, ForeignKey("colaboradores.id"), nullable=False)
    descricao = Column(Text, nullable=False)
    impacto = Column(Text, nullable=False)
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
        back_populates="registros_valor",
        foreign_keys="[RegistroValor.colaborador_id]",
    )
    aprovado_por = relationship(
        "Colaborador",
        foreign_keys="[RegistroValor.aprovado_por_id]",
        back_populates="registros_valor_aprovados",
    )
    valores = relationship(
        "Valor", secondary=registro_valor_association, back_populates="registros"
    )


class Valor(Base):
    __tablename__ = "valores"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(
        String(50), unique=True, nullable=False
    )  # donos-resultado, evoluimos-sempre, etc.
    nome = Column(String(255), nullable=False)
    icone = Column(String(10))  # Emoji

    # Relacionamentos
    registros = relationship(
        "RegistroValor", secondary=registro_valor_association, back_populates="valores"
    )
