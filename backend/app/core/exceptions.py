from typing import Any, Dict, Optional

from fastapi import HTTPException, status


class BaseAPIException(HTTPException):
    """Classe base para todas as exceções da API"""

    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] = None,
        headers: Optional[Dict[str, Any]] = None,
    ):
        """
        Args:
            status_code: Código HTTP de status
            detail: Mensagem de erro detalhada
            error_code: Código de erro customizado para identificação
            headers: Headers HTTP opcionais
        """
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code or self.__class__.__name__

    def to_dict(self) -> Dict[str, Any]:
        """Converte a exceção para um dicionário padronizado"""
        return {
            "error": {
                "code": self.error_code,
                "message": self.detail,
                "status_code": self.status_code,
            }
        }


# ============================================================================
# Exceções de Recursos Não Encontrados (404)
# ============================================================================


class NotFoundException(BaseAPIException):
    """Recurso não encontrado"""

    def __init__(self, resource: str, identifier: Optional[Any] = None):
        detail = f"{resource} não encontrado"
        if identifier is not None:
            detail += f" (ID: {identifier})"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="RESOURCE_NOT_FOUND",
        )


# ============================================================================
# Exceções de Validação (400)
# ============================================================================


class ValidationException(BaseAPIException):
    """Erro de validação"""

    def __init__(self, detail: str, field: Optional[str] = None):
        if field:
            detail = f"Campo '{field}': {detail}"
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="VALIDATION_ERROR",
        )


class DuplicateResourceException(BaseAPIException):
    """Recurso duplicado"""

    def __init__(
        self, resource: str, field: Optional[str] = None, value: Optional[Any] = None
    ):
        detail = f"{resource} já existe"
        if field and value:
            detail += f" ({field}: {value})"
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="DUPLICATE_RESOURCE",
        )


class BusinessRuleException(BaseAPIException):
    """Violação de regra de negócio"""

    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="BUSINESS_RULE_VIOLATION",
        )


# ============================================================================
# Exceções de Autorização (403)
# ============================================================================


class ForbiddenException(BaseAPIException):
    """Acesso negado"""

    def __init__(self, detail: str = "Acesso negado"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="FORBIDDEN",
        )


class UnauthorizedActionException(ForbiddenException):
    """Ação não autorizada"""

    def __init__(
        self, detail: str = "Você não tem permissão para acessar este recurso"
    ):
        super().__init__(detail)


# ============================================================================
# Exceções de Erro Interno (500)
# ============================================================================


class DatabaseException(BaseAPIException):
    """Erro de banco de dados"""

    def __init__(self, detail: str = "Erro ao processar operação no banco de dados"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="DATABASE_ERROR",
        )


class InternalServerException(BaseAPIException):
    """Erro interno do servidor"""

    def __init__(self, detail: str = "Erro interno do servidor"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="INTERNAL_SERVER_ERROR",
        )
