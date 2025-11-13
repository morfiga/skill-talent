from typing import List, Optional

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.models.ciclo import Ciclo, StatusCiclo
from app.models.ciclo_avaliacao import CicloAvaliacao, ParSelecionado
from app.models.colaborador import Colaborador
from app.repositories.base import BaseRepository


class CicloAvaliacaoRepository(BaseRepository[CicloAvaliacao]):
    """Repositório para operações com CicloAvaliacao"""

    def __init__(self, db: Session):
        super().__init__(CicloAvaliacao, db)

    def get_by_colaborador(
        self, colaborador_id: int, skip: int = 0, limit: int = 100
    ) -> List[CicloAvaliacao]:
        """Busca ciclos de avaliação por colaborador"""
        return (
            self.db.query(self.model)
            .filter(self.model.colaborador_id == colaborador_id)
            .order_by(self.model.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_ativo_by_colaborador(self, colaborador_id: int) -> Optional[CicloAvaliacao]:
        """Busca o ciclo de avaliação ativo de um colaborador"""
        # Buscar ciclo aberto
        ciclo_aberto = (
            self.db.query(Ciclo)
            .filter(Ciclo.status == StatusCiclo.ABERTO)
            .order_by(Ciclo.created_at.desc())
            .first()
        )

        if not ciclo_aberto:
            return None

        # Buscar ciclo de avaliação do colaborador para o ciclo aberto
        return (
            self.db.query(self.model)
            .filter(
                and_(
                    self.model.colaborador_id == colaborador_id,
                    self.model.ciclo_id == ciclo_aberto.id,
                )
            )
            .first()
        )

    def create_with_pares(
        self,
        ciclo_id: int,
        colaborador_id: int,
        pares_ids: List[int],
    ) -> CicloAvaliacao:
        """Cria um ciclo de avaliação com seus pares selecionados"""
        # Criar ciclo de avaliação
        db_ciclo = self.create(ciclo_id=ciclo_id, colaborador_id=colaborador_id)

        # Criar pares selecionados
        for par_id in pares_ids:
            par_selecionado = ParSelecionado(
                ciclo_avaliacao_id=db_ciclo.id, par_id=par_id
            )
            self.db.add(par_selecionado)

        return db_ciclo

    def update_pares(
        self, ciclo_id: int, pares_ids: List[int]
    ) -> Optional[CicloAvaliacao]:
        """Atualiza os pares selecionados de um ciclo de avaliação"""
        db_ciclo = self.get(ciclo_id)
        if not db_ciclo:
            return None

        # Remover pares selecionados existentes
        for par_selecionado in db_ciclo.pares_selecionados:
            self.db.delete(par_selecionado)

        self.db.commit()
        self.db.refresh(db_ciclo)

        # Criar novos pares selecionados
        for par_id in pares_ids:
            par_selecionado = ParSelecionado(
                ciclo_avaliacao_id=db_ciclo.id, par_id=par_id
            )
            self.db.add(par_selecionado)

        return db_ciclo

    def validate_colaborador(self, colaborador_id: int) -> Optional[Colaborador]:
        """Valida se o colaborador existe"""
        return (
            self.db.query(Colaborador).filter(Colaborador.id == colaborador_id).first()
        )

    def validate_ciclo(self, ciclo_id: int) -> Optional[Ciclo]:
        """Valida se o ciclo existe"""
        return self.db.query(Ciclo).filter(Ciclo.id == ciclo_id).first()

    def validate_pares(self, pares_ids: List[int]) -> List[Colaborador]:
        """Valida se os pares existem"""
        return self.db.query(Colaborador).filter(Colaborador.id.in_(pares_ids)).all()
