import logging
from typing import Dict, List, Optional

from app.core.security import get_current_colaborador
from app.database import get_db
from app.models import avaliacao as avaliacao_models
from app.models import colaborador as colaborador_models
from app.repositories import (
    AvaliacaoRepository,
    CicloAvaliacaoRepository,
    ColaboradorRepository,
    EixoAvaliacaoRepository,
)
from app.schemas import avaliacao as avaliacao_schemas
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/avaliacoes", tags=["avaliacoes"])


@router.post("/", response_model=avaliacao_schemas.AvaliacaoResponse, status_code=201)
def create_avaliacao(
    avaliacao: avaliacao_schemas.AvaliacaoCreate,
    current_colaborador: colaborador_models.Colaborador = Depends(
        get_current_colaborador
    ),
    db: Session = Depends(get_db),
):
    """Cria uma nova avaliação"""
    avaliacao_repo = AvaliacaoRepository(db)
    colaborador_repo = ColaboradorRepository(db)

    try:
        # Validar que o avaliado existe
        avaliado = avaliacao_repo.validate_colaborador(avaliacao.avaliado_id)

        if not avaliado:
            logger.warning(
                f"Tentativa de criar avaliação para colaborador inexistente. Colaborador ID: {avaliacao.avaliado_id}"
            )
            raise HTTPException(
                status_code=404, detail="Colaborador avaliado não encontrado"
            )

        # Para autoavaliação, avaliador_id = avaliado_id
        # Para par ou gestor, usar o colaborador_id do usuário logado
        if avaliacao.tipo == "autoavaliacao":
            avaliador_id = avaliacao.avaliado_id
            # Validar que o avaliado é o próprio usuário logado
            if avaliacao.avaliado_id != current_colaborador.id:
                logger.warning(
                    f"Tentativa de criar autoavaliação para outro colaborador. Avaliado ID: {avaliacao.avaliado_id}, Colaborador logado: {current_colaborador.id}"
                )
                raise HTTPException(
                    status_code=403,
                    detail="Você só pode criar autoavaliação para si mesmo",
                )
        else:
            # Para par ou gestor, o avaliador sempre é o usuário logado
            avaliador_id = current_colaborador.id

        # Validar que o ciclo existe (agora que temos o avaliador_id)
        ciclo = avaliacao_repo.validate_ciclo_avaliacao(
            avaliacao.ciclo_id, avaliador_id
        )

        if not ciclo:
            logger.warning(
                f"Tentativa de criar avaliação para ciclo inexistente. Ciclo ID: {avaliacao.ciclo_id}"
            )
            raise HTTPException(
                status_code=404, detail="Ciclo de avaliação não encontrado"
            )

        # Verificar se já existe avaliação deste tipo
        existing = avaliacao_repo.check_duplicate(
            ciclo_id=avaliacao.ciclo_id,
            avaliador_id=avaliador_id,
            avaliado_id=avaliacao.avaliado_id,
            tipo=avaliacao_models.TipoAvaliacao(avaliacao.tipo),
        )

        if existing:
            logger.warning(
                f"Tentativa de criar avaliação duplicada. Ciclo: {avaliacao.ciclo_id}, "
                f"Avaliador: {avaliador_id}, Avaliado: {avaliacao.avaliado_id}, Tipo: {avaliacao.tipo}"
            )
            raise HTTPException(
                status_code=400,
                detail="Já existe uma avaliação deste tipo para este ciclo",
            )

        # Criar avaliação com eixos
        logger.info(
            f"Criando avaliação. Ciclo: {avaliacao.ciclo_id}, Tipo: {avaliacao.tipo}, "
            f"Avaliador: {avaliador_id}, Avaliado: {avaliacao.avaliado_id}"
        )
        logger.debug(
            f"Criando avaliações por eixo. Eixos recebidos: {list(avaliacao.eixos.keys())}"
        )

        db_avaliacao = avaliacao_repo.create_with_eixos(
            ciclo_id=avaliacao.ciclo_id,
            avaliador_id=avaliador_id,
            avaliado_id=avaliacao.avaliado_id,
            tipo=avaliacao_models.TipoAvaliacao(avaliacao.tipo),
            avaliacao_geral=avaliacao.avaliacao_geral,
            eixos_data=avaliacao.eixos,
        )

        avaliacao_repo.commit()
        avaliacao_repo.refresh(db_avaliacao)
        logger.info(f"Avaliação criada com sucesso. ID: {db_avaliacao.id}")
        return db_avaliacao
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(
            f"Erro ao criar avaliação no banco de dados. Ciclo: {avaliacao.ciclo_id}. Erro: {str(e)}",
            exc_info=True,
        )
        avaliacao_repo.rollback()
        raise HTTPException(
            status_code=500, detail="Erro ao criar avaliação no banco de dados"
        )
    except Exception as e:
        logger.error(
            f"Erro inesperado ao criar avaliação. Ciclo: {avaliacao.ciclo_id}. Erro: {str(e)}",
            exc_info=True,
        )
        avaliacao_repo.rollback()
        raise HTTPException(
            status_code=500, detail="Erro interno ao processar requisição"
        )


@router.get("/", response_model=avaliacao_schemas.AvaliacaoListResponse)
def get_avaliacoes(
    ciclo_id: Optional[int] = None,
    avaliador_id: Optional[int] = None,
    avaliado_id: Optional[int] = None,
    tipo: Optional[str] = None,
    current_colaborador: colaborador_models.Colaborador = Depends(
        get_current_colaborador
    ),
    db: Session = Depends(get_db),
):
    """Lista avaliações. Por padrão, retorna apenas avaliações onde o usuário logado é avaliador ou avaliado"""
    avaliacao_repo = AvaliacaoRepository(db)

    # Se não especificado, filtrar por avaliador_id ou avaliado_id do usuário logado
    if avaliador_id is None and avaliado_id is None:
        # Retornar avaliações onde o usuário logado é avaliador ou avaliado
        avaliacoes_como_avaliador = avaliacao_repo.get_by_filters(
            ciclo_id=ciclo_id,
            avaliador_id=current_colaborador.id,
            avaliado_id=None,
            tipo=tipo,
        )
        # Também buscar avaliações onde o usuário é avaliado
        avaliacoes_como_avaliado = avaliacao_repo.get_by_filters(
            ciclo_id=ciclo_id,
            avaliador_id=None,
            avaliado_id=current_colaborador.id,
            tipo=tipo,
        )
        # Combinar e remover duplicatas
        avaliacoes_ids = {a.id for a in avaliacoes_como_avaliador}
        avaliacoes = avaliacoes_como_avaliador + [
            a for a in avaliacoes_como_avaliado if a.id not in avaliacoes_ids
        ]
        # Ordenar por created_at desc
        avaliacoes.sort(key=lambda x: x.created_at, reverse=True)
        total = len(avaliacoes)
    else:
        # Validar que o usuário só pode ver suas próprias avaliações
        # Se avaliador_id for especificado, deve ser o usuário logado
        if avaliador_id is not None and avaliador_id != current_colaborador.id:
            logger.warning(
                f"Tentativa de buscar avaliações de outro avaliador. Avaliador ID: {avaliador_id}, Colaborador logado: {current_colaborador.id}"
            )
            raise HTTPException(
                status_code=403,
                detail="Você só pode buscar avaliações onde você é o avaliador",
            )
        # Se avaliador_id for o usuário logado, ele pode buscar avaliações de qualquer avaliado
        # (permite que o usuário busque avaliações onde ele avalia outras pessoas, como gestor)
        # Se avaliador_id NÃO for especificado e avaliado_id for especificado,
        # então o avaliado deve ser o próprio usuário logado
        if (
            avaliador_id is None
            and avaliado_id is not None
            and avaliado_id != current_colaborador.id
        ):
            logger.warning(
                f"Tentativa de buscar avaliações de outro avaliado sem ser o avaliador. Avaliado ID: {avaliado_id}, Colaborador logado: {current_colaborador.id}"
            )
            raise HTTPException(
                status_code=403,
                detail="Você só pode buscar avaliações onde você é o avaliado ou o avaliador",
            )

        logger.debug(
            f"GET /avaliacoes - Listando avaliações. Filtros: ciclo_id={ciclo_id}, avaliador_id={avaliador_id}, avaliado_id={avaliado_id}, tipo={tipo}"
        )

        avaliacao_repo = AvaliacaoRepository(db)
        avaliacoes = avaliacao_repo.get_by_filters(
            ciclo_id=ciclo_id,
            avaliador_id=avaliador_id,
            avaliado_id=avaliado_id,
            tipo=tipo,
        )

        # Calcular total com os mesmos filtros
        total = avaliacao_repo.count_by_filters(
            ciclo_id=ciclo_id,
            avaliador_id=avaliador_id,
            avaliado_id=avaliado_id,
            tipo=tipo,
        )

    logger.debug(f"Total de avaliações encontradas: {total}")
    logger.debug(f"Retornando {len(avaliacoes)} avaliações")
    return {"avaliacoes": avaliacoes, "total": total}


@router.get("/{avaliacao_id}", response_model=avaliacao_schemas.AvaliacaoResponse)
def get_avaliacao(
    avaliacao_id: int,
    current_colaborador: colaborador_models.Colaborador = Depends(
        get_current_colaborador
    ),
    db: Session = Depends(get_db),
):
    """Obtém uma avaliação por ID (apenas se o usuário logado for avaliador ou avaliado)"""
    try:
        avaliacao_repo = AvaliacaoRepository(db)
        avaliacao = avaliacao_repo.get(avaliacao_id)

        if not avaliacao:
            logger.warning(
                f"Tentativa de buscar avaliação inexistente. ID: {avaliacao_id}"
            )
            raise HTTPException(status_code=404, detail="Avaliação não encontrada")

        # Validar que o usuário logado é o avaliador ou o avaliado
        if (
            avaliacao.avaliador_id != current_colaborador.id
            and avaliacao.avaliado_id != current_colaborador.id
        ):
            logger.warning(
                f"Tentativa de buscar avaliação de outro colaborador. Avaliação ID: {avaliacao_id}, Avaliador: {avaliacao.avaliador_id}, Avaliado: {avaliacao.avaliado_id}, Colaborador logado: {current_colaborador.id}"
            )
            raise HTTPException(
                status_code=403,
                detail="Você só pode buscar avaliações onde você é o avaliador ou o avaliado",
            )

        return avaliacao
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Erro ao buscar avaliação. ID: {avaliacao_id}. Erro: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Erro ao buscar avaliação")


@router.put("/{avaliacao_id}", response_model=avaliacao_schemas.AvaliacaoResponse)
def update_avaliacao(
    avaliacao_id: int,
    avaliacao: avaliacao_schemas.AvaliacaoUpdate,
    current_colaborador: colaborador_models.Colaborador = Depends(
        get_current_colaborador
    ),
    db: Session = Depends(get_db),
):
    """Atualiza uma avaliação (apenas se o usuário logado for o avaliador)"""
    avaliacao_repo = AvaliacaoRepository(db)

    try:
        db_avaliacao = avaliacao_repo.get(avaliacao_id)

        if not db_avaliacao:
            logger.warning(
                f"Tentativa de atualizar avaliação inexistente. ID: {avaliacao_id}"
            )
            raise HTTPException(status_code=404, detail="Avaliação não encontrada")

        # Validar que o usuário logado é o avaliador
        if db_avaliacao.avaliador_id != current_colaborador.id:
            logger.warning(
                f"Tentativa de atualizar avaliação de outro avaliador. Avaliação ID: {avaliacao_id}, Avaliador: {db_avaliacao.avaliador_id}, Colaborador logado: {current_colaborador.id}"
            )
            raise HTTPException(
                status_code=403,
                detail="Você só pode atualizar avaliações onde você é o avaliador",
            )

        logger.info(f"Atualizando avaliação. ID: {avaliacao_id}")
        logger.debug(
            f"Dados recebidos para atualização: avaliacao_geral={'preenchida' if avaliacao.avaliacao_geral else 'vazia'}, eixos={list(avaliacao.eixos.keys()) if avaliacao.eixos else 'nenhum'}"
        )

        # Atualizar avaliação com eixos
        db_avaliacao = avaliacao_repo.update_with_eixos(
            avaliacao_id=avaliacao_id,
            avaliacao_geral=avaliacao.avaliacao_geral,
            eixos_data=avaliacao.eixos,
        )

        avaliacao_repo.commit()
        avaliacao_repo.refresh(db_avaliacao)
        logger.info(f"Avaliação atualizada com sucesso. ID: {avaliacao_id}")
        return db_avaliacao
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(
            f"Erro ao atualizar avaliação no banco de dados. ID: {avaliacao_id}. Erro: {str(e)}",
            exc_info=True,
        )
        avaliacao_repo.rollback()
        raise HTTPException(
            status_code=500, detail="Erro ao atualizar avaliação no banco de dados"
        )
    except Exception as e:
        logger.error(
            f"Erro inesperado ao atualizar avaliação. ID: {avaliacao_id}. Erro: {str(e)}",
            exc_info=True,
        )
        avaliacao_repo.rollback()
        raise HTTPException(
            status_code=500, detail="Erro interno ao processar requisição"
        )


@router.get(
    "/ciclo/{ciclo_id}/feedback", response_model=avaliacao_schemas.FeedbackResponse
)
def get_feedback(
    ciclo_id: int,
    current_colaborador: colaborador_models.Colaborador = Depends(
        get_current_colaborador
    ),
    db: Session = Depends(get_db),
):
    """Obtém dados consolidados de feedback para um ciclo"""
    logger.debug(f"GET /avaliacoes/ciclo/{ciclo_id}/feedback - Gerando feedback")

    avaliacao_repo = AvaliacaoRepository(db)
    ciclo_avaliacao_repo = CicloAvaliacaoRepository(db)
    colaborador_repo = ColaboradorRepository(db)

    try:
        ciclo = avaliacao_repo.validate_ciclo_avaliacao(
            ciclo_id, current_colaborador.id
        )

        if not ciclo:
            logger.warning(
                f"Tentativa de buscar feedback para ciclo inexistente. Ciclo ID: {ciclo_id}"
            )
            raise HTTPException(
                status_code=404, detail="Ciclo de avaliação não encontrado"
            )

        # Validar que o ciclo pertence ao colaborador logado
        if ciclo.colaborador_id != current_colaborador.id:
            logger.warning(
                f"Tentativa de buscar feedback de ciclo de outro colaborador. Ciclo ID: {ciclo_id}, Colaborador do ciclo: {ciclo.colaborador_id}, Colaborador logado: {current_colaborador.id}"
            )
            raise HTTPException(
                status_code=403,
                detail="Você só pode buscar feedback do seu próprio ciclo de avaliação",
            )

        logger.debug(
            f"Ciclo de avaliação encontrado. ID: {ciclo_id}, Colaborador ID: {ciclo.colaborador_id}, Ciclo ID: {ciclo.ciclo_id}"
        )

        # Usar o ciclo_id do Ciclo (não do CicloAvaliacao) para buscar avaliações
        ciclo_ciclo_id = ciclo.ciclo_id

        # Buscar autoavaliação
        logger.debug("Buscando autoavaliação")
        autoavaliacao = avaliacao_repo.get_by_ciclo_and_tipo(
            ciclo_id=ciclo_ciclo_id,
            tipo=avaliacao_models.TipoAvaliacao.AUTOAVALIACAO,
        )
        logger.debug(
            f"Autoavaliação {'encontrada' if autoavaliacao else 'não encontrada'}"
        )

        # Buscar avaliação do gestor
        logger.debug("Buscando avaliação do gestor")
        avaliacao_gestor = avaliacao_repo.get_by_ciclo_and_tipo(
            ciclo_id=ciclo_ciclo_id,
            tipo=avaliacao_models.TipoAvaliacao.GESTOR,
        )
        logger.debug(
            f"Avaliação do gestor {'encontrada' if avaliacao_gestor else 'não encontrada'}"
        )

        # Buscar avaliações de pares
        logger.debug("Buscando avaliações de pares")
        avaliacoes_pares = avaliacao_repo.get_all_by_ciclo_and_tipo(
            ciclo_id=ciclo_ciclo_id,
            tipo=avaliacao_models.TipoAvaliacao.PAR,
        )
        logger.debug(f"Encontradas {len(avaliacoes_pares)} avaliações de pares")

        # Calcular média dos pares por eixo
        logger.debug("Calculando média dos pares por eixo")
        media_pares_por_eixo = avaliacao_repo.get_media_pares_por_eixo(ciclo_ciclo_id)

        # Obter níveis esperados baseado no nível de carreira do colaborador
        colaborador = colaborador_repo.get(ciclo.colaborador_id)

        niveis_esperados = []
        if colaborador and colaborador.nivel_carreira:
            from app.api.v1.niveis_carreira import NIVEIS_ESPERADOS_POR_CARREIRA

            niveis_esperados = NIVEIS_ESPERADOS_POR_CARREIRA.get(
                colaborador.nivel_carreira, [0, 0, 0, 0]
            )

        logger.info(f"Feedback gerado com sucesso para ciclo. ID: {ciclo_id}")
        return {
            "autoavaliacao": autoavaliacao,
            "avaliacao_gestor": avaliacao_gestor,
            "avaliacoes_pares": avaliacoes_pares,
            "media_pares_por_eixo": media_pares_por_eixo,
            "niveis_esperados": niveis_esperados,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Erro ao gerar feedback para ciclo. Ciclo ID: {ciclo_id}. Erro: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Erro ao gerar feedback")
