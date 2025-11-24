"""
Formatação padronizada de respostas de erro.

Este módulo fornece funções para formatar respostas de erro de forma
consistente em toda a aplicação.
"""

from typing import Any, Dict, Optional

from fastapi import Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorDetail(BaseModel):
    """Modelo para detalhes de erro"""

    code: str
    message: str
    status_code: int
    field: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Modelo padronizado de resposta de erro"""

    error: ErrorDetail
    request_id: Optional[str] = None


def create_error_response(
    status_code: int,
    error_code: str,
    message: str,
    field: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None,
) -> JSONResponse:
    """
    Cria uma resposta de erro padronizada.

    Args:
        status_code: Código HTTP de status
        error_code: Código de erro customizado
        message: Mensagem de erro
        field: Campo relacionado ao erro (opcional)
        details: Detalhes adicionais (opcional)
        request_id: ID da requisição para rastreamento (opcional)

    Returns:
        JSONResponse com o erro formatado
    """
    error_detail = ErrorDetail(
        code=error_code,
        message=message,
        status_code=status_code,
        field=field,
        details=details,
    )

    response_data = ErrorResponse(error=error_detail, request_id=request_id)

    return JSONResponse(
        status_code=status_code,
        content=response_data.model_dump(exclude_none=True),
    )


def get_request_id(request: Request) -> Optional[str]:
    """
    Obtém o ID da requisição do header ou gera um novo.

    Args:
        request: Objeto Request do FastAPI

    Returns:
        ID da requisição ou None
    """
    # Tentar obter do header X-Request-ID
    request_id = request.headers.get("X-Request-ID")
    return request_id
