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
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handler para erros de validação"""
    logger.warning(
        f"Erro de validação na requisição {request.method} {request.url.path}: {exc.errors()}"
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": exc.body},
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handler para erros do SQLAlchemy"""
    logger.error(
        f"Erro de banco de dados na requisição {request.method} {request.url.path}: {str(exc)}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Erro interno do servidor ao processar requisição no banco de dados"
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handler para erros genéricos não tratados"""
    logger.error(
        f"Erro não tratado na requisição {request.method} {request.url.path}: {str(exc)}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Erro interno do servidor"},
    )
