from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_colaborador
from app.database import get_db
from app.models import colaborador as colaborador_models
from app.models import registro_valor as registro_models
from app.schemas import registro_valor as registro_schemas

router = APIRouter(prefix="/registros-valor", tags=["registros-valor"])


@router.post(
    "/", response_model=registro_schemas.RegistroValorResponse, status_code=201
)
def create_registro_valor(
    registro: registro_schemas.RegistroValorCreate,
    current_colaborador: colaborador_models.Colaborador = Depends(get_current_colaborador),
    db: Session = Depends(get_db),
):
    """Cria um novo registro de valor para o usuário logado"""
    # Validar que os valores existem
    valores = (
        db.query(registro_models.Valor)
        .filter(registro_models.Valor.id.in_(registro.valores_ids))
        .all()
    )

    if len(valores) != len(registro.valores_ids):
        raise HTTPException(
            status_code=400,
            detail="Um ou mais valores selecionados não foram encontrados",
        )

    # Criar registro
    db_registro = registro_models.RegistroValor(
        colaborador_id=current_colaborador.id,
        descricao=registro.descricao,
        reflexao=registro.reflexao,
        impacto=registro.impacto,
    )
    db.add(db_registro)
    db.flush()

    # Associar valores
    for valor in valores:
        db_registro.valores.append(valor)

    db.commit()
    db.refresh(db_registro)
    return db_registro


@router.get("/", response_model=registro_schemas.RegistroValorListResponse)
def get_registros_valor(
    current_colaborador: colaborador_models.Colaborador = Depends(get_current_colaborador),
    db: Session = Depends(get_db),
):
    """Lista registros de valor do usuário logado"""
    query = db.query(registro_models.RegistroValor).filter(
        registro_models.RegistroValor.colaborador_id == current_colaborador.id
    )

    registros = query.order_by(registro_models.RegistroValor.created_at.desc()).all()
    total = len(registros)

    return {"registros": registros, "total": total}


@router.get("/{registro_id}", response_model=registro_schemas.RegistroValorResponse)
def get_registro_valor(
    registro_id: int,
    current_colaborador: colaborador_models.Colaborador = Depends(get_current_colaborador),
    db: Session = Depends(get_db),
):
    """Obtém um registro de valor por ID (apenas se pertencer ao usuário logado)"""
    registro = (
        db.query(registro_models.RegistroValor)
        .filter(registro_models.RegistroValor.id == registro_id)
        .first()
    )

    if not registro:
        raise HTTPException(status_code=404, detail="Registro de valor não encontrado")

    # Validar que o registro pertence ao colaborador logado
    if registro.colaborador_id != current_colaborador.id:
        raise HTTPException(
            status_code=403,
            detail="Você só pode buscar seus próprios registros de valor",
        )

    return registro


@router.put("/{registro_id}", response_model=registro_schemas.RegistroValorResponse)
def update_registro_valor(
    registro_id: int,
    registro: registro_schemas.RegistroValorUpdate,
    current_colaborador: colaborador_models.Colaborador = Depends(get_current_colaborador),
    db: Session = Depends(get_db),
):
    """Atualiza um registro de valor (apenas se pertencer ao usuário logado)"""
    db_registro = (
        db.query(registro_models.RegistroValor)
        .filter(registro_models.RegistroValor.id == registro_id)
        .first()
    )

    if not db_registro:
        raise HTTPException(status_code=404, detail="Registro de valor não encontrado")

    # Validar que o registro pertence ao colaborador logado
    if db_registro.colaborador_id != current_colaborador.id:
        raise HTTPException(
            status_code=403,
            detail="Você só pode atualizar seus próprios registros de valor",
        )

    # Atualizar campos básicos
    if registro.descricao is not None:
        db_registro.descricao = registro.descricao
    if registro.reflexao is not None:
        db_registro.reflexao = registro.reflexao
    if registro.impacto is not None:
        db_registro.impacto = registro.impacto

    # Atualizar valores se fornecidos
    if registro.valores_ids is not None:
        valores = (
            db.query(registro_models.Valor)
            .filter(registro_models.Valor.id.in_(registro.valores_ids))
            .all()
        )

        if len(valores) != len(registro.valores_ids):
            raise HTTPException(
                status_code=400,
                detail="Um ou mais valores selecionados não foram encontrados",
            )

        db_registro.valores = valores

    db.commit()
    db.refresh(db_registro)
    return db_registro


@router.delete("/{registro_id}", status_code=204)
def delete_registro_valor(
    registro_id: int,
    current_colaborador: colaborador_models.Colaborador = Depends(get_current_colaborador),
    db: Session = Depends(get_db),
):
    """Deleta um registro de valor (apenas se pertencer ao usuário logado)"""
    registro = (
        db.query(registro_models.RegistroValor)
        .filter(registro_models.RegistroValor.id == registro_id)
        .first()
    )

    if not registro:
        raise HTTPException(status_code=404, detail="Registro de valor não encontrado")

    # Validar que o registro pertence ao colaborador logado
    if registro.colaborador_id != current_colaborador.id:
        raise HTTPException(
            status_code=403,
            detail="Você só pode deletar seus próprios registros de valor",
        )

    db.delete(registro)
    db.commit()
    return None
