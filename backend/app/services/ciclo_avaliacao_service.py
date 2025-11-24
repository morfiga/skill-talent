import logging

from sqlalchemy.orm import Session

from app.core.exceptions import (
    BusinessRuleException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.models.ciclo import EtapaCiclo
from app.models.ciclo_avaliacao import CicloAvaliacao
from app.models.colaborador import Colaborador
from app.repositories import CicloAvaliacaoRepository
from app.schemas.ciclo_avaliacao import (
    CicloAvaliacaoCreate,
    CicloAvaliacaoListResponse,
    CicloAvaliacaoResponse,
    CicloAvaliacaoUpdate,
)
from app.services.base import BaseService
from app.services.colaborador_service import ColaboradorService

logger = logging.getLogger(__name__)


class CicloAvaliacaoService(BaseService[CicloAvaliacao]):
    def __init__(self, db: Session):
        super().__init__(db)
        self.repository = CicloAvaliacaoRepository(db)
        self.colaborador_service = ColaboradorService(db)

    def create(
        self, ciclo_avaliacao: CicloAvaliacaoCreate, current_colaborador: Colaborador
    ) -> CicloAvaliacao:
        colaborador_id = current_colaborador.id

        # Validar que o colaborador existe
        colaborador = self.repository.validate_colaborador(colaborador_id)

        if not colaborador:
            raise NotFoundException(f"Colaborador", colaborador_id)

        # Validar que o ciclo existe
        ciclo_obj = self.repository.validate_ciclo(ciclo_avaliacao.ciclo_id)

        if not ciclo_obj:
            raise NotFoundException(f"Ciclo", ciclo_avaliacao.ciclo_id)

        # Validar que foram selecionados exatamente 4 pares
        if len(ciclo_avaliacao.pares_ids) != 4:
            raise ValidationException(
                f"É necessário selecionar exatamente 4 pares",
                field="pares_ids",
            )

        # Validar que os pares existem
        pares = self.repository.validate_pares(ciclo_avaliacao.pares_ids)

        if len(pares) != 4:
            raise ValidationException(
                f"Um ou mais pares não encontrados. Esperado: 4, Encontrado: {len(pares)}",
                field="pares_ids",
            )

        # Criar ciclo de avaliação com pares
        db_ciclo = self.repository.create_with_pares(
            ciclo_id=ciclo_avaliacao.ciclo_id,
            colaborador_id=colaborador_id,
            pares_ids=ciclo_avaliacao.pares_ids,
        )

        return db_ciclo

    def get_ciclos_avaliacao(self, colaborador_id: int) -> CicloAvaliacaoListResponse:
        """Lista ciclos de avaliação do usuário logado"""
        logger.debug(f"Aplicando filtro por colaborador_id: {colaborador_id}")
        ciclos = self.repository.get_by_colaborador(colaborador_id=colaborador_id)

        ciclos_enriched = []
        for ciclo in ciclos:
            logger.debug(f"Buscando pares para avaliar para o ciclo {ciclo.id}")

            ciclo_completo = self.repository.get_completo(ciclo.id)
            ciclo_enriched = self._enrich_ciclo_avaliacao_with_pares_para_avaliar(
                ciclo_completo, colaborador_id
            )
            if ciclo_enriched:
                ciclos_enriched.append(ciclo_enriched)

        logger.debug(f"Retornando {len(ciclos_enriched)} ciclos")
        return {"ciclos": ciclos_enriched, "total": len(ciclos_enriched)}

    def get_ciclo_avaliacao_ativo(self, colaborador_id: int) -> CicloAvaliacaoResponse:
        """Obtém o ciclo de avaliação ativo do usuário logado"""
        ciclo = self.repository.get_ativo_by_colaborador(colaborador_id)

        if not ciclo:
            raise NotFoundException(f"Ciclo de avaliação", colaborador_id)

        ciclo_completo = self.repository.get_completo(ciclo.id)
        ciclo_enriched = self._enrich_ciclo_avaliacao_with_pares_para_avaliar(
            ciclo_completo, colaborador_id
        )
        return ciclo_enriched

    def get_ciclo_avaliacao(
        self, ciclo_id: int, colaborador_id: int
    ) -> CicloAvaliacaoResponse:
        ciclo = self.repository.get(ciclo_id)

        if not ciclo:
            raise NotFoundException(f"Ciclo de avaliação", ciclo_id)

        # Validar que o ciclo pertence ao colaborador logado
        if ciclo.colaborador_id != colaborador_id:
            raise ForbiddenException(f"Ciclo de avaliação", ciclo_id)

        return ciclo

    def update_ciclo_avaliacao(
        self, ciclo_id: int, ciclo_update: CicloAvaliacaoUpdate, colaborador_id: int
    ) -> CicloAvaliacaoResponse:
        db_ciclo = self.repository.get(ciclo_id)

        if not db_ciclo:
            raise NotFoundException(f"Ciclo de avaliação", ciclo_id)

        if db_ciclo.colaborador_id != colaborador_id:
            raise ForbiddenException(f"Ciclo de avaliação", ciclo_id)

        if db_ciclo.ciclo.etapa_atual == EtapaCiclo.APROVACAO_PARES:
            raise BusinessRuleException(
                "Não é possível alterar os pares durante a etapa de aprovação de pares. Aguarde a aprovação do gestor."
            )

        if len(ciclo_update.pares_ids) != 4:
            raise ValidationException(
                f"É necessário selecionar exatamente 4 pares",
                field="pares_ids",
            )

        pares = self.repository.validate_pares(ciclo_update.pares_ids)

        if len(pares) != 4:
            raise ValidationException(
                f"Um ou mais pares não encontrados. Esperado: 4, Encontrado: {len(pares)}",
                field="pares_ids",
            )

        return self.repository.update_pares(ciclo_id, ciclo_update.pares_ids)

    def get_ciclos_avaliacao_liderados(
        self, ciclo_id: int, gestor_id: int
    ) -> CicloAvaliacaoListResponse:
        liderados = self.colaborador_service.get_liderados(gestor_id)

        if not liderados:
            logger.debug(f"Nenhum liderado encontrado para o gestor {gestor_id}")
            return {"ciclos": [], "total": 0}

        liderados_ids = [sub.id for sub in liderados]
        ciclos = self.repository.get_by_liderados(liderados_ids)

        total = len(ciclos)
        logger.debug(f"Total de ciclos de avaliação encontrados: {total}")

        return {"ciclos": ciclos, "total": total}

    def update_pares_liderado(
        self,
        ciclo_avaliacao_id: int,
        ciclo_update: CicloAvaliacaoUpdate,
        current_colaborador: Colaborador,
    ) -> CicloAvaliacaoResponse:
        db_ciclo = self.repository.get(ciclo_avaliacao_id)

        if not db_ciclo:
            raise NotFoundException(f"Ciclo de avaliação", ciclo_avaliacao_id)

        # Verificar se o colaborador do ciclo é liderado do gestor
        if current_colaborador.gestor_id != current_colaborador.gestor_id:
            logger.warning(
                f"Tentativa de atualizar pares de colaborador que não é liderado. Ciclo ID: {ciclo_avaliacao_id}, Colaborador do ciclo: {current_colaborador.id}, Gestor: {current_colaborador.gestor_id}"
            )
            raise ForbiddenException("Você só pode atualizar pares dos seus liderados")

        # Validar que foram selecionados exatamente 4 pares
        if len(ciclo_update.pares_ids) != 4:
            raise ValidationException(
                "É necessário selecionar exatamente 4 pares",
                field="pares_ids",
            )

        # Validar que os pares existem
        logger.debug(f"Validando existência dos pares. IDs: {ciclo_update.pares_ids}")
        pares = self.repository.validate_pares(ciclo_update.pares_ids)

        if len(pares) != 4:
            raise ValidationException(
                f"Um ou mais pares não encontrados. Esperado: 4, Encontrado: {len(pares)}",
                field="pares_ids",
            )

        # Atualizar pares selecionados
        logger.debug(f"Atualizando pares selecionados")
        db_ciclo = self.repository.update_pares(
            ciclo_avaliacao_id, ciclo_update.pares_ids
        )

        return db_ciclo

    def _enrich_ciclo_avaliacao_with_pares_para_avaliar(
        self,
        ciclo_avaliacao,
        avaliador_id: int,
    ):
        """Enriquece o ciclo de avaliação com os pares para avaliar"""
        if not ciclo_avaliacao:
            return None

        # Buscar pares para avaliar
        pares_para_avaliar = self.repository.get_pares_para_avaliar(
            avaliador_id=avaliador_id, ciclo_id=ciclo_avaliacao.ciclo_id
        )

        # Converter para dict e adicionar pares_para_avaliar
        from app.schemas.colaborador import ColaboradorResponse

        ciclo_dict = {
            "id": ciclo_avaliacao.id,
            "ciclo_id": ciclo_avaliacao.ciclo_id,
            "colaborador_id": ciclo_avaliacao.colaborador_id,
            "created_at": ciclo_avaliacao.created_at,
            "updated_at": ciclo_avaliacao.updated_at,
            "pares_para_avaliar": [
                ColaboradorResponse.model_validate(par) for par in pares_para_avaliar
            ],
        }

        # Adicionar relacionamentos se existirem
        if ciclo_avaliacao.ciclo:
            from app.schemas.ciclo import CicloResponse

            ciclo_dict["ciclo"] = CicloResponse.model_validate(ciclo_avaliacao.ciclo)

        if ciclo_avaliacao.colaborador:
            ciclo_dict["colaborador"] = ColaboradorResponse.model_validate(
                ciclo_avaliacao.colaborador
            )

        if ciclo_avaliacao.pares_selecionados:
            from app.schemas.ciclo_avaliacao import ParSelecionadoResponse

            ciclo_dict["pares_selecionados"] = [
                ParSelecionadoResponse.model_validate(ps)
                for ps in ciclo_avaliacao.pares_selecionados
            ]

        return CicloAvaliacaoResponse.model_validate(ciclo_dict)
