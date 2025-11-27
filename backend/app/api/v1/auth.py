import logging
from datetime import timedelta

from app.core.config import settings
from app.core.security import (
    create_access_token,
    get_current_colaborador,
    verify_google_token,
)
from app.database import get_db
from app.models.colaborador import Colaborador
from app.repositories.colaborador import ColaboradorRepository
from app.schemas.auth import GoogleToken, Token
from app.schemas.colaborador import ColaboradorAuthResponse
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/google", response_model=Token)
async def google_login(google_token: GoogleToken, db: Session = Depends(get_db)):
    """Autentica usuário via Google OAuth"""
    try:
        google_user_info = verify_google_token(google_token.token)
    except HTTPException as e:
        logger.warning(f"Falha na verificação do token Google: {e.detail}")
        raise
    except Exception as e:
        logger.error(
            f"Erro inesperado ao verificar token Google: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao processar autenticação Google",
        )

    email = google_user_info.get("email")
    name = google_user_info.get("name")
    avatar = google_user_info.get("picture")
    google_id = google_user_info.get("sub")

    if not email:
        logger.warning(f"Token Google válido mas sem email. Google ID: {google_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided by Google",
        )

    colaborador_repo = ColaboradorRepository(db)
    colaborador = colaborador_repo.get_by_google_id(google_id)

    if not colaborador:
        colaborador = colaborador_repo.get_by_email(email)

        if not colaborador:
            # Colaborador não encontrado
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário não autorizado",
            )

        # Atualizar colaborador existente com google_id
        logger.info(f"Atualizando colaborador existente com Google ID. Email: {email}")
        colaborador = colaborador_repo.update(
            colaborador.id, google_id=google_id, avatar=avatar, nome=name
        )

    # Criar token JWT
    # O campo 'sub' (subject) deve ser uma string no JWT
    access_token = create_access_token(
        data={"sub": str(colaborador.id), "email": colaborador.email},
        expires_delta=timedelta(hours=settings.JWT_EXPIRATION_HOURS),
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": colaborador.id,
        "email": colaborador.email,
        "name": colaborador.nome,
        "avatar": colaborador.avatar,
    }


@router.get("/verify")
async def verify_auth(
    current_colaborador: Colaborador = Depends(get_current_colaborador),
):
    """Verifica se o token é válido e retorna informações do colaborador"""
    try:
        return ColaboradorAuthResponse.model_validate(current_colaborador)
    except Exception as e:
        logger.error(
            f"Erro ao verificar autenticação. Colaborador ID: {current_colaborador.id}. Erro: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao processar verificação de autenticação",
        )
