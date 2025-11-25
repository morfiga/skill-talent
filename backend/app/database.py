from app.core.config import settings
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Criar engine do SQLAlchemy
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.SQLALCHEMY_DEBUG,
)

# Criar SessionLocal
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para os modelos
Base = declarative_base()


"""
Dependência para obter a sessão do banco.

Cada requisição que usar `get_db` terá uma transação aberta automaticamente:
- Se o endpoint terminar sem erro, é feito `commit`.
- Se acontecer qualquer exceção, é feito `rollback`.
"""


def get_db():
    db = SessionLocal()
    try:
        # Entrega a sessão para o endpoint / service
        yield db
        # Se chegou aqui sem exceção, confirma a transação
        db.commit()
    except Exception:
        # Qualquer erro durante o processamento da requisição faz rollback
        db.rollback()
        raise
    finally:
        # Sempre fecha a sessão ao final da requisição
        db.close()
