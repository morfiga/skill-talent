from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class EntregaOutstanding(Base):
    __tablename__ = "entregas_outstanding"

    id = Column(Integer, primary_key=True, index=True)
    colaborador_id = Column(Integer, ForeignKey("colaboradores.id"), nullable=False)
    descricao = Column(Text, nullable=False)
    impacto = Column(Text, nullable=False)
    evidencias = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relacionamentos
    colaborador = relationship("Colaborador", back_populates="entregas_outstanding")
