"""
Funções de health check (liveness e readiness) da aplicação.

Este módulo centraliza a lógica de verificação de saúde da API, incluindo:
- Liveness: se a aplicação está de pé (processo vivo)
- Readiness: se a aplicação está pronta para receber tráfego (ex: DB OK)
"""

from datetime import datetime, timezone
from time import monotonic
from typing import Any, Dict

from app.core.config import settings
from app.database import SessionLocal
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError


def _check_database() -> Dict[str, Any]:
    """
    Verifica conectividade básica com o banco de dados.

    Executa um SELECT 1 simples e mede o tempo de resposta.
    Não lança exceções: sempre retorna um dicionário com status.
    """
    start = monotonic()
    status = "up"
    error: str | None = None

    try:
        db = SessionLocal()
        try:
            # SELECT 1 simples para verificar conectividade
            db.execute(text("SELECT 1"))
        finally:
            db.close()
    except SQLAlchemyError as exc:
        status = "down"
        error = str(exc)
    except Exception as exc:  # fallback genérico
        status = "down"
        error = str(exc)

    duration = monotonic() - start

    result: Dict[str, Any] = {
        "status": status,
        "latency_ms": round(duration * 1000, 2),
    }

    if error and settings.DEBUG:
        result["error"] = error

    return result


def get_liveness_payload() -> Dict[str, Any]:
    """
    Retorna payload de liveness.

    Simples: apenas indica que a aplicação está rodando.
    """
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
    }


def get_readiness_payload() -> Dict[str, Any]:
    """
    Retorna payload de readiness.

    Inclui:
    - status geral (ok/degraded/down)
    - status do banco de dados
    - versão da aplicação
    """
    db_status = _check_database()

    overall_status = "ok" if db_status.get("status") == "up" else "degraded"

    return {
        "status": overall_status,
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
        "checks": {
            "database": db_status,
        },
    }
