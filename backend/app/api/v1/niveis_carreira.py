from typing import Dict, List

from app.core.exceptions import NotFoundException
from app.core.validators import NIVEIS_CARREIRA_VALIDOS
from fastapi import APIRouter

router = APIRouter(prefix="/niveis-carreira", tags=["niveis-carreira"])

# Níveis esperados por nível de carreira para cada eixo
# Formato: [Desenvolvimento contínuo, Influência, Operação e processos, Impacto]
NIVEIS_ESPERADOS_POR_CARREIRA: Dict[str, List[int]] = {
    "E": [1, 1, 1, 1],
    "J1": [1, 1, 1, 1],
    "J2": [2, 1, 2, 1],
    "J3": [2, 2, 2, 2],
    "P1": [3, 2, 3, 2],
    "P2": [3, 2, 3, 3],
    "P3": [4, 2, 4, 3],
    "S1": [4, 3, 4, 3],
    "S2": [4, 3, 4, 4],
    "S3": [5, 3, 5, 4],
    "ES1": [5, 4, 5, 4],
    "ES2": [5, 4, 5, 4],
}


@router.get("/")
def get_niveis_esperados():
    """Retorna os níveis esperados por nível de carreira"""
    return NIVEIS_ESPERADOS_POR_CARREIRA


@router.get("/{nivel_carreira}")
def get_niveis_esperados_por_carreira(nivel_carreira: str):
    """Retorna os níveis esperados para um nível de carreira específico"""
    if nivel_carreira not in NIVEIS_ESPERADOS_POR_CARREIRA:
        raise NotFoundException(
            f"Nível de carreira '{nivel_carreira}'",
            identifier=f"Valores válidos: {', '.join(NIVEIS_CARREIRA_VALIDOS)}",
        )

    return {
        "nivel_carreira": nivel_carreira,
        "niveis_esperados": NIVEIS_ESPERADOS_POR_CARREIRA[nivel_carreira],
    }
