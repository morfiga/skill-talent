import logging
import sys
from contextlib import asynccontextmanager

from app.api.v1 import (
    auth,
    avaliacoes,
    ciclos,
    ciclos_avaliacao,
    colaboradores,
    eixos_avaliacao,
    entregas_outstanding,
    niveis_carreira,
    registros_valor,
    valores,
)
from app.core.config import settings
from app.core.error_responses import create_error_response, get_request_id
from app.core.exceptions import BaseAPIException
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

# Configurar logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events da aplicação"""
    # Startup
    logger.info("Iniciando aplicação...")
    # Nota: As tabelas do banco de dados são gerenciadas via Alembic migrations.
    # Execute 'alembic upgrade head' para aplicar as migrations.
    logger.debug(
        "Aplicação iniciada. Certifique-se de que as migrations foram aplicadas."
    )
    yield
    # Shutdown
    logger.info("Encerrando aplicação...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(colaboradores.router, prefix="/api/v1")
app.include_router(eixos_avaliacao.router, prefix="/api/v1")
app.include_router(niveis_carreira.router, prefix="/api/v1")
app.include_router(ciclos.router, prefix="/api/v1")
app.include_router(ciclos_avaliacao.router, prefix="/api/v1")
app.include_router(avaliacoes.router, prefix="/api/v1")
app.include_router(entregas_outstanding.router, prefix="/api/v1")
app.include_router(valores.router, prefix="/api/v1")
app.include_router(registros_valor.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "Skill Talent API", "version": settings.APP_VERSION}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# Exception handlers globais
@app.exception_handler(BaseAPIException)
async def base_api_exception_handler(request: Request, exc: BaseAPIException):
    """Handler para exceções customizadas da API"""
    request_id = get_request_id(request)

    # Log apenas em modo debug ou para erros 5xx
    if exc.status_code >= 500:
        logger.error(
            f"Erro da API na requisição {request.method} {request.url.path}: {exc.detail}",
            exc_info=True,
            extra={"request_id": request_id, "error_code": exc.error_code},
        )
    else:
        logger.warning(
            f"Erro da API na requisição {request.method} {request.url.path}: {exc.detail}",
            extra={"request_id": request_id, "error_code": exc.error_code},
        )

    return create_error_response(
        status_code=exc.status_code,
        error_code=exc.error_code,
        message=exc.detail,
        request_id=request_id,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handler para erros de validação do Pydantic"""
    request_id = get_request_id(request)

    # Extrair primeiro erro para mensagem principal
    errors = exc.errors()
    first_error = errors[0] if errors else {}
    field = ".".join(str(loc) for loc in first_error.get("loc", []))
    message = first_error.get("msg", "Erro de validação")

    logger.warning(
        f"Erro de validação na requisição {request.method} {request.url.path}: {errors}",
        extra={"request_id": request_id, "field": field},
    )

    return create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        error_code="VALIDATION_ERROR",
        message=message,
        field=field if field else None,
        details={"errors": errors} if settings.DEBUG else None,
        request_id=request_id,
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handler para erros do SQLAlchemy"""
    request_id = get_request_id(request)

    # Log detalhado do erro
    logger.error(
        f"Erro de banco de dados na requisição {request.method} {request.url.path}: {str(exc)}",
        exc_info=True,
        extra={"request_id": request_id},
    )

    # Em produção, não expor detalhes do erro de banco
    detail_message = (
        "Erro ao processar operação no banco de dados"
        if not settings.DEBUG
        else f"Erro de banco de dados: {str(exc)}"
    )

    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code="DATABASE_ERROR",
        message=detail_message,
        request_id=request_id,
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handler para erros genéricos não tratados"""
    request_id = get_request_id(request)

    # Log detalhado do erro
    logger.error(
        f"Erro não tratado na requisição {request.method} {request.url.path}: {str(exc)}",
        exc_info=True,
        extra={"request_id": request_id, "exception_type": type(exc).__name__},
    )

    # Em produção, não expor detalhes do erro
    detail_message = (
        "Erro interno do servidor"
        if not settings.DEBUG
        else f"Erro interno: {str(exc)}"
    )

    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code="INTERNAL_SERVER_ERROR",
        message=detail_message,
        request_id=request_id,
    )
