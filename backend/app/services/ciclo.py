"""
Service para operações de negócio relacionadas a Ciclos.

Este service contém a lógica de negócio para ciclos,
separando-a dos controllers e repositories.
"""

from typing import List, Optional

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.exceptions import (
    BusinessRuleException,
    NotFoundException,
    ValidationException,
)
from app.models.ciclo import Ciclo, EtapaCiclo, StatusCiclo
from app.repositories.ciclo import CicloRepository
from app.schemas.ciclo import CicloCreate, CicloUpdate
from app.services.base import BaseService


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

    def create_ciclo(self, ciclo_data: CicloCreate) -> Ciclo:
        """Cria um novo ciclo. Validação de campos já feita no schema."""
        try:
            db_ciclo = Ciclo(
                nome=ciclo_data.nome,
                status=ciclo_data.status,
                etapa_atual=ciclo_data.etapa_atual,
                data_inicio=ciclo_data.data_inicio,
                data_fim=ciclo_data.data_fim,
            )
            self.db.add(db_ciclo)
            self.commit()
            self.db.refresh(db_ciclo)
            return db_ciclo
        except SQLAlchemyError:
            self._handle_database_error("criar ciclo")

    def update_ciclo(self, ciclo_id: int, ciclo_data: CicloUpdate) -> Ciclo:
        """Atualiza um ciclo. Validação de campos já feita no schema."""
        db_ciclo = self.repository.get(ciclo_id)
        if not db_ciclo:
            raise NotFoundException("Ciclo", ciclo_id)

        # Os campos já vêm validados do schema (enums convertidos)
        update_data = ciclo_data.model_dump(exclude_unset=True)

        try:
            for field, value in update_data.items():
                if value is not None:
                    setattr(db_ciclo, field, value)

            self.commit()
            self.db.refresh(db_ciclo)
            return db_ciclo
        except SQLAlchemyError:
            self._handle_database_error("atualizar ciclo")

    def get_ciclo_aberto(self) -> Ciclo:
        ciclo = self.repository.get_aberto()
        if not ciclo:
            raise NotFoundException("Ciclo aberto")
        return ciclo

    def avancar_etapa(self, ciclo_id: int) -> Ciclo:
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
                db_ciclo.etapa_atual = self.ETAPAS_SEQUENCIA[etapa_atual_idx + 1]
                self.commit()
                self.db.refresh(db_ciclo)
                return db_ciclo
            except SQLAlchemyError:
                self._handle_database_error("atualizar etapa do ciclo")
                
        except ValueError:
            raise ValidationException(
                f"Etapa atual inválida: {db_ciclo.etapa_atual}",
                field="etapa_atual",
            )

    def delete_ciclo(self, ciclo_id: int) -> bool:
        db_ciclo = self.repository.get(ciclo_id)
        if not db_ciclo:
            raise NotFoundException("Ciclo", ciclo_id)

        return self.repository.delete(ciclo_id)
