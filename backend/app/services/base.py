"""
Classe base para services.

Esta classe fornece funcionalidades comuns para todos os services,
como gerenciamento de transações e tratamento de erros.
"""
from typing import Generic, TypeVar
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import DatabaseException

ModelType = TypeVar("ModelType")


class BaseService(Generic[ModelType]):
    """Classe base para services com funcionalidades comuns"""

    def __init__(self, db: Session):
        """
        Inicializa o service

        Args:
            db: Sessão do banco de dados
        """
        self.db = db

    def _handle_database_error(self, operation: str) -> None:
        """
        Trata erros de banco de dados de forma padronizada

        Args:
            operation: Descrição da operação que falhou

        Raises:
            DatabaseException: Sempre que chamado
        """
        self.db.rollback()
        raise DatabaseException(f"Erro ao {operation} no banco de dados")

    def commit(self) -> None:
        """Confirma as alterações no banco de dados"""
        try:
            self.db.commit()
        except SQLAlchemyError:
            self._handle_database_error("confirmar alterações")

    def rollback(self) -> None:
        """Reverte as alterações no banco de dados"""
        self.db.rollback()

