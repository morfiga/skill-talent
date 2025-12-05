from typing import List, Optional

from app.models.avaliacao_gestor import AvaliacaoGestor, AvaliacaoGestorResposta
from app.models.ciclo_avaliacao import CicloAvaliacao
from app.models.colaborador import Colaborador
from app.repositories.base import BaseRepository
from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload


class AvaliacaoGestorRepository(BaseRepository[AvaliacaoGestor]):
    """Repositório para operações com AvaliacaoGestor"""

    def __init__(self, db: Session):
        super().__init__(AvaliacaoGestor, db)

    def get_by_filters(
        self,
        ciclo_id: Optional[int] = None,
        colaborador_id: Optional[int] = None,
        gestor_id: Optional[int] = None,
    ) -> List[AvaliacaoGestor]:
        """Busca avaliações de gestor com filtros"""
        query = self._build_filter_query(ciclo_id, colaborador_id, gestor_id)

        return query.order_by(self.model.created_at.desc()).all()

    def _build_filter_query(
        self,
        ciclo_id: Optional[int] = None,
        colaborador_id: Optional[int] = None,
        gestor_id: Optional[int] = None,
    ):
        """Constrói a query com os filtros aplicados"""
        query = self.db.query(self.model)

        if ciclo_id:
            query = query.filter(self.model.ciclo_id == ciclo_id)
        if colaborador_id:
            query = query.filter(self.model.colaborador_id == colaborador_id)
        if gestor_id:
            query = query.filter(self.model.gestor_id == gestor_id)

        return query

    def get_by_ciclo_and_colaborador(
        self, ciclo_id: int, colaborador_id: int
    ) -> Optional[AvaliacaoGestor]:
        """Busca uma avaliação de gestor por ciclo e colaborador"""
        return (
            self.db.query(self.model)
            .filter(
                and_(
                    self.model.ciclo_id == ciclo_id,
                    self.model.colaborador_id == colaborador_id,
                )
            )
            .first()
        )

    def check_duplicate(
        self,
        ciclo_id: int,
        colaborador_id: int,
        gestor_id: Optional[int] = None,
    ) -> Optional[AvaliacaoGestor]:
        """Verifica se já existe uma avaliação de gestor para o ciclo, colaborador e gestor"""
        query = self.db.query(self.model).filter(
            and_(
                self.model.ciclo_id == ciclo_id,
                self.model.colaborador_id == colaborador_id,
            )
        )

        # Se gestor_id foi fornecido, também filtrar por ele
        if gestor_id is not None:
            query = query.filter(self.model.gestor_id == gestor_id)

        return query.first()

    def create_with_respostas(
        self,
        ciclo_id: int,
        colaborador_id: int,
        gestor_id: int,
        respostas_fechadas: List[dict],
        respostas_abertas: List[dict],
    ) -> AvaliacaoGestor:
        """Cria uma avaliação de gestor com suas respostas"""
        # Criar avaliação
        db_avaliacao = AvaliacaoGestor(
            ciclo_id=ciclo_id,
            colaborador_id=colaborador_id,
            gestor_id=gestor_id,
        )
        self.create(db_avaliacao)

        # Criar respostas fechadas
        for resposta in respostas_fechadas:
            pergunta_codigo = resposta["pergunta_codigo"]
            pergunta_info = self._get_pergunta_info(pergunta_codigo)
            if pergunta_info:
                avaliacao_resposta = AvaliacaoGestorResposta(
                    avaliacao_id=db_avaliacao.id,
                    pergunta_codigo=pergunta_codigo,
                    categoria=pergunta_info["categoria"],
                    resposta_escala=resposta["resposta_escala"],
                    resposta_texto=None,
                    justificativa=resposta.get("justificativa"),
                )
                self.db.add(avaliacao_resposta)

        # Criar respostas abertas
        for resposta in respostas_abertas:
            pergunta_codigo = resposta["pergunta_codigo"]
            pergunta_info = self._get_pergunta_info(pergunta_codigo)
            if pergunta_info:
                avaliacao_resposta = AvaliacaoGestorResposta(
                    avaliacao_id=db_avaliacao.id,
                    pergunta_codigo=pergunta_codigo,
                    categoria=pergunta_info["categoria"],
                    resposta_escala=None,
                    resposta_texto=resposta["resposta_texto"],
                )
                self.db.add(avaliacao_resposta)

        return db_avaliacao

    def update_with_respostas(
        self,
        avaliacao_id: int,
        respostas_fechadas: Optional[List[dict]] = None,
        respostas_abertas: Optional[List[dict]] = None,
    ) -> Optional[AvaliacaoGestor]:
        """Atualiza uma avaliação de gestor e suas respostas"""
        db_avaliacao = self.get(avaliacao_id)
        if not db_avaliacao:
            return None

        # Remover respostas existentes
        self.db.query(AvaliacaoGestorResposta).filter(
            AvaliacaoGestorResposta.avaliacao_id == avaliacao_id
        ).delete()

        # Criar novas respostas fechadas
        if respostas_fechadas:
            for resposta in respostas_fechadas:
                pergunta_codigo = resposta["pergunta_codigo"]
                pergunta_info = self._get_pergunta_info(pergunta_codigo)
                if pergunta_info:
                    avaliacao_resposta = AvaliacaoGestorResposta(
                        avaliacao_id=db_avaliacao.id,
                        pergunta_codigo=pergunta_codigo,
                        categoria=pergunta_info["categoria"],
                        resposta_escala=resposta["resposta_escala"],
                        resposta_texto=None,
                        justificativa=resposta.get("justificativa"),
                    )
                    self.db.add(avaliacao_resposta)

        # Criar novas respostas abertas
        if respostas_abertas:
            for resposta in respostas_abertas:
                pergunta_codigo = resposta["pergunta_codigo"]
                pergunta_info = self._get_pergunta_info(pergunta_codigo)
                if pergunta_info:
                    avaliacao_resposta = AvaliacaoGestorResposta(
                        avaliacao_id=db_avaliacao.id,
                        pergunta_codigo=pergunta_codigo,
                        categoria=pergunta_info["categoria"],
                        resposta_escala=None,
                        resposta_texto=resposta["resposta_texto"],
                    )
                    self.db.add(avaliacao_resposta)

        return db_avaliacao

    def get_with_respostas(self, avaliacao_id: int) -> Optional[AvaliacaoGestor]:
        """Busca uma avaliação com suas respostas carregadas"""
        return (
            self.db.query(self.model)
            .options(joinedload(self.model.respostas))
            .filter(self.model.id == avaliacao_id)
            .first()
        )

    def get_all_by_colaborador(
        self, colaborador_id: int, ciclo_id: Optional[int] = None
    ) -> List[AvaliacaoGestor]:
        """Busca todas as avaliações de gestor realizadas por um colaborador"""
        query = (
            self.db.query(self.model)
            .options(
                joinedload(self.model.colaborador),
                joinedload(self.model.gestor),
                joinedload(self.model.respostas),
            )
            .filter(self.model.colaborador_id == colaborador_id)
        )

        if ciclo_id:
            query = query.filter(self.model.ciclo_id == ciclo_id)

        return query.order_by(self.model.created_at.desc()).all()

    def get_all_by_gestor(
        self, gestor_id: int, ciclo_id: Optional[int] = None
    ) -> List[AvaliacaoGestor]:
        """Busca todas as avaliações de gestor recebidas por um gestor"""
        query = (
            self.db.query(self.model)
            .options(
                joinedload(self.model.colaborador),
                joinedload(self.model.gestor),
                joinedload(self.model.respostas),
            )
            .filter(self.model.gestor_id == gestor_id)
        )

        if ciclo_id:
            query = query.filter(self.model.ciclo_id == ciclo_id)

        return query.order_by(self.model.created_at.desc()).all()

    def validate_ciclo_avaliacao(
        self, ciclo_id: int, colaborador_id: int
    ) -> Optional[CicloAvaliacao]:
        """Valida se o ciclo de avaliação existe"""
        return (
            self.db.query(CicloAvaliacao)
            .options(joinedload(CicloAvaliacao.ciclo))
            .filter(CicloAvaliacao.ciclo_id == ciclo_id)
            .filter(CicloAvaliacao.colaborador_id == colaborador_id)
            .first()
        )

    def validate_colaborador(self, colaborador_id: int) -> Optional[Colaborador]:
        """Valida se o colaborador existe"""
        return (
            self.db.query(Colaborador).filter(Colaborador.id == colaborador_id).first()
        )

    def _get_pergunta_info(self, pergunta_codigo: str) -> Optional[dict]:
        """Obtém informações de uma pergunta pelo código"""
        from app.schemas.avaliacao_gestor import PERGUNTAS_ABERTAS, PERGUNTAS_FECHADAS

        if pergunta_codigo in PERGUNTAS_FECHADAS:
            return PERGUNTAS_FECHADAS[pergunta_codigo]
        elif pergunta_codigo in PERGUNTAS_ABERTAS:
            return PERGUNTAS_ABERTAS[pergunta_codigo]
        return None
