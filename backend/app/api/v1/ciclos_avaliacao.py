import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_colaborador
from app.database import get_db
from app.models.colaborador import Colaborador
from app.repositories import CicloAvaliacaoRepository
from app.schemas import ciclo_avaliacao as ciclo_schemas

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ciclos-avaliacao", tags=["ciclos-avaliacao"])


@router.post("/", response_model=ciclo_schemas.CicloAvaliacaoResponse, status_code=201)
def create_ciclo_avaliacao(
    ciclo: ciclo_schemas.CicloAvaliacaoCreate,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    db: Session = Depends(get_db),
):
    """Cria um novo ciclo de avaliação para o usuário logado"""
    # Usar o colaborador_id do usuário logado
    colaborador_id = current_colaborador.id

    logger.debug(
        f"POST /ciclos-avaliacao - Criando ciclo de avaliação. Dados recebidos: ciclo_id={ciclo.ciclo_id}, colaborador_id={colaborador_id}, pares_ids={ciclo.pares_ids}"
    )

    # Inicializar repositórios
    ciclo_avaliacao_repo = CicloAvaliacaoRepository(db)

    # Validar que o colaborador existe
    logger.debug(f"Validando colaborador. ID: {colaborador_id}")
    colaborador = ciclo_avaliacao_repo.validate_colaborador(colaborador_id)

    if not colaborador:
        logger.warning(f"Colaborador não encontrado. ID: {colaborador_id}")
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")

    logger.debug(f"Colaborador encontrado: {colaborador.nome} (ID: {colaborador.id})")

    # Validar que o ciclo existe
    logger.debug(f"Validando ciclo. ID: {ciclo.ciclo_id}")
    ciclo_obj = ciclo_avaliacao_repo.validate_ciclo(ciclo.ciclo_id)

    if not ciclo_obj:
        logger.warning(f"Ciclo não encontrado. ID: {ciclo.ciclo_id}")
        raise HTTPException(status_code=404, detail="Ciclo não encontrado")

    logger.debug(
        f"Ciclo encontrado: {ciclo_obj.nome} (ID: {ciclo_obj.id}, Status: {ciclo_obj.status})"
    )

    # Validar que foram selecionados exatamente 4 pares
    logger.debug(
        f"Validando quantidade de pares. Quantidade recebida: {len(ciclo.pares_ids)}"
    )
    if len(ciclo.pares_ids) != 4:
        logger.warning(
            f"Quantidade inválida de pares. Esperado: 4, Recebido: {len(ciclo.pares_ids)}"
        )
        raise HTTPException(
            status_code=400, detail="É necessário selecionar exatamente 4 pares"
        )

    # Validar que os pares existem
    logger.debug(f"Validando existência dos pares. IDs: {ciclo.pares_ids}")
    pares = ciclo_avaliacao_repo.validate_pares(ciclo.pares_ids)

    if len(pares) != 4:
        logger.warning(
            f"Um ou mais pares não encontrados. Esperado: 4, Encontrado: {len(pares)}"
        )
        raise HTTPException(
            status_code=400,
            detail="Um ou mais pares selecionados não foram encontrados",
        )

    logger.debug(
        f"Todos os pares validados. Pares encontrados: {[p.nome for p in pares]}"
    )

    # Criar ciclo de avaliação com pares
    logger.info(
        f"Criando ciclo de avaliação. Ciclo ID: {ciclo.ciclo_id}, Colaborador ID: {colaborador_id}"
    )
    db_ciclo = ciclo_avaliacao_repo.create_with_pares(
        ciclo_id=ciclo.ciclo_id,
        colaborador_id=colaborador_id,
        pares_ids=ciclo.pares_ids,
    )
    logger.debug(f"Ciclo de avaliação criado no banco. ID temporário: {db_ciclo.id}")

    ciclo_avaliacao_repo.commit()
    ciclo_avaliacao_repo.refresh(db_ciclo)
    logger.info(f"Ciclo de avaliação criado com sucesso. ID: {db_ciclo.id}")
    return db_ciclo


@router.get("/", response_model=ciclo_schemas.CicloAvaliacaoListResponse)
def get_ciclos_avaliacao(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    db: Session = Depends(get_db),
):
    """Lista ciclos de avaliação do usuário logado"""
    colaborador_id = current_colaborador.id
    logger.debug(
        f"GET /ciclos-avaliacao - Listando ciclos. Filtros: colaborador_id={colaborador_id}, skip={skip}, limit={limit}"
    )

    ciclo_avaliacao_repo = CicloAvaliacaoRepository(db)

    logger.debug(f"Aplicando filtro por colaborador_id: {colaborador_id}")
    ciclos = ciclo_avaliacao_repo.get_by_colaborador(
        colaborador_id=colaborador_id, skip=skip, limit=limit
    )
    total = ciclo_avaliacao_repo.count(colaborador_id=colaborador_id)

    logger.debug(f"Total de ciclos encontrados: {total}")
    logger.debug(f"Retornando {len(ciclos)} ciclos (skip={skip}, limit={limit})")
    return {"ciclos": ciclos, "total": total}


@router.get(
    "/ativo",
    response_model=ciclo_schemas.CicloAvaliacaoResponse,
)
def get_ciclo_avaliacao_ativo(
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    db: Session = Depends(get_db),
):
    """Obtém o ciclo de avaliação ativo do usuário logado"""
    colaborador_id = current_colaborador.id
    logger.debug(
        f"GET /ciclos-avaliacao/ativo - Buscando ciclo ativo do colaborador {colaborador_id}"
    )

    ciclo_avaliacao_repo = CicloAvaliacaoRepository(db)
    ciclo = ciclo_avaliacao_repo.get_ativo_by_colaborador(colaborador_id)

    if not ciclo:
        logger.warning(
            f"Nenhum ciclo de avaliação ativo encontrado para o colaborador {colaborador_id}"
        )
        raise HTTPException(
            status_code=404,
            detail="Nenhum ciclo de avaliação ativo encontrado para este colaborador",
        )

    logger.debug(
        f"Ciclo de avaliação ativo encontrado. ID: {ciclo.id}, Colaborador ID: {ciclo.colaborador_id}"
    )
    return ciclo


@router.get("/{ciclo_id}", response_model=ciclo_schemas.CicloAvaliacaoResponse)
def get_ciclo_avaliacao(
    ciclo_id: int,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    db: Session = Depends(get_db),
):
    """Obtém um ciclo de avaliação por ID (apenas se pertencer ao usuário logado)"""
    logger.debug(f"GET /ciclos-avaliacao/{ciclo_id} - Buscando ciclo de avaliação")

    ciclo_avaliacao_repo = CicloAvaliacaoRepository(db)
    ciclo = ciclo_avaliacao_repo.get(ciclo_id)

    if not ciclo:
        logger.warning(f"Ciclo de avaliação não encontrado. ID: {ciclo_id}")
        raise HTTPException(status_code=404, detail="Ciclo de avaliação não encontrado")

    # Validar que o ciclo pertence ao colaborador logado
    if ciclo.colaborador_id != current_colaborador.id:
        logger.warning(
            f"Tentativa de buscar ciclo de outro colaborador. Ciclo ID: {ciclo_id}, Colaborador do ciclo: {ciclo.colaborador_id}, Colaborador logado: {current_colaborador.id}"
        )
        raise HTTPException(
            status_code=403,
            detail="Você só pode buscar seus próprios ciclos de avaliação",
        )

    logger.debug(
        f"Ciclo de avaliação encontrado. ID: {ciclo_id}, Colaborador ID: {ciclo.colaborador_id}, Ciclo ID: {ciclo.ciclo_id}"
    )
    return ciclo


@router.put("/{ciclo_id}", response_model=ciclo_schemas.CicloAvaliacaoResponse)
def update_ciclo_avaliacao(
    ciclo_id: int,
    ciclo_update: ciclo_schemas.CicloAvaliacaoUpdate,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    db: Session = Depends(get_db),
):
    """Atualiza os pares selecionados de um ciclo de avaliação (apenas se pertencer ao usuário logado)"""
    logger.debug(
        f"PUT /ciclos-avaliacao/{ciclo_id} - Atualizando ciclo de avaliação. Pares recebidos: {ciclo_update.pares_ids}"
    )

    ciclo_avaliacao_repo = CicloAvaliacaoRepository(db)

    # Buscar ciclo de avaliação
    db_ciclo = ciclo_avaliacao_repo.get(ciclo_id)

    if not db_ciclo:
        logger.warning(f"Ciclo de avaliação não encontrado. ID: {ciclo_id}")
        raise HTTPException(status_code=404, detail="Ciclo de avaliação não encontrado")

    # Validar que o ciclo pertence ao colaborador logado
    if db_ciclo.colaborador_id != current_colaborador.id:
        logger.warning(
            f"Tentativa de atualizar ciclo de outro colaborador. Ciclo ID: {ciclo_id}, Colaborador do ciclo: {db_ciclo.colaborador_id}, Colaborador logado: {current_colaborador.id}"
        )
        raise HTTPException(
            status_code=403,
            detail="Você só pode atualizar seus próprios ciclos de avaliação",
        )

    logger.debug(
        f"Ciclo de avaliação encontrado. ID: {db_ciclo.id}, Colaborador ID: {db_ciclo.colaborador_id}"
    )

    # Validar que foram selecionados exatamente 4 pares
    logger.debug(
        f"Validando quantidade de pares. Quantidade recebida: {len(ciclo_update.pares_ids)}"
    )
    if len(ciclo_update.pares_ids) != 4:
        logger.warning(
            f"Quantidade inválida de pares. Esperado: 4, Recebido: {len(ciclo_update.pares_ids)}"
        )
        raise HTTPException(
            status_code=400, detail="É necessário selecionar exatamente 4 pares"
        )

    # Validar que os pares existem
    logger.debug(f"Validando existência dos pares. IDs: {ciclo_update.pares_ids}")
    pares = ciclo_avaliacao_repo.validate_pares(ciclo_update.pares_ids)

    if len(pares) != 4:
        logger.warning(
            f"Um ou mais pares não encontrados. Esperado: 4, Encontrado: {len(pares)}"
        )
        raise HTTPException(
            status_code=400,
            detail="Um ou mais pares selecionados não foram encontrados",
        )

    logger.debug(
        f"Todos os pares validados. Pares encontrados: {[p.nome for p in pares]}"
    )

    # Atualizar pares selecionados
    logger.debug(f"Atualizando pares selecionados")
    db_ciclo = ciclo_avaliacao_repo.update_pares(ciclo_id, ciclo_update.pares_ids)

    ciclo_avaliacao_repo.commit()
    ciclo_avaliacao_repo.refresh(db_ciclo)
    logger.info(f"Ciclo de avaliação atualizado com sucesso. ID: {db_ciclo.id}")
    return db_ciclo
