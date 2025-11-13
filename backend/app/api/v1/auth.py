import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, get_current_user, verify_google_token
from app.database import get_db
from app.models import user as user_models
from app.schemas import auth as auth_schemas

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
    picture = google_user_info.get("picture")
    google_id = google_user_info.get("sub")

    if not email:
        logger.warning(f"Token Google válido mas sem email. Google ID: {google_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided by Google",
        )

    try:
        # Buscar ou criar usuário
        user = (
            db.query(user_models.User)
            .filter(user_models.User.google_id == google_id)
            .first()
        )

        if not user:
            # Tentar buscar por email
            user = (
                db.query(user_models.User)
                .filter(user_models.User.email == email)
                .first()
            )

            if user:
                # Atualizar usuário existente com google_id
                logger.info(
                    f"Atualizando usuário existente com Google ID. Email: {email}"
                )
                user.google_id = google_id
                user.picture = picture
                if name:
                    user.name = name
            else:
                # Criar novo usuário
                logger.info(f"Criando novo usuário. Email: {email}")
                user = user_models.User(
                    email=email,
                    name=name or email.split("@")[0],
                    google_id=google_id,
                    picture=picture,
                )
                db.add(user)
        else:
            # Atualizar informações do usuário
            if picture:
                user.picture = picture
            if name:
                user.name = name

        db.commit()
        db.refresh(user)
    except SQLAlchemyError as e:
        logger.error(
            f"Erro ao salvar usuário no banco de dados. Email: {email}. Erro: {str(e)}",
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
        data={"sub": str(user.id), "email": user.email},
        expires_delta=timedelta(hours=settings.JWT_EXPIRATION_HOURS),
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
    }


@router.get("/verify")
async def verify_auth(current_user: user_models.User = Depends(get_current_user)):
    """Verifica se o token é válido e retorna informações do usuário"""
    try:
        from app.schemas import user as user_schemas

        return user_schemas.UserResponse.model_validate(current_user)
    except Exception as e:
        logger.error(
            f"Erro ao verificar autenticação. User ID: {current_user.id}. Erro: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao processar verificação de autenticação",
        )
