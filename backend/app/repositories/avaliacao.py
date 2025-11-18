from typing import Dict, List, Optional

from app.models.avaliacao import Avaliacao, AvaliacaoEixo, TipoAvaliacao
from app.models.ciclo_avaliacao import CicloAvaliacao
from app.models.colaborador import Colaborador
from app.models.eixo_avaliacao import EixoAvaliacao
from app.repositories.base import BaseRepository
from sqlalchemy import and_
from sqlalchemy.orm import Session


class AvaliacaoRepository(BaseRepository[Avaliacao]):
    """Repositório para operações com Avaliacao"""

    def __init__(self, db: Session):
        super().__init__(Avaliacao, db)

    def get_by_filters(
        self,
        ciclo_id: Optional[int] = None,
        avaliador_id: Optional[int] = None,
        avaliado_id: Optional[int] = None,
        tipo: Optional[str] = None,
    ) -> List[Avaliacao]:
        """Busca avaliações com filtros"""
        query = self._build_filter_query(ciclo_id, avaliador_id, avaliado_id, tipo)

        return query.order_by(self.model.created_at.desc()).all()

    def count_by_filters(
        self,
        ciclo_id: Optional[int] = None,
        avaliador_id: Optional[int] = None,
        avaliado_id: Optional[int] = None,
        tipo: Optional[str] = None,
    ) -> int:
        """Conta avaliações com filtros"""
        query = self._build_filter_query(ciclo_id, avaliador_id, avaliado_id, tipo)
        return query.count()

    def _build_filter_query(
        self,
        ciclo_id: Optional[int] = None,
        avaliador_id: Optional[int] = None,
        avaliado_id: Optional[int] = None,
        tipo: Optional[str] = None,
    ):
        """Constrói a query com os filtros aplicados"""
        query = self.db.query(self.model)

        if ciclo_id:
            query = query.filter(self.model.ciclo_id == ciclo_id)
        if avaliador_id:
            query = query.filter(self.model.avaliador_id == avaliador_id)
        if avaliado_id:
            query = query.filter(self.model.avaliado_id == avaliado_id)
        if tipo:
            query = query.filter(self.model.tipo == tipo)

        return query

    def get_by_ciclo_and_tipo(
        self, ciclo_id: int, tipo: TipoAvaliacao
    ) -> Optional[Avaliacao]:
        """Busca uma avaliação por ciclo e tipo"""
        return (
            self.db.query(self.model)
            .filter(
                and_(
                    self.model.ciclo_id == ciclo_id,
                    self.model.tipo == tipo,
                )
            )
            .first()
        )

    def get_all_by_ciclo_and_tipo(
        self, ciclo_id: int, tipo: TipoAvaliacao
    ) -> List[Avaliacao]:
        """Busca todas as avaliações por ciclo e tipo"""
        return (
            self.db.query(self.model)
            .filter(
                and_(
                    self.model.ciclo_id == ciclo_id,
                    self.model.tipo == tipo,
                )
            )
            .all()
        )

    def check_duplicate(
        self,
        ciclo_id: int,
        avaliador_id: int,
        avaliado_id: int,
        tipo: TipoAvaliacao,
    ) -> Optional[Avaliacao]:
        """Verifica se já existe uma avaliação com os mesmos parâmetros"""
        return (
            self.db.query(self.model)
            .filter(
                and_(
                    self.model.ciclo_id == ciclo_id,
                    self.model.avaliador_id == avaliador_id,
                    self.model.avaliado_id == avaliado_id,
                    self.model.tipo == tipo,
                )
            )
            .first()
        )

    def create_with_eixos(
        self,
        ciclo_id: int,
        avaliador_id: int,
        avaliado_id: int,
        tipo: TipoAvaliacao,
        avaliacao_geral: Optional[str],
        eixos_data: Dict[str, Dict[str, any]],
    ) -> Avaliacao:
        """Cria uma avaliação com seus eixos"""
        # Criar avaliação
        db_avaliacao = self.create(
            ciclo_id=ciclo_id,
            avaliador_id=avaliador_id,
            avaliado_id=avaliado_id,
            tipo=tipo,
            avaliacao_geral=avaliacao_geral,
        )

        # Criar avaliações por eixo
        eixos = self.db.query(EixoAvaliacao).all()
        for eixo in eixos:
            if str(eixo.id) in eixos_data:
                eixo_data = eixos_data[str(eixo.id)]
                avaliacao_eixo = AvaliacaoEixo(
                    avaliacao_id=db_avaliacao.id,
                    eixo_id=eixo.id,
                    nivel=eixo_data["nivel"],
                    justificativa=eixo_data["justificativa"],
                )
                self.db.add(avaliacao_eixo)

        return db_avaliacao

    def update_with_eixos(
        self,
        avaliacao_id: int,
        avaliacao_geral: Optional[str],
        eixos_data: Optional[Dict[str, Dict[str, any]]],
    ) -> Optional[Avaliacao]:
        """Atualiza uma avaliação e seus eixos"""
        db_avaliacao = self.get(avaliacao_id)
        if not db_avaliacao:
            return None

        # Atualizar avaliação geral
        if avaliacao_geral is not None:
            db_avaliacao.avaliacao_geral = avaliacao_geral

        # Atualizar eixos
        if eixos_data:
            # Remover avaliações de eixos existentes
            self.db.query(AvaliacaoEixo).filter(
                AvaliacaoEixo.avaliacao_id == avaliacao_id
            ).delete()

            # Criar novas avaliações de eixos
            eixos = self.db.query(EixoAvaliacao).all()
            for eixo in eixos:
                if str(eixo.id) in eixos_data:
                    eixo_data = eixos_data[str(eixo.id)]
                    avaliacao_eixo = AvaliacaoEixo(
                        avaliacao_id=db_avaliacao.id,
                        eixo_id=eixo.id,
                        nivel=eixo_data["nivel"],
                        justificativa=eixo_data["justificativa"],
                    )
                    self.db.add(avaliacao_eixo)

        return db_avaliacao

    def get_media_pares_por_eixo(self, ciclo_id: int) -> Dict[str, float]:
        """Calcula a média dos pares por eixo para um ciclo"""
        # Buscar avaliações de pares
        avaliacoes_pares = self.get_all_by_ciclo_and_tipo(ciclo_id, TipoAvaliacao.PAR)

        # Calcular média dos pares por eixo
        media_pares_por_eixo: Dict[str, float] = {}
        eixos = self.db.query(EixoAvaliacao).all()

        for eixo in eixos:
            niveis = []
            for avaliacao_par in avaliacoes_pares:
                avaliacao_eixo = (
                    self.db.query(AvaliacaoEixo)
                    .filter(
                        and_(
                            AvaliacaoEixo.avaliacao_id == avaliacao_par.id,
                            AvaliacaoEixo.eixo_id == eixo.id,
                        )
                    )
                    .first()
                )
                if avaliacao_eixo:
                    niveis.append(avaliacao_eixo.nivel)

            if niveis:
                media = sum(niveis) / len(niveis)
                media_pares_por_eixo[str(eixo.id)] = media
            else:
                media_pares_por_eixo[str(eixo.id)] = 0.0

        return media_pares_por_eixo

    def validate_ciclo_avaliacao(
        self, ciclo_id: int, colaborador_id: int
    ) -> Optional[CicloAvaliacao]:
        """Valida se o ciclo de avaliação existe"""
        return (
            self.db.query(CicloAvaliacao)
            .filter(
                and_(
                    CicloAvaliacao.ciclo_id == ciclo_id,
                    CicloAvaliacao.colaborador_id == colaborador_id,
                )
            )
            .first()
        )

    def validate_colaborador(self, colaborador_id: int) -> Optional[Colaborador]:
        """Valida se o colaborador existe"""
        return (
            self.db.query(Colaborador).filter(Colaborador.id == colaborador_id).first()
        )
