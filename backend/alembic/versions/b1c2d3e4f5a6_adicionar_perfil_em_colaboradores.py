"""adicionar perfil em colaboradores

Revision ID: b1c2d3e4f5a6
Revises: 9d96c2094637
Create Date: 2026-06-30 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "9d96c2094637"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "colaboradores",
        sa.Column(
            "perfil",
            sa.String(length=20),
            nullable=False,
            server_default="colaborador",
        ),
    )
    # Backfill: quem já lidera hoje (é gestor de alguém) passa a perfil 'gestor'.
    # Preserva o comportamento atual; o admin reclassifica manualmente quem for líder.
    op.execute(
        """
        UPDATE colaboradores SET perfil = 'gestor'
        WHERE id IN (
            SELECT gestor_id FROM (
                SELECT DISTINCT gestor_id FROM colaboradores WHERE gestor_id IS NOT NULL
            ) AS gestores
        )
        """
    )


def downgrade() -> None:
    op.drop_column("colaboradores", "perfil")
