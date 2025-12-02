import logging
from typing import Optional

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.exceptions import (
    BusinessRuleException,
    ForbiddenException,
    NotFoundException,
)
from app.models.avaliacao import Avaliacao, TipoAvaliacao
from app.models.ciclo import EtapaCiclo
from app.models.colaborador import Colaborador
from app.repositories import AvaliacaoRepository
from app.schemas.avaliacao import (
    AvaliacaoCreate,
    AvaliacaoListResponse,
    AvaliacaoResponse,
    AvaliacaoUpdate,
    FeedbackResponse,
)
from app.services.base import BaseService
from app.services.colaborador import ColaboradorService

logger = logging.getLogger(__name__)


class AvaliacaoService(BaseService[Avaliacao]):
    def __init__(self, db: Session):
        super().__init__(db)
        self.repository = AvaliacaoRepository(db)
        self.colaborador_service = ColaboradorService(db)

    def create(
        self, avaliacao: AvaliacaoCreate, current_colaborador: Colaborador
    ) -> AvaliacaoResponse:
        try:
            # Validar que o avaliado existe
            avaliado = self.repository.validate_colaborador(avaliacao.avaliado_id)

            if not avaliado:
                logger.warning(
                    f"Tentativa de criar avaliação para colaborador inexistente. Colaborador ID: {avaliacao.avaliado_id}"
                )
                raise NotFoundException("Colaborador", avaliacao.avaliado_id)

            # Para autoavaliação, avaliador_id = avaliado_id
            # Para par ou gestor, usar o colaborador_id do usuário logado
            if avaliacao.tipo == "autoavaliacao":
                avaliador_id = avaliacao.avaliado_id
                # Validar que o avaliado é o próprio usuário logado
                if avaliacao.avaliado_id != current_colaborador.id:
                    raise ForbiddenException(
                        "Você só pode criar autoavaliação para si mesmo"
                    )
            else:
                # Para par ou gestor, o avaliador sempre é o usuário logado
                avaliador_id = current_colaborador.id

            if avaliacao.tipo != "gestor":
                # Validar que o ciclo existe (agora que temos o avaliador_id)
                ciclo_avaliacao = self.repository.validate_ciclo_avaliacao(
                    avaliacao.ciclo_id, avaliador_id
                )

                if not ciclo_avaliacao:
                    raise NotFoundException("Ciclo de avaliação", avaliacao.ciclo_id)

                # Verificar se o ciclo está na etapa de calibração
                # Durante esta etapa, colaboradores não podem criar avaliações
                if ciclo_avaliacao.ciclo.etapa_atual == EtapaCiclo.CALIBRACAO:
                    raise BusinessRuleException(
                        "Não é possível criar avaliações durante a etapa de calibração"
                    )

            # Verificar se já existe avaliação deste tipo
            existing = self.repository.check_duplicate(
                ciclo_id=avaliacao.ciclo_id,
                avaliador_id=avaliador_id,
                avaliado_id=avaliacao.avaliado_id,
                tipo=TipoAvaliacao(avaliacao.tipo),
            )

            if existing:
                logger.warning(
                    f"Tentativa de criar avaliação duplicada. Ciclo: {avaliacao.ciclo_id}, "
                    f"Avaliador: {avaliador_id}, Avaliado: {avaliacao.avaliado_id}, Tipo: {avaliacao.tipo}"
                )
                raise BusinessRuleException(
                    "Já existe uma avaliação deste tipo para este ciclo"
                )

            # Criar avaliação com eixos
            logger.info(
                f"Criando avaliação. Ciclo: {avaliacao.ciclo_id}, Tipo: {avaliacao.tipo}, "
                f"Avaliador: {avaliador_id}, Avaliado: {avaliacao.avaliado_id}"
            )
            logger.debug(
                f"Criando avaliações por eixo. Eixos recebidos: {list(avaliacao.eixos.keys())}"
            )

            db_avaliacao = self.repository.create_with_eixos(
                ciclo_id=avaliacao.ciclo_id,
                avaliador_id=avaliador_id,
                avaliado_id=avaliacao.avaliado_id,
                tipo=TipoAvaliacao(avaliacao.tipo),
                avaliacao_geral=avaliacao.avaliacao_geral,
                eixos_data=avaliacao.eixos,
            )

            logger.info(f"Avaliação criada com sucesso. ID: {db_avaliacao.id}")
            return db_avaliacao
        except SQLAlchemyError:
            self._handle_database_error("criar avaliação")

    def get(
        self, avaliacao_id: int, current_colaborador: Colaborador
    ) -> AvaliacaoResponse:
        avaliacao = self.repository.get(avaliacao_id)

        if not avaliacao:
            raise NotFoundException("Avaliação", avaliacao_id)

        # Validar que o usuário logado é o avaliador ou o avaliado
        if (
            avaliacao.avaliador_id != current_colaborador.id
            and avaliacao.avaliado_id != current_colaborador.id
        ):
            raise ForbiddenException(
                "Você só pode buscar avaliações onde você é o avaliador ou o avaliado"
            )

        return avaliacao

    def get_avaliacoes(
        self,
        ciclo_id: Optional[int] = None,
        avaliador_id: Optional[int] = None,
        avaliado_id: Optional[int] = None,
        tipo: Optional[str] = None,
        current_colaborador: Colaborador = None,
    ) -> AvaliacaoListResponse:
        # Se não especificado, filtrar por avaliador_id ou avaliado_id do usuário logado
        if avaliador_id is None and avaliado_id is None:
            # Retornar avaliações onde o usuário logado é avaliador ou avaliado
            avaliacoes_como_avaliador = self.repository.get_by_filters(
                ciclo_id=ciclo_id,
                avaliador_id=current_colaborador.id,
                avaliado_id=None,
                tipo=tipo,
            )
            # Também buscar avaliações onde o usuário é avaliado
            avaliacoes_como_avaliado = self.repository.get_by_filters(
                ciclo_id=ciclo_id,
                avaliador_id=None,
                avaliado_id=current_colaborador.id,
                tipo=tipo,
            )
            # Combinar e remover duplicatas
            avaliacoes_ids = {a.id for a in avaliacoes_como_avaliador}
            avaliacoes = avaliacoes_como_avaliador + [
                a for a in avaliacoes_como_avaliado if a.id not in avaliacoes_ids
            ]
            # Ordenar por created_at desc
            avaliacoes.sort(key=lambda x: x.created_at, reverse=True)
            total = len(avaliacoes)
        else:
            # Validar que o usuário só pode ver suas próprias avaliações
            # Se avaliador_id for especificado, deve ser o usuário logado
            if (
                avaliador_id is not None
                and avaliador_id != current_colaborador.id
                and not current_colaborador.is_admin
            ):
                logger.warning(
                    f"Tentativa de buscar avaliações de outro avaliador. Avaliador ID: {avaliador_id}, Colaborador logado: {current_colaborador.id}"
                )
                raise ForbiddenException(
                    "Você só pode buscar avaliações onde você é o avaliador"
                )
            # Se avaliador_id for o usuário logado, ele pode buscar avaliações de qualquer avaliado
            # (permite que o usuário busque avaliações onde ele avalia outras pessoas, como gestor)
            # Se avaliador_id NÃO for especificado e avaliado_id for especificado,
            # então o avaliado deve ser o próprio usuário logado
            if (
                avaliador_id is None
                and avaliado_id is not None
                and avaliado_id != current_colaborador.id
                and not current_colaborador.is_admin
            ):
                logger.warning(
                    f"Tentativa de buscar avaliações de outro avaliado sem ser o avaliador. Avaliado ID: {avaliado_id}, Colaborador logado: {current_colaborador.id}"
                )
                raise ForbiddenException(
                    "Você só pode buscar avaliações onde você é o avaliado ou o avaliador"
                )

            logger.debug(
                f"GET /avaliacoes - Listando avaliações. Filtros: ciclo_id={ciclo_id}, avaliador_id={avaliador_id}, avaliado_id={avaliado_id}, tipo={tipo}"
            )

            avaliacoes = self.repository.get_by_filters(
                ciclo_id=ciclo_id,
                avaliador_id=avaliador_id,
                avaliado_id=avaliado_id,
                tipo=tipo,
            )

        logger.debug(f"Retornando {len(avaliacoes)} avaliações")
        return {"avaliacoes": avaliacoes, "total": len(avaliacoes)}

    def update(
        self,
        avaliacao_id: int,
        avaliacao: AvaliacaoUpdate,
        current_colaborador: Colaborador,
    ) -> AvaliacaoResponse:
        try:
            db_avaliacao = self.repository.get(avaliacao_id)

            if not db_avaliacao:
                raise NotFoundException("Avaliação", avaliacao_id)

            # Validar que o usuário logado é o avaliador
            if db_avaliacao.avaliador_id != current_colaborador.id:
                raise ForbiddenException(
                    "Você só pode atualizar avaliações onde você é o avaliador"
                )

            # Verificar se o ciclo está na etapa de calibração
            # Durante esta etapa, colaboradores não podem alterar avaliações

            ciclo = db_avaliacao.ciclo
            if ciclo and ciclo.etapa_atual == EtapaCiclo.CALIBRACAO:
                raise BusinessRuleException(
                    "Não é possível alterar avaliações durante a etapa de calibração"
                )

            logger.info(f"Atualizando avaliação. ID: {avaliacao_id}")
            logger.debug(
                f"Dados recebidos para atualização: avaliacao_geral={'preenchida' if avaliacao.avaliacao_geral else 'vazia'}, eixos={list(avaliacao.eixos.keys()) if avaliacao.eixos else 'nenhum'}"
            )

            # Atualizar avaliação com eixos
            db_avaliacao = self.repository.update_with_eixos(
                avaliacao_id=avaliacao_id,
                avaliacao_geral=avaliacao.avaliacao_geral,
                eixos_data=avaliacao.eixos,
            )

            self.repository.refresh(db_avaliacao)

            logger.info(f"Avaliação atualizada com sucesso. ID: {avaliacao_id}")
            return db_avaliacao
        except SQLAlchemyError:
            self._handle_database_error("atualizar avaliação")

    def get_feedback(
        self, ciclo_id: int, current_colaborador: Colaborador
    ) -> FeedbackResponse:
        ciclo = self.repository.validate_ciclo_avaliacao(
            ciclo_id, current_colaborador.id
        )

        if not ciclo:
            logger.warning(
                f"Tentativa de buscar feedback para ciclo inexistente. Ciclo ID: {ciclo_id}"
            )
            raise NotFoundException("Ciclo de avaliação", ciclo_id)

        # Validar que o ciclo pertence ao colaborador logado
        if ciclo.colaborador_id != current_colaborador.id:
            logger.warning(
                f"Tentativa de buscar feedback de ciclo de outro colaborador. Ciclo ID: {ciclo_id}, Colaborador do ciclo: {ciclo.colaborador_id}, Colaborador logado: {current_colaborador.id}"
            )
            raise ForbiddenException(
                "Você só pode buscar feedback do seu próprio ciclo de avaliação"
            )

        logger.debug(
            f"Ciclo de avaliação encontrado. ID: {ciclo_id}, Colaborador ID: {ciclo.colaborador_id}, Ciclo ID: {ciclo.ciclo_id}"
        )

        # Buscar autoavaliação
        autoavaliacao = self.repository.get_by_ciclo_and_tipo(
            avaliado_id=current_colaborador.id,
            avaliador_id=current_colaborador.id,
            ciclo_id=ciclo_id,
            tipo=TipoAvaliacao.AUTOAVALIACAO,
        )
        if autoavaliacao:
            autoavaliacao = autoavaliacao[0]
        logger.debug(
            f"Autoavaliação {'encontrada' if autoavaliacao else 'não encontrada'}"
        )

        # Buscar avaliação do gestor
        avaliacao_gestor = self.repository.get_by_ciclo_and_tipo(
            avaliado_id=current_colaborador.id,
            ciclo_id=ciclo_id,
            tipo=TipoAvaliacao.GESTOR,
        )
        if avaliacao_gestor:
            avaliacao_gestor = avaliacao_gestor[0]
        logger.debug(
            f"Avaliação do gestor {'encontrada' if avaliacao_gestor else 'não encontrada'}"
        )

        # Buscar avaliações de pares
        avaliacoes_pares = self.repository.get_by_ciclo_and_tipo(
            avaliado_id=current_colaborador.id,
            ciclo_id=ciclo_id,
            tipo=TipoAvaliacao.PAR,
        )
        logger.debug(f"Encontradas {len(avaliacoes_pares)} avaliações de pares")

        # Calcular média dos pares por eixo
        logger.debug("Calculando média dos pares por eixo")
        media_pares_por_eixo = self.repository.get_media_pares_por_eixo(
            avaliado_id=current_colaborador.id,
            ciclo_id=ciclo_id,
        )

        # Obter níveis esperados baseado no nível de carreira do colaborador
        colaborador = self.colaborador_service.get_by_id(ciclo.colaborador_id)

        niveis_esperados = []
        if colaborador and colaborador.nivel_carreira:
            from app.api.v1.niveis_carreira import NIVEIS_ESPERADOS_POR_CARREIRA

            niveis_esperados = NIVEIS_ESPERADOS_POR_CARREIRA.get(
                colaborador.nivel_carreira, [0, 0, 0, 0]
            )

        logger.info(f"Feedback gerado com sucesso para ciclo. ID: {ciclo_id}")
        return {
            "autoavaliacao": autoavaliacao,
            "avaliacao_gestor": avaliacao_gestor,
            "avaliacoes_pares": avaliacoes_pares,
            "media_pares_por_eixo": media_pares_por_eixo,
            "niveis_esperados": niveis_esperados,
        }

    def get_avaliacoes_colaborador_admin(
        self,
        colaborador_id: int,
        ciclo_id: Optional[int] = None,
        current_colaborador: Colaborador = None,
    ) -> AvaliacaoListResponse:
        # Verificar se o usuário é admin
        if not current_colaborador.is_admin:
            logger.warning(
                f"Tentativa de acessar endpoint admin sem permissão. Colaborador ID: {current_colaborador.id}"
            )
            raise ForbiddenException(
                "Apenas administradores podem acessar este endpoint"
            )

        logger.debug(
            f"GET /avaliacoes/admin/colaborador/{colaborador_id} - Admin buscando avaliações do colaborador {colaborador_id}"
        )

        avaliacoes_completas = self.repository.get_all_by_colaborador(
            colaborador_id, ciclo_id
        )

        return AvaliacaoListResponse(
            avaliacoes=avaliacoes_completas,
            total=len(avaliacoes_completas),
        )
