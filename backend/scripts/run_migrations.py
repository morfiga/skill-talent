#!/usr/bin/env python3
"""
Script auxiliar para executar migrations do Alembic.
Uso: python scripts/run_migrations.py [upgrade|downgrade|revision|history]
"""
import sys
import os
from pathlib import Path

# Adicionar o diretório raiz ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from alembic.config import Config
from alembic import command


def run_migrations(action: str = "upgrade", revision: str = "head"):
    """Executa migrations do Alembic"""
    alembic_cfg = Config(str(backend_dir / "alembic.ini"))
    
    if action == "upgrade":
        print(f"🔄 Aplicando migrations até {revision}...")
        command.upgrade(alembic_cfg, revision)
        print("✅ Migrations aplicadas com sucesso!")
    
    elif action == "downgrade":
        print(f"⬇️ Revertendo migrations até {revision}...")
        command.downgrade(alembic_cfg, revision)
        print("✅ Migrations revertidas com sucesso!")
    
    elif action == "revision":
        print("📝 Criando nova migration...")
        message = input("Mensagem da migration: ") or "auto migration"
        command.revision(alembic_cfg, autogenerate=True, message=message)
        print("✅ Migration criada com sucesso!")
    
    elif action == "history":
        print("📜 Histórico de migrations:")
        command.history(alembic_cfg)
    
    elif action == "current":
        print("📍 Migration atual:")
        command.current(alembic_cfg)
    
    else:
        print(f"❌ Ação '{action}' não reconhecida.")
        print("Ações disponíveis: upgrade, downgrade, revision, history, current")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python scripts/run_migrations.py [upgrade|downgrade|revision|history|current] [revision]")
        print("\nExemplos:")
        print("  python scripts/run_migrations.py upgrade          # Aplica todas as migrations")
        print("  python scripts/run_migrations.py upgrade +1       # Aplica próxima migration")
        print("  python scripts/run_migrations.py downgrade -1      # Reverte última migration")
        print("  python scripts/run_migrations.py revision          # Cria nova migration")
        print("  python scripts/run_migrations.py history          # Mostra histórico")
        print("  python scripts/run_migrations.py current          # Mostra migration atual")
        sys.exit(1)
    
    action = sys.argv[1]
    revision = sys.argv[2] if len(sys.argv) > 2 else "head"
    
    run_migrations(action, revision)

