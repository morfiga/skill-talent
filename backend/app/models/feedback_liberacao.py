from app.database import Base
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class FeedbackLiberacao(Base):
    """
    Modelo para controlar a liberação de feedback por ciclo e colaborador.
    Um admin/gestor deve liberar o feedback para cada colaborador antes que ele possa visualizá-lo.
    """

    __tablename__ = "feedback_liberacao"

    id = Column(Integer, primary_key=True, index=True)
    ciclo_id = Column(Integer, ForeignKey("ciclos.id"), nullable=False)
    colaborador_id = Column(
        Integer, ForeignKey("colaboradores.id"), nullable=False
    )  # Colaborador que receberá o feedback
    liberado = Column(Boolean, default=False, nullable=False)
    liberado_por_id = Column(
        Integer, ForeignKey("colaboradores.id"), nullable=True
    )  # Admin/gestor que liberou
    liberado_em = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relacionamentos
    ciclo = relationship("Ciclo", back_populates="feedbacks_liberacao")
    colaborador = relationship(
        "Colaborador",
        foreign_keys=[colaborador_id],
        back_populates="feedbacks_liberacao_recebidos",
    )
    liberado_por = relationship(
        "Colaborador",
        foreign_keys=[liberado_por_id],
        back_populates="feedbacks_liberacao_concedidos",
    )

