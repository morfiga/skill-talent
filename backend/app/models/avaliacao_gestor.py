from app.database import Base
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class AvaliacaoGestor(Base):
    """
    Modelo para avaliação que um colaborador faz do seu gestor.
    """

    __tablename__ = "avaliacoes_gestor"

    id = Column(Integer, primary_key=True, index=True)
    ciclo_id = Column(Integer, ForeignKey("ciclos.id"), nullable=False)
    colaborador_id = Column(
        Integer, ForeignKey("colaboradores.id"), nullable=False
    )  # Avaliador
    gestor_id = Column(
        Integer, ForeignKey("colaboradores.id"), nullable=False
    )  # Avaliado
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relacionamentos
    ciclo = relationship("Ciclo", back_populates="avaliacoes_gestor")
    colaborador = relationship(
        "Colaborador",
        foreign_keys=[colaborador_id],
        back_populates="avaliacoes_gestor_realizadas",
    )
    gestor = relationship(
        "Colaborador",
        foreign_keys=[gestor_id],
        back_populates="avaliacoes_gestor_recebidas",
    )
    respostas = relationship(
        "AvaliacaoGestorResposta",
        back_populates="avaliacao",
        cascade="all, delete-orphan",
    )


class AvaliacaoGestorResposta(Base):
    """
    Modelo para armazenar as respostas das perguntas da avaliação do gestor.
    """

    __tablename__ = "avaliacoes_gestor_respostas"

    id = Column(Integer, primary_key=True, index=True)
    avaliacao_id = Column(Integer, ForeignKey("avaliacoes_gestor.id"), nullable=False)
    pergunta_codigo = Column(
        String(100), nullable=False
    )  # Ex: "lideranca_expectativas_claras", "comunicacao_clareza", etc.
    categoria = Column(
        String(100), nullable=False
    )  # Ex: "lideranca_direcionamento", "comunicacao", etc.
    resposta_escala = Column(
        Integer, nullable=True
    )  # Para perguntas fechadas: 1-5 (ou similar)
    resposta_texto = Column(Text, nullable=True)  # Para perguntas abertas
    justificativa = Column(
        Text, nullable=True
    )  # Justificativa obrigatória para respostas 1 ou 5
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relacionamentos
    avaliacao = relationship("AvaliacaoGestor", back_populates="respostas")
