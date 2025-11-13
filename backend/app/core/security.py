import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests
from google.oauth2 import id_token
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models import colaborador as colaborador_models
from app.models import user as user_models

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


def verify_google_token(token: str) -> dict:
    """Verifica o token do Google e retorna os dados do usuário"""
    try:
        idinfo = id_token.verify_oauth2_token(
            token, requests.Request(), settings.GOOGLE_CLIENT_ID
        )

        if idinfo["iss"] not in ["accounts.google.com", "https://accounts.google.com"]:
            logger.warning(f"Token Google com issuer inválido: {idinfo.get('iss')}")
            raise ValueError("Wrong issuer.")

        return idinfo
    except ValueError as e:
        logger.warning(f"Erro ao verificar token Google: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}",
        )
    except Exception as e:
        logger.error(
            f"Erro inesperado ao verificar token Google: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Erro ao verificar token Google",
        )


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Cria um token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def verify_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Verifica o token JWT e retorna os dados do usuário"""
    if not credentials:
        logger.warning("Tentativa de acesso sem credenciais")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        # O campo 'sub' é uma string no JWT, precisamos converter para int
        sub = payload.get("sub")
        email: str = payload.get("email")
        if sub is None or email is None:
            logger.warning("Token JWT sem sub ou email")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
        # Converter sub (string) para int
        try:
            user_id: int = int(sub)
        except (ValueError, TypeError):
            logger.warning(f"Token JWT com sub inválido: {sub}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
        return {"user_id": user_id, "email": email}
    except JWTError as e:
        logger.warning(f"Erro ao decodificar token JWT: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    except Exception as e:
        logger.error(f"Erro inesperado ao verificar token JWT: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Erro ao verificar token",
        )


def get_current_user(
    token_data: dict = Depends(verify_token), db: Session = Depends(get_db)
):
    """Retorna o usuário atual baseado no token"""
    try:
        user = (
            db.query(user_models.User)
            .filter(user_models.User.id == token_data["user_id"])
            .first()
        )
        if user is None:
            logger.warning(
                f"Usuário não encontrado no banco de dados. User ID: {token_data.get('user_id')}"
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Erro ao buscar usuário no banco de dados. User ID: {token_data.get('user_id')}. Erro: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao buscar usuário",
        )


def get_current_colaborador(
    current_user: user_models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retorna o colaborador associado ao usuário logado baseado no email"""
    try:
        colaborador = (
            db.query(colaborador_models.Colaborador)
            .filter(colaborador_models.Colaborador.email == current_user.email)
            .first()
        )
        if colaborador is None:
            logger.warning(
                f"Colaborador não encontrado para o usuário. User ID: {current_user.id}, Email: {current_user.email}"
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Colaborador não encontrado para este usuário",
            )
        return colaborador
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Erro ao buscar colaborador no banco de dados. User ID: {current_user.id}. Erro: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao buscar colaborador",
        )
