"""
Script para criar o ciclo inicial aberto
Execute este script após criar a tabela ciclos
"""
from datetime import datetime, timedelta

from app.database import SessionLocal
from app.models.ciclo import Ciclo, StatusCiclo


def create_initial_cycle():
    """Cria um ciclo inicial aberto"""
    db = SessionLocal()
    try:
        # Verificar se já existe um ciclo aberto
        existing_cycle = (
            db.query(Ciclo)
            .filter(Ciclo.status == StatusCiclo.ABERTO)
            .first()
        )

        if existing_cycle:
            print(f"Ciclo aberto já existe: {existing_cycle.nome} (ID: {existing_cycle.id})")
            return existing_cycle

        # Criar novo ciclo aberto
        ciclo = Ciclo(
            nome="Ciclo 2024",
            status=StatusCiclo.ABERTO,
            data_inicio=datetime.utcnow(),
            data_fim=datetime.utcnow() + timedelta(days=90),  # 90 dias a partir de hoje
        )

        db.add(ciclo)
        db.commit()
        db.refresh(ciclo)

        print(f"Ciclo inicial criado com sucesso: {ciclo.nome} (ID: {ciclo.id})")
        return ciclo

    except Exception as e:
        db.rollback()
        print(f"Erro ao criar ciclo inicial: {str(e)}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_initial_cycle()

