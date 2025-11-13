from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import user as user_models
from app.schemas import user as user_schemas

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=List[user_schemas.UserResponse])
def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Lista todos os usuários"""
    users = db.query(user_models.User).offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=user_schemas.UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Obtém um usuário por ID"""
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/", response_model=user_schemas.UserResponse, status_code=201)
def create_user(user: user_schemas.UserCreate, db: Session = Depends(get_db)):
    """Cria um novo usuário"""
    db_user = (
        db.query(user_models.User).filter(user_models.User.email == user.email).first()
    )
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = user_models.User(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
