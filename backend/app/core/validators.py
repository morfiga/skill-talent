"""
Validadores centralizados para uso em schemas e services.

Este módulo contém funções de validação reutilizáveis que podem ser
usadas tanto em schemas Pydantic quanto em services.
"""

import re
from typing import List, Optional

from app.core.exceptions import ValidationException

# =============================================================================
# Constantes de Validação
# =============================================================================

# Níveis de carreira válidos
NIVEIS_CARREIRA_VALIDOS = [
    "E",
    "J1",
    "J2",
    "J3",
    "P1",
    "P2",
    "P3",
    "S1",
    "S2",
    "S3",
    "ES1",
    "ES2",
]

# Pattern regex para nível de carreira
NIVEL_CARREIRA_PATTERN = r"^(E|J[1-3]|P[1-3]|S[1-3]|ES[1-2])$"

# Número exato de pares que devem ser selecionados
NUMERO_PARES_OBRIGATORIO = 4

# Limites de tamanho de campos
CAMPO_NOME_MIN = 2
CAMPO_NOME_MAX = 100
CAMPO_TEXTO_MAX = 500
CAMPO_TEXTO_LONGO_MAX = 10000
CAMPO_CODIGO_MAX = 50


# =============================================================================
# Validadores de Campos
# =============================================================================


def validate_nivel_carreira(nivel: Optional[str]) -> Optional[str]:
    """
    Valida se o nível de carreira é válido.

    Args:
        nivel: Nível de carreira a ser validado

    Returns:
        O nível validado ou None se não fornecido

    Raises:
        ValueError: Se o nível não for válido
    """
    if nivel is None:
        return None

    if nivel not in NIVEIS_CARREIRA_VALIDOS:
        raise ValueError(
            f"Nível de carreira inválido. Valores aceitos: {', '.join(NIVEIS_CARREIRA_VALIDOS)}"
        )
    return nivel


def validate_pares_ids(pares_ids: List[int]) -> List[int]:
    """
    Valida a lista de IDs de pares selecionados.

    Args:
        pares_ids: Lista de IDs dos pares

    Returns:
        A lista validada

    Raises:
        ValueError: Se a lista não atender aos requisitos
    """
    if len(pares_ids) != len(set(pares_ids)):
        raise ValueError("Os pares selecionados devem ser únicos")

    if any(p <= 0 for p in pares_ids):
        raise ValueError("IDs de pares devem ser números positivos")

    return pares_ids


def validate_nome(nome: str) -> str:
    """
    Valida o campo nome.

    Args:
        nome: Nome a ser validado

    Returns:
        O nome validado (stripped)

    Raises:
        ValueError: Se o nome não atender aos requisitos
    """
    nome = nome.strip()

    if len(nome) < CAMPO_NOME_MIN:
        raise ValueError(f"Nome deve ter pelo menos {CAMPO_NOME_MIN} caracteres")

    if len(nome) > CAMPO_NOME_MAX:
        raise ValueError(f"Nome deve ter no máximo {CAMPO_NOME_MAX} caracteres")

    return nome


def validate_texto_obrigatorio(
    texto: str, campo: str, max_length: int = CAMPO_TEXTO_MAX
) -> str:
    """
    Valida um campo de texto obrigatório.

    Args:
        texto: Texto a ser validado
        campo: Nome do campo para mensagem de erro
        max_length: Tamanho máximo permitido

    Returns:
        O texto validado (stripped)

    Raises:
        ValueError: Se o texto não atender aos requisitos
    """
    texto = texto.strip()

    if not texto:
        raise ValueError(f"{campo} é obrigatório")

    if len(texto) > max_length:
        raise ValueError(f"{campo} deve ter no máximo {max_length} caracteres")

    return texto


def validate_texto_opcional(
    texto: Optional[str], campo: str, max_length: int = CAMPO_TEXTO_MAX
) -> Optional[str]:
    """
    Valida um campo de texto opcional.

    Args:
        texto: Texto a ser validado
        campo: Nome do campo para mensagem de erro
        max_length: Tamanho máximo permitido

    Returns:
        O texto validado (stripped) ou None

    Raises:
        ValueError: Se o texto exceder o tamanho máximo
    """
    if texto is None:
        return None

    texto = texto.strip()

    if len(texto) > max_length:
        raise ValueError(f"{campo} deve ter no máximo {max_length} caracteres")

    return texto if texto else None


# =============================================================================
# Validadores de Negócio (para uso em Services)
# =============================================================================


def validate_pares_existem(pares_encontrados: int, pares_solicitados: int) -> None:
    """
    Valida se todos os pares solicitados foram encontrados no banco.

    Args:
        pares_encontrados: Quantidade de pares encontrados
        pares_solicitados: Quantidade de pares solicitados

    Raises:
        ValidationException: Se nem todos os pares foram encontrados
    """
    if pares_encontrados != pares_solicitados:
        raise ValidationException(
            f"Um ou mais pares não encontrados. Esperado: {pares_solicitados}, Encontrado: {pares_encontrados}",
            field="pares_ids",
        )


def validate_numero_pares(pares_ids: List[int]) -> None:
    """
    Valida se o número de pares é exatamente 4.

    Args:
        pares_ids: Lista de IDs dos pares

    Raises:
        ValidationException: Se não forem exatamente 4 pares
    """
    if len(pares_ids) != NUMERO_PARES_OBRIGATORIO:
        raise ValidationException(
            f"É necessário selecionar exatamente {NUMERO_PARES_OBRIGATORIO} pares",
            field="pares_ids",
        )
