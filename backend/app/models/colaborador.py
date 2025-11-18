from app.database import Base
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class Colaborador(Base):
    __tablename__ = "colaboradores"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    cargo = Column(String(255))
    departamento = Column(String(255))
    avatar = Column(String(500), nullable=True)  # Emoji ou URL
    nivel_carreira = Column(
        String(10)
    )  # E, J1, J2, J3, P1, P2, P3, S1, S2, S3, ES1, ES2
    gestor_id = Column(Integer, ForeignKey("colaboradores.id"), nullable=True)
    google_id = Column(String(255), unique=True, index=True, nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relacionamentos
    gestor = relationship("Colaborador", remote_side=[id], backref="liderados")
    avaliacoes_realizadas = relationship(
        "Avaliacao", foreign_keys="Avaliacao.avaliador_id", back_populates="avaliador"
    )
    avaliacoes_recebidas = relationship(
        "Avaliacao", foreign_keys="Avaliacao.avaliado_id", back_populates="avaliado"
    )
    ciclos_avaliacao = relationship("CicloAvaliacao", back_populates="colaborador")
    entregas_outstanding = relationship(
        "EntregaOutstanding", back_populates="colaborador"
    )
    registros_valor = relationship("RegistroValor", back_populates="colaborador")
