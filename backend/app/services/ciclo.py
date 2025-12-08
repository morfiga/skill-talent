"""
Service para operações de negócio relacionadas a Ciclos.

Este service contém a lógica de negócio para ciclos,
separando-a dos controllers e repositories.
"""

from typing import List, Optional

from app.core.exceptions import (
    BusinessRuleException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.models.avaliacao import Avaliacao, TipoAvaliacao
from app.models.avaliacao_gestor import AvaliacaoGestor
from app.models.ciclo import Ciclo, EtapaCiclo, StatusCiclo
from app.models.ciclo_avaliacao import CicloAvaliacao, ParSelecionado
from app.models.colaborador import Colaborador
from app.repositories.ciclo import CicloRepository
from app.schemas.ciclo import (
    AcompanhamentoCicloResponse,
    CicloCreate,
    CicloUpdate,
    ColaboradorAcompanhamentoResponse,
)
from app.services.base import BaseService
from sqlalchemy import and_, func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session


class CicloService(BaseService[Ciclo]):
    """Service para operações de negócio com Ciclos"""

    # Sequência de etapas do ciclo
    ETAPAS_SEQUENCIA = [
        EtapaCiclo.ESCOLHA_PARES,
        EtapaCiclo.APROVACAO_PARES,
        EtapaCiclo.AVALIACOES,
        EtapaCiclo.CALIBRACAO,
        EtapaCiclo.FEEDBACK,
    ]

    def __init__(self, db: Session):
        super().__init__(db)
        self.repository = CicloRepository(db)

    def get_ciclos(self, status: Optional[str] = None) -> tuple[List[Ciclo], int]:
        if status:
            try:
                status_enum = StatusCiclo(status)
                ciclos = self.repository.get_by_status(status_enum)
            except ValueError:
                valid_values = [s.value for s in StatusCiclo]
                raise ValidationException(
                    f"Status inválido. Valores aceitos: {', '.join(valid_values)}",
                    field="status",
                )
        else:
            ciclos = self.repository.get_all(order_by=Ciclo.created_at.desc())

        total = len(ciclos)
        return ciclos, total

    def get_ciclo_by_id(self, ciclo_id: int) -> Ciclo:
        ciclo = self.repository.get(ciclo_id)
        if not ciclo:
            raise NotFoundException("Ciclo", ciclo_id)
        return ciclo

    def create_ciclo(
        self, ciclo_data: CicloCreate, current_colaborador: Colaborador
    ) -> Ciclo:
        """Cria um novo ciclo. Validação de campos já feita no schema."""
        if not current_colaborador.is_admin:
            raise ForbiddenException("Apenas administradores podem criar ciclos")

        try:
            db_ciclo = Ciclo(
                nome=ciclo_data.nome,
                status=ciclo_data.status,
                etapa_atual=ciclo_data.etapa_atual,
                data_inicio=ciclo_data.data_inicio,
                data_fim=ciclo_data.data_fim,
            )
            db_ciclo = self.repository.create(db_ciclo)
            return db_ciclo
        except SQLAlchemyError:
            self._handle_database_error("criar ciclo")

    def update_ciclo(
        self, ciclo_id: int, ciclo_data: CicloUpdate, current_colaborador: Colaborador
    ) -> Ciclo:
        """Atualiza um ciclo. Validação de campos já feita no schema."""
        if not current_colaborador.is_admin:
            raise ForbiddenException("Apenas administradores podem atualizar ciclos")

        db_ciclo = self.repository.get(ciclo_id)
        if not db_ciclo:
            raise NotFoundException("Ciclo", ciclo_id)

        # Os campos já vêm validados do schema (enums convertidos)
        update_data = ciclo_data.model_dump(exclude_unset=True)

        try:
            for field, value in update_data.items():
                if value is not None:
                    setattr(db_ciclo, field, value)

            return self.repository.update(ciclo_id, **update_data)
        except SQLAlchemyError:
            self._handle_database_error("atualizar ciclo")

    def get_ciclo_aberto(self) -> Ciclo:
        ciclo = self.repository.get_aberto()
        if not ciclo:
            raise NotFoundException("Ciclo aberto")
        return ciclo

    def avancar_etapa(self, ciclo_id: int, current_colaborador: Colaborador) -> Ciclo:
        if not current_colaborador.is_admin:
            raise ForbiddenException(
                "Apenas administradores podem avançar etapas do ciclo"
            )

        db_ciclo = self.repository.get(ciclo_id)
        if not db_ciclo:
            raise NotFoundException("Ciclo", ciclo_id)

        # Validar e avançar etapa
        try:
            etapa_atual_idx = self.ETAPAS_SEQUENCIA.index(db_ciclo.etapa_atual)

            if etapa_atual_idx >= len(self.ETAPAS_SEQUENCIA) - 1:
                raise BusinessRuleException(
                    "Ciclo já está na última etapa e não pode ser avançado"
                )

            try:
                return self.repository.update(
                    ciclo_id, etapa_atual=self.ETAPAS_SEQUENCIA[etapa_atual_idx + 1]
                )
            except SQLAlchemyError:
                self._handle_database_error("atualizar etapa do ciclo")

        except ValueError:
            raise ValidationException(
                f"Etapa atual inválida: {db_ciclo.etapa_atual}",
                field="etapa_atual",
            )

    def delete_ciclo(self, ciclo_id: int, current_colaborador: Colaborador) -> bool:
        if not current_colaborador.is_admin:
            raise ForbiddenException("Apenas administradores podem deletar ciclos")

        db_ciclo = self.repository.get(ciclo_id)
        if not db_ciclo:
            raise NotFoundException("Ciclo", ciclo_id)

        return self.repository.delete(ciclo_id)

    def get_acompanhamento(
        self, ciclo_id: int, current_colaborador: Colaborador
    ) -> AcompanhamentoCicloResponse:
        """Retorna o acompanhamento do ciclo com status de cada colaborador"""
        if not current_colaborador.is_admin:
            raise ForbiddenException(
                "Apenas administradores podem ver o acompanhamento"
            )

        db_ciclo = self.repository.get(ciclo_id)
        if not db_ciclo:
            raise NotFoundException("Ciclo", ciclo_id)

        # Buscar todos os colaboradores ativos
        colaboradores = (
            self.db.query(Colaborador)
            .filter(Colaborador.is_active == True)
            .order_by(Colaborador.nome)
            .all()
        )

        resultado = []
        for colab in colaboradores:
            # 1. Verificar se escolheu pares
            ciclo_avaliacao = (
                self.db.query(CicloAvaliacao)
                .filter(
                    and_(
                        CicloAvaliacao.ciclo_id == ciclo_id,
                        CicloAvaliacao.colaborador_id == colab.id,
                    )
                )
                .first()
            )

            qtd_pares_escolhidos = 0
            if ciclo_avaliacao:
                qtd_pares_escolhidos = (
                    self.db.query(func.count(ParSelecionado.id))
                    .filter(ParSelecionado.ciclo_avaliacao_id == ciclo_avaliacao.id)
                    .scalar()
                    or 0
                )

            escolheu_pares = qtd_pares_escolhidos >= 4

            # 2. Verificar avaliações de pares que deve fazer
            # (quantos outros colaboradores o escolheram como par)
            avaliacoes_pares_total = (
                self.db.query(func.count(ParSelecionado.id))
                .join(CicloAvaliacao)
                .filter(
                    and_(
                        CicloAvaliacao.ciclo_id == ciclo_id,
                        ParSelecionado.par_id == colab.id,
                    )
                )
                .scalar()
                or 0
            )

            # 3. Quantas avaliações de pares já fez
            avaliacoes_pares_realizadas = (
                self.db.query(func.count(Avaliacao.id))
                .filter(
                    and_(
                        Avaliacao.ciclo_id == ciclo_id,
                        Avaliacao.avaliador_id == colab.id,
                        Avaliacao.tipo == TipoAvaliacao.PAR,
                    )
                )
                .scalar()
                or 0
            )

            # 4. Verificar se fez autoavaliação
            fez_autoavaliacao = (
                self.db.query(Avaliacao)
                .filter(
                    and_(
                        Avaliacao.ciclo_id == ciclo_id,
                        Avaliacao.avaliador_id == colab.id,
                        Avaliacao.avaliado_id == colab.id,
                        Avaliacao.tipo == TipoAvaliacao.AUTOAVALIACAO,
                    )
                )
                .first()
                is not None
            )

            # 5. Verificar se fez avaliação do gestor
            fez_avaliacao_gestor = (
                self.db.query(AvaliacaoGestor)
                .filter(
                    and_(
                        AvaliacaoGestor.ciclo_id == ciclo_id,
                        AvaliacaoGestor.colaborador_id == colab.id,
                    )
                )
                .first()
                is not None
            )

            # 6. Verificar se tem gestor
            tem_gestor = colab.gestor_id is not None

            resultado.append(
                ColaboradorAcompanhamentoResponse(
                    colaborador_id=colab.id,
                    nome=colab.nome,
                    email=colab.email,
                    cargo=colab.cargo,
                    departamento=colab.departamento,
                    avatar=colab.avatar,
                    escolheu_pares=escolheu_pares,
                    qtd_pares_escolhidos=qtd_pares_escolhidos,
                    avaliacoes_pares_total=avaliacoes_pares_total,
                    avaliacoes_pares_realizadas=avaliacoes_pares_realizadas,
                    fez_autoavaliacao=fez_autoavaliacao,
                    fez_avaliacao_gestor=fez_avaliacao_gestor,
                    tem_gestor=tem_gestor,
                )
            )

        return AcompanhamentoCicloResponse(
            ciclo_id=db_ciclo.id,
            ciclo_nome=db_ciclo.nome,
            etapa_atual=db_ciclo.etapa_atual.value
            if hasattr(db_ciclo.etapa_atual, "value")
            else str(db_ciclo.etapa_atual),
            colaboradores=resultado,
            total=len(resultado),
        )
