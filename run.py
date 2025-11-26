#!/usr/bin/env python
"""
Script para iniciar o servidor backend FastAPI
"""
import os
import subprocess
import sys


def main():
    """Inicia o servidor backend usando uvicorn"""
    # Obter o diretório raiz do projeto
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(script_dir, "backend")

    # Verificar se o diretório backend existe
    if not os.path.exists(backend_dir):
        print(f"❌ Erro: Diretório 'backend' não encontrado em {script_dir}")
        sys.exit(1)

    # Mudar para o diretório backend (onde o código espera estar)
    os.chdir(backend_dir)

    # Comando para iniciar o servidor
    # Usamos 'app.main:app' porque estamos no diretório backend
    cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--reload",
        "--host",
        "0.0.0.0",
        "--port",
        "8000",
    ]

    print("🚀 Iniciando servidor backend...")
    print(f"📡 Servidor disponível em: http://localhost:8000")
    print(f"📚 Documentação disponível em: http://localhost:8000/docs")
    print("Press CTRL+C to stop\n")

    try:
        subprocess.run(cmd, check=True)
    except KeyboardInterrupt:
        print("\n\n👋 Servidor encerrado pelo usuário")
        sys.exit(0)
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Erro ao iniciar servidor: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
