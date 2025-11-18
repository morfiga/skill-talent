import logging
from datetime import timedelta

from app.core.config import settings
from app.core.security import (
    create_access_token,
    get_current_colaborador,
    verify_google_token,
)
from app.database import get_db
from app.models import colaborador as colaborador_models
from app.schemas import auth as auth_schemas
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/google", response_model=auth_schemas.Token)
async def google_login(
    google_token: auth_schemas.GoogleToken, db: Session = Depends(get_db)
):
    """Autentica usuário via Google OAuth"""
    try:
        # Verificar token do Google
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

    try:
        # Buscar ou criar colaborador
        colaborador = (
            db.query(colaborador_models.Colaborador)
            .filter(colaborador_models.Colaborador.google_id == google_id)
            .first()
        )

        if not colaborador:
            # Tentar buscar por email
            colaborador = (
                db.query(colaborador_models.Colaborador)
                .filter(colaborador_models.Colaborador.email == email)
                .first()
            )

            if colaborador:
                # Atualizar colaborador existente com google_id
                logger.info(
                    f"Atualizando colaborador existente com Google ID. Email: {email}"
                )
                colaborador.google_id = google_id
                colaborador.avatar = avatar
                if name:
                    colaborador.nome = name
            else:
                # Criar novo colaborador
                logger.info(f"Criando novo colaborador. Email: {email}")
                colaborador = colaborador_models.Colaborador(
                    email=email,
                    nome=name or email.split("@")[0],
                    google_id=google_id,
                    avatar=avatar,
                )
                db.add(colaborador)
        else:
            # Atualizar informações do colaborador
            if avatar:
                colaborador.avatar = avatar
            if name:
                colaborador.nome = name

        db.commit()
        db.refresh(colaborador)
    except SQLAlchemyError as e:
        logger.error(
            f"Erro ao salvar colaborador no banco de dados. Email: {email}. Erro: {str(e)}",
            exc_info=True,
        )
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao processar autenticação",
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
    current_colaborador: colaborador_models.Colaborador = Depends(
        get_current_colaborador
    ),
):
    """Verifica se o token é válido e retorna informações do colaborador"""
    try:
        from app.schemas import colaborador as colaborador_schemas

        return colaborador_schemas.ColaboradorAuthResponse.model_validate(
            current_colaborador
        )
    except Exception as e:
        logger.error(
            f"Erro ao verificar autenticação. Colaborador ID: {current_colaborador.id}. Erro: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao processar verificação de autenticação",
        )
