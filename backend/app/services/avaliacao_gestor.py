import logging
from typing import Optional

from app.core.exceptions import (
    BusinessRuleException,
    ForbiddenException,
    NotFoundException,
)
from app.models.avaliacao_gestor import AvaliacaoGestor
from app.models.ciclo import EtapaCiclo
from app.models.colaborador import Colaborador
from app.repositories import AvaliacaoGestorRepository
from app.repositories.ciclo import CicloRepository
from app.schemas.avaliacao_gestor import (
    AvaliacaoGestorCreate,
    AvaliacaoGestorListResponse,
    AvaliacaoGestorResponse,
    AvaliacaoGestorUpdate,
    PerguntasAvaliacaoGestorResponse,
)
from app.services.base import BaseService
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class AvaliacaoGestorService(BaseService[AvaliacaoGestor]):
    def __init__(self, db: Session):
        super().__init__(db)
        self.repository = AvaliacaoGestorRepository(db)
        self.ciclo_repository = CicloRepository(db)


    def create(
        self, avaliacao: AvaliacaoGestorCreate, current_colaborador: Colaborador
    ) -> AvaliacaoGestorResponse:
        try:
            # Determinar o gestor_id: se não tem gestor, faz autoavaliação (avaliando a si mesmo)
            if not current_colaborador.gestor_id:
                # Autoavaliação: gestor avaliando a si mesmo
                gestor_id = current_colaborador.id
                logger.info(
                    f"Autoavaliação de gestor. Colaborador {current_colaborador.id} avaliando a si mesmo"
                )
            else:
                # Avaliação normal: colaborador avaliando seu gestor
                gestor_id = current_colaborador.gestor_id

            # Validar que o gestor existe
            gestor = self.repository.validate_colaborador(gestor_id)
            if not gestor:
                raise NotFoundException("Gestor", gestor_id)

            ciclo = self.ciclo_repository.get(avaliacao.ciclo_id)

            if not ciclo:
                raise NotFoundException("Ciclo", avaliacao.ciclo_id)

            if ciclo.etapa_atual != EtapaCiclo.AVALIACOES:
                raise BusinessRuleException(
                    "Só é possível criar avaliações durante a etapa de avaliações"
                )

            # Verificar se já existe avaliação deste colaborador para este gestor neste ciclo
            existing = self.repository.check_duplicate(
                ciclo_id=avaliacao.ciclo_id,
                colaborador_id=current_colaborador.id,
                gestor_id=gestor_id,
            )

            if existing:
                logger.warning(
                    f"Tentativa de criar avaliação de gestor duplicada. Ciclo: {avaliacao.ciclo_id}, "
                    f"Colaborador: {current_colaborador.id}, Gestor: {gestor_id}"
                )
                tipo_avaliacao = (
                    "autoavaliação"
                    if current_colaborador.id == gestor_id
                    else "avaliação de gestor"
                )
                raise BusinessRuleException(
                    f"Já existe uma {tipo_avaliacao} para este ciclo"
                )

            # Criar avaliação com respostas
            logger.info(
                f"Criando avaliação de gestor. Ciclo: {avaliacao.ciclo_id}, "
                f"Colaborador: {current_colaborador.id}, Gestor: {gestor_id}"
            )

            db_avaliacao = self.repository.create_with_respostas(
                ciclo_id=avaliacao.ciclo_id,
                colaborador_id=current_colaborador.id,
                gestor_id=gestor_id,
                respostas_fechadas=[
                    r.model_dump() for r in avaliacao.respostas_fechadas
                ],
                respostas_abertas=[r.model_dump() for r in avaliacao.respostas_abertas],
            )

            logger.info(
                f"Avaliação de gestor criada com sucesso. ID: {db_avaliacao.id}"
            )
            return db_avaliacao
        except SQLAlchemyError:
            self._handle_database_error("criar avaliação de gestor")

    def get(
        self, avaliacao_id: int, current_colaborador: Colaborador
    ) -> AvaliacaoGestorResponse:
        avaliacao = self.repository.get_with_respostas(avaliacao_id)

        if not avaliacao:
            raise NotFoundException("Avaliação de gestor", avaliacao_id)

        # Validar que o usuário logado é o colaborador que fez a avaliação
        # ou o gestor que foi avaliado
        if (
            avaliacao.colaborador_id != current_colaborador.id
            and avaliacao.gestor_id != current_colaborador.id
            and not current_colaborador.is_admin
        ):
            raise ForbiddenException(
                "Você só pode buscar avaliações de gestor onde você é o avaliador ou o gestor avaliado"
            )

        return avaliacao

    def get_avaliacoes(
        self,
        ciclo_id: Optional[int] = None,
        colaborador_id: Optional[int] = None,
        gestor_id: Optional[int] = None,
        current_colaborador: Colaborador = None,
    ) -> AvaliacaoGestorListResponse:
        # Se não especificado, filtrar por colaborador_id ou gestor_id do usuário logado
        if colaborador_id is None and gestor_id is None:
            # Retornar avaliações onde o usuário logado é colaborador ou gestor
            avaliacoes_como_colaborador = self.repository.get_by_filters(
                ciclo_id=ciclo_id,
                colaborador_id=current_colaborador.id,
                gestor_id=None,
            )
            # Também buscar avaliações onde o usuário é gestor
            avaliacoes_como_gestor = self.repository.get_by_filters(
                ciclo_id=ciclo_id,
                colaborador_id=None,
                gestor_id=current_colaborador.id,
            )
            # Combinar e remover duplicatas
            avaliacoes_ids = {a.id for a in avaliacoes_como_colaborador}
            avaliacoes = avaliacoes_como_colaborador + [
                a for a in avaliacoes_como_gestor if a.id not in avaliacoes_ids
            ]
            # Ordenar por created_at desc
            avaliacoes.sort(key=lambda x: x.created_at, reverse=True)
            total = len(avaliacoes)
        else:
            # Validar que o usuário só pode ver suas próprias avaliações
            # Se colaborador_id for especificado, deve ser o usuário logado
            if (
                colaborador_id is not None
                and colaborador_id != current_colaborador.id
                and not current_colaborador.is_admin
            ):
                logger.warning(
                    f"Tentativa de buscar avaliações de gestor de outro colaborador. Colaborador ID: {colaborador_id}, Colaborador logado: {current_colaborador.id}"
                )
                raise ForbiddenException(
                    "Você só pode buscar avaliações de gestor onde você é o avaliador"
                )
            # Se gestor_id for especificado, deve ser o usuário logado ou admin
            if (
                gestor_id is not None
                and gestor_id != current_colaborador.id
                and not current_colaborador.is_admin
            ):
                logger.warning(
                    f"Tentativa de buscar avaliações de gestor de outro gestor. Gestor ID: {gestor_id}, Colaborador logado: {current_colaborador.id}"
                )
                raise ForbiddenException(
                    "Você só pode buscar avaliações de gestor onde você é o gestor avaliado"
                )

            logger.debug(
                f"GET /avaliacoes-gestor - Listando avaliações. Filtros: ciclo_id={ciclo_id}, colaborador_id={colaborador_id}, gestor_id={gestor_id}"
            )

            avaliacoes = self.repository.get_by_filters(
                ciclo_id=ciclo_id,
                colaborador_id=colaborador_id,
                gestor_id=gestor_id,
            )

        logger.debug(f"Retornando {len(avaliacoes)} avaliações de gestor")
        return {"avaliacoes": avaliacoes, "total": len(avaliacoes)}

    def update(
        self,
        avaliacao_id: int,
        avaliacao: AvaliacaoGestorUpdate,
        current_colaborador: Colaborador,
    ) -> AvaliacaoGestorResponse:
        try:
            db_avaliacao = self.repository.get(avaliacao_id)

            if not db_avaliacao:
                raise NotFoundException("Avaliação de gestor", avaliacao_id)

            # Validar que o usuário logado é o colaborador que fez a avaliação
            if db_avaliacao.colaborador_id != current_colaborador.id:
                raise ForbiddenException(
                    "Você só pode atualizar avaliações de gestor onde você é o avaliador"
                )

            ciclo = self.ciclo_repository.get(db_avaliacao.ciclo_id)
            if not ciclo:
                raise NotFoundException("Ciclo", db_avaliacao.ciclo_id)

            if ciclo.etapa_atual != EtapaCiclo.AVALIACOES:
                raise BusinessRuleException(
                    "Só é possível alterar avaliações durante a etapa de avaliações"
                )

            logger.info(f"Atualizando avaliação de gestor. ID: {avaliacao_id}")

            # Atualizar avaliação com respostas
            respostas_fechadas = None
            respostas_abertas = None

            if avaliacao.respostas_fechadas:
                respostas_fechadas = [
                    r.model_dump() for r in avaliacao.respostas_fechadas
                ]
            if avaliacao.respostas_abertas:
                respostas_abertas = [
                    r.model_dump() for r in avaliacao.respostas_abertas
                ]

            db_avaliacao = self.repository.update_with_respostas(
                avaliacao_id=avaliacao_id,
                respostas_fechadas=respostas_fechadas,
                respostas_abertas=respostas_abertas,
            )

            self.repository.refresh(db_avaliacao)

            logger.info(
                f"Avaliação de gestor atualizada com sucesso. ID: {avaliacao_id}"
            )
            return db_avaliacao
        except SQLAlchemyError:
            self._handle_database_error("atualizar avaliação de gestor")

    def get_perguntas(self) -> PerguntasAvaliacaoGestorResponse:
        """Retorna as perguntas disponíveis para avaliação de gestor"""
        from app.schemas.avaliacao_gestor import (
            CATEGORIAS_PERGUNTAS,
            PERGUNTAS_ABERTAS,
            PERGUNTAS_FECHADAS,
        )

        return {
            "categorias": CATEGORIAS_PERGUNTAS,
            "perguntas_fechadas": PERGUNTAS_FECHADAS,
            "perguntas_abertas": PERGUNTAS_ABERTAS,
        }

    def get_avaliacoes_colaborador_admin(
        self,
        colaborador_id: int,
        ciclo_id: Optional[int] = None,
        current_colaborador: Colaborador = None,
    ) -> AvaliacaoGestorListResponse:
        # Verificar se o usuário é admin
        if not current_colaborador.is_admin:
            logger.warning(
                f"Tentativa de acessar endpoint admin sem permissão. Colaborador ID: {current_colaborador.id}"
            )
            raise ForbiddenException(
                "Apenas administradores podem acessar este endpoint"
            )

        logger.debug(
            f"GET /avaliacoes-gestor/admin/colaborador/{colaborador_id} - Admin buscando avaliações de gestor do colaborador {colaborador_id}"
        )

        avaliacoes_completas = self.repository.get_all_by_colaborador(
            colaborador_id, ciclo_id
        )

        return AvaliacaoGestorListResponse(
            avaliacoes=avaliacoes_completas,
            total=len(avaliacoes_completas),
        )

    def get_avaliacoes_gestor_admin(
        self,
        gestor_id: int,
        ciclo_id: Optional[int] = None,
        current_colaborador: Colaborador = None,
    ) -> AvaliacaoGestorListResponse:
        # Verificar se o usuário é admin
        if not current_colaborador.is_admin:
            logger.warning(
                f"Tentativa de acessar endpoint admin sem permissão. Colaborador ID: {current_colaborador.id}"
            )
            raise ForbiddenException(
                "Apenas administradores podem acessar este endpoint"
            )

        logger.debug(
            f"GET /avaliacoes-gestor/admin/gestor/{gestor_id} - Admin buscando avaliações de gestor recebidas pelo gestor {gestor_id}"
        )

        avaliacoes_completas = self.repository.get_all_by_gestor(gestor_id, ciclo_id)

        return AvaliacaoGestorListResponse(
            avaliacoes=avaliacoes_completas,
            total=len(avaliacoes_completas),
        )
