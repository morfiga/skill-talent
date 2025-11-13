from app.database import Base
from sqlalchemy import Column, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class CicloAvaliacao(Base):
    __tablename__ = "ciclos_avaliacao"

    id = Column(Integer, primary_key=True, index=True)
    ciclo_id = Column(Integer, ForeignKey("ciclos.id"), nullable=False)
    colaborador_id = Column(Integer, ForeignKey("colaboradores.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relacionamentos
    ciclo = relationship("Ciclo", back_populates="ciclos_avaliacao")
    colaborador = relationship("Colaborador", back_populates="ciclos_avaliacao")
    pares_selecionados = relationship(
        "ParSelecionado", back_populates="ciclo_avaliacao"
    )


class ParSelecionado(Base):
    __tablename__ = "pares_selecionados"

    id = Column(Integer, primary_key=True, index=True)
    ciclo_avaliacao_id = Column(
        Integer, ForeignKey("ciclos_avaliacao.id"), nullable=False
    )
    par_id = Column(Integer, ForeignKey("colaboradores.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relacionamentos
    ciclo_avaliacao = relationship(
        "CicloAvaliacao", back_populates="pares_selecionados"
    )
    par = relationship("Colaborador")
