import logging
from typing import Optional

from app.core.security import get_current_colaborador
from app.database import get_db
from app.models.colaborador import Colaborador
from app.repositories import CicloAvaliacaoRepository
from app.schemas import ciclo_avaliacao as ciclo_schemas
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ciclos-avaliacao", tags=["ciclos-avaliacao"])


def enrich_ciclo_avaliacao_with_pares_para_avaliar(
    ciclo_avaliacao, ciclo_avaliacao_repo: CicloAvaliacaoRepository, avaliador_id: int
):
    """Enriquece o ciclo de avaliação com os pares para avaliar"""
    if not ciclo_avaliacao:
        return None

    # Buscar pares para avaliar
    pares_para_avaliar = ciclo_avaliacao_repo.get_pares_para_avaliar(
        avaliador_id=avaliador_id, ciclo_id=ciclo_avaliacao.ciclo_id
    )

    # Converter para dict e adicionar pares_para_avaliar
    from app.schemas.colaborador import ColaboradorResponse

    ciclo_dict = {
        "id": ciclo_avaliacao.id,
        "ciclo_id": ciclo_avaliacao.ciclo_id,
        "colaborador_id": ciclo_avaliacao.colaborador_id,
        "created_at": ciclo_avaliacao.created_at,
        "updated_at": ciclo_avaliacao.updated_at,
        "pares_para_avaliar": [
            ColaboradorResponse.model_validate(par) for par in pares_para_avaliar
        ],
    }

    # Adicionar relacionamentos se existirem
    if ciclo_avaliacao.ciclo:
        from app.schemas.ciclo import CicloResponse

        ciclo_dict["ciclo"] = CicloResponse.model_validate(ciclo_avaliacao.ciclo)

    if ciclo_avaliacao.colaborador:
        ciclo_dict["colaborador"] = ColaboradorResponse.model_validate(
            ciclo_avaliacao.colaborador
        )

    if ciclo_avaliacao.pares_selecionados:
        from app.schemas.ciclo_avaliacao import ParSelecionadoResponse

        ciclo_dict["pares_selecionados"] = [
            ParSelecionadoResponse.model_validate(ps)
            for ps in ciclo_avaliacao.pares_selecionados
        ]

    return ciclo_schemas.CicloAvaliacaoResponse.model_validate(ciclo_dict)


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
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    db: Session = Depends(get_db),
):
    """Lista ciclos de avaliação do usuário logado"""
    colaborador_id = current_colaborador.id
    logger.debug(
        f"GET /ciclos-avaliacao - Listando ciclos. Filtros: colaborador_id={colaborador_id}"
    )

    ciclo_avaliacao_repo = CicloAvaliacaoRepository(db)

    logger.debug(f"Aplicando filtro por colaborador_id: {colaborador_id}")
    ciclos = ciclo_avaliacao_repo.get_by_colaborador(colaborador_id=colaborador_id)

    # Carregar relacionamentos necessários
    from app.models import ciclo_avaliacao as ciclo_avaliacao_models
    from sqlalchemy.orm import joinedload

    ciclos_enriched = []
    for ciclo in ciclos:
        logger.debug(f"Buscando pares para avaliar para o ciclo {ciclo.id}")
        # Carregar relacionamentos
        ciclo_completo = (
            db.query(ciclo_avaliacao_models.CicloAvaliacao)
            .options(
                joinedload(ciclo_avaliacao_models.CicloAvaliacao.ciclo),
                joinedload(ciclo_avaliacao_models.CicloAvaliacao.colaborador),
                joinedload(
                    ciclo_avaliacao_models.CicloAvaliacao.pares_selecionados
                ).joinedload(ciclo_avaliacao_models.ParSelecionado.par),
            )
            .filter(ciclo_avaliacao_models.CicloAvaliacao.id == ciclo.id)
            .first()
        )
        ciclo_enriched = enrich_ciclo_avaliacao_with_pares_para_avaliar(
            ciclo_completo, ciclo_avaliacao_repo, colaborador_id
        )
        if ciclo_enriched:
            ciclos_enriched.append(ciclo_enriched)

    logger.debug(f"Retornando {len(ciclos_enriched)} ciclos")
    return {"ciclos": ciclos_enriched, "total": len(ciclos_enriched)}


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

    # Carregar relacionamentos necessários
    from app.models import ciclo_avaliacao as ciclo_avaliacao_models
    from sqlalchemy.orm import joinedload

    ciclo_completo = (
        db.query(ciclo_avaliacao_models.CicloAvaliacao)
        .options(
            joinedload(ciclo_avaliacao_models.CicloAvaliacao.ciclo),
            joinedload(ciclo_avaliacao_models.CicloAvaliacao.colaborador),
            joinedload(
                ciclo_avaliacao_models.CicloAvaliacao.pares_selecionados
            ).joinedload(ciclo_avaliacao_models.ParSelecionado.par),
        )
        .filter(ciclo_avaliacao_models.CicloAvaliacao.id == ciclo.id)
        .first()
    )

    logger.debug(
        f"Ciclo de avaliação ativo encontrado. ID: {ciclo.id}, Colaborador ID: {ciclo.colaborador_id}"
    )

    ciclo_enriched = enrich_ciclo_avaliacao_with_pares_para_avaliar(
        ciclo_completo, ciclo_avaliacao_repo, colaborador_id
    )
    return ciclo_enriched


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

    # Buscar ciclo de avaliação com relacionamento ciclo carregado
    from app.models import ciclo_avaliacao as ciclo_avaliacao_models
    from sqlalchemy.orm import joinedload

    db_ciclo = (
        db.query(ciclo_avaliacao_models.CicloAvaliacao)
        .options(joinedload(ciclo_avaliacao_models.CicloAvaliacao.ciclo))
        .filter(ciclo_avaliacao_models.CicloAvaliacao.id == ciclo_id)
        .first()
    )

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

    # Verificar se o ciclo está na etapa de aprovação de pares
    # Durante esta etapa, colaboradores não podem alterar seus pares
    from app.models import ciclo as ciclo_models

    ciclo_obj = db_ciclo.ciclo
    if ciclo_obj and ciclo_obj.etapa_atual == ciclo_models.EtapaCiclo.APROVACAO_PARES:
        logger.warning(
            f"Tentativa de atualizar pares durante etapa de aprovação. Ciclo ID: {ciclo_id}, Etapa: {ciclo_obj.etapa_atual}"
        )
        raise HTTPException(
            status_code=403,
            detail="Não é possível alterar os pares durante a etapa de aprovação de pares. Aguarde a aprovação do gestor.",
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


@router.get(
    "/gestor/liderados",
    response_model=ciclo_schemas.CicloAvaliacaoListResponse,
)
def get_ciclos_avaliacao_liderados(
    ciclo_id: int = Query(..., description="ID do ciclo"),
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    db: Session = Depends(get_db),
):
    """Lista ciclos de avaliação dos liderados do gestor logado para um ciclo específico"""
    logger.debug(
        f"GET /ciclos-avaliacao/gestor/liderados - Listando ciclos dos liderados. Gestor ID: {current_colaborador.id}, Ciclo ID: {ciclo_id}"
    )

    ciclo_avaliacao_repo = CicloAvaliacaoRepository(db)

    # Buscar liderados do gestor
    liderados = (
        db.query(Colaborador)
        .filter(Colaborador.gestor_id == current_colaborador.id)
        .filter(Colaborador.is_active == True)
        .all()
    )

    if not liderados:
        logger.debug(
            f"Nenhum liderado encontrado para o gestor {current_colaborador.id}"
        )
        return {"ciclos": [], "total": 0}

    liderados_ids = [sub.id for sub in liderados]
    logger.debug(f"Liderados encontrados: {len(liderados_ids)}. IDs: {liderados_ids}")

    # Buscar ciclos de avaliação dos liderados para o ciclo especificado
    from app.models import ciclo_avaliacao as ciclo_avaliacao_models
    from sqlalchemy.orm import joinedload

    ciclos = (
        db.query(ciclo_avaliacao_models.CicloAvaliacao)
        .options(
            joinedload(ciclo_avaliacao_models.CicloAvaliacao.colaborador),
            joinedload(
                ciclo_avaliacao_models.CicloAvaliacao.pares_selecionados
            ).joinedload(ciclo_avaliacao_models.ParSelecionado.par),
        )
        .filter(ciclo_avaliacao_models.CicloAvaliacao.ciclo_id == ciclo_id)
        .filter(ciclo_avaliacao_models.CicloAvaliacao.colaborador_id.in_(liderados_ids))
        .all()
    )

    total = len(ciclos)
    logger.debug(f"Total de ciclos de avaliação encontrados: {total}")

    return {"ciclos": ciclos, "total": total}


@router.put(
    "/gestor/{ciclo_avaliacao_id}/pares",
    response_model=ciclo_schemas.CicloAvaliacaoResponse,
)
def update_pares_liderado(
    ciclo_avaliacao_id: int,
    ciclo_update: ciclo_schemas.CicloAvaliacaoUpdate,
    current_colaborador: Colaborador = Depends(get_current_colaborador),
    db: Session = Depends(get_db),
):
    """Permite que um gestor atualize os pares selecionados de um liderado"""
    logger.debug(
        f"PUT /ciclos-avaliacao/gestor/{ciclo_avaliacao_id}/pares - Gestor atualizando pares do liderado. Gestor ID: {current_colaborador.id}, Pares recebidos: {ciclo_update.pares_ids}"
    )

    ciclo_avaliacao_repo = CicloAvaliacaoRepository(db)

    # Buscar ciclo de avaliação
    db_ciclo = ciclo_avaliacao_repo.get(ciclo_avaliacao_id)

    if not db_ciclo:
        logger.warning(f"Ciclo de avaliação não encontrado. ID: {ciclo_avaliacao_id}")
        raise HTTPException(status_code=404, detail="Ciclo de avaliação não encontrado")

    # Verificar se o colaborador do ciclo é liderado do gestor
    liderado = (
        db.query(Colaborador)
        .filter(Colaborador.id == db_ciclo.colaborador_id)
        .filter(Colaborador.gestor_id == current_colaborador.id)
        .first()
    )

    if not liderado:
        logger.warning(
            f"Tentativa de atualizar pares de colaborador que não é liderado. Ciclo ID: {ciclo_avaliacao_id}, Colaborador do ciclo: {db_ciclo.colaborador_id}, Gestor: {current_colaborador.id}"
        )
        raise HTTPException(
            status_code=403,
            detail="Você só pode atualizar pares dos seus liderados",
        )

    logger.debug(
        f"Ciclo de avaliação encontrado. ID: {db_ciclo.id}, Colaborador ID: {db_ciclo.colaborador_id}, Nome: {liderado.nome}"
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
    db_ciclo = ciclo_avaliacao_repo.update_pares(
        ciclo_avaliacao_id, ciclo_update.pares_ids
    )

    ciclo_avaliacao_repo.commit()
    ciclo_avaliacao_repo.refresh(db_ciclo)
    logger.info(
        f"Ciclo de avaliação atualizado com sucesso pelo gestor. ID: {db_ciclo.id}"
    )
    return db_ciclo
