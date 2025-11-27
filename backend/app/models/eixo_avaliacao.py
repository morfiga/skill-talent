from app.database import Base
from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship


class EixoAvaliacao(Base):
    __tablename__ = "eixos_avaliacao"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(
        String(50), unique=True, nullable=False
    )  # desenvolvimento-continuo, colaboracao, etc.
    nome = Column(String(255), nullable=False)

    # Relacionamentos
    niveis = relationship(
        "NivelEixo", back_populates="eixo", order_by="NivelEixo.nivel"
    )
    avaliacoes_eixos = relationship("AvaliacaoEixo", back_populates="eixo")


class NivelEixo(Base):
    __tablename__ = "niveis_eixo"

    id = Column(Integer, primary_key=True, index=True)
    eixo_id = Column(Integer, ForeignKey("eixos_avaliacao.id"), nullable=False)
    nivel = Column(Integer, nullable=False)  # 1 a 5
    descricao = Column(Text, nullable=False)

    # Relacionamentos
    eixo = relationship("EixoAvaliacao", back_populates="niveis")
