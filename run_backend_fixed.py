#!/usr/bin/env python3
"""
Script para inicializar o backend da API
Resolve problemas de importação do módulo 'backend'
"""
import sys
import os
import subprocess
from pathlib import Path

def main():
    # Obter o diretório do projeto
    project_root = Path(__file__).parent.absolute()
    backend_dir = project_root / 'backend'
    
    print(f"🏠 Diretório do projeto: {project_root}")
    print(f"📁 Diretório do backend: {backend_dir}")
    
    # Verificar se a pasta backend existe
    if not backend_dir.exists():
        print("❌ ERRO: Pasta 'backend' não encontrada!")
        print(f"   Procurado em: {backend_dir}")
        return 1
    
    # Verificar se o main.py existe
    main_py = backend_dir / 'main.py'
    if not main_py.exists():
        print("❌ ERRO: Arquivo 'backend/main.py' não encontrado!")
        return 1
    
    print("✅ Arquivos verificados com sucesso!")
    print()
    
    # Mudar para o diretório backend
    os.chdir(backend_dir)
    print(f"📂 Mudando para diretório: {backend_dir}")
    
    # Adicionar o diretório backend ao PYTHONPATH
    env = os.environ.copy()
    pythonpath = env.get('PYTHONPATH', '')
    if pythonpath:
        env['PYTHONPATH'] = f"{backend_dir}{os.pathsep}{pythonpath}"
    else:
        env['PYTHONPATH'] = str(backend_dir)
    
    print("🐍 Configurando PYTHONPATH...")
    print(f"   PYTHONPATH: {env['PYTHONPATH']}")
    print()
    
    # Executar uvicorn diretamente no main.py
    cmd = [
        sys.executable, '-m', 'uvicorn',
        'main:app',
        '--host', '0.0.0.0',
        '--port', '8000',
        '--reload'
    ]
    
    print("🚀 Executando comando:")
    print(f"   {' '.join(cmd)}")
    print(f"   Diretório de trabalho: {os.getcwd()}")
    print()
    print("🌐 Servidor será iniciado em: http://localhost:8000")
    print("🛑 Para parar o servidor, pressione Ctrl+C")
    print("=" * 50)
    print()
    
    try:
        # Executar o uvicorn
        result = subprocess.run(cmd, env=env, cwd=backend_dir)
        return result.returncode
    except KeyboardInterrupt:
        print("\n🛑 Servidor interrompido pelo usuário")
        return 0
    except Exception as e:
        print(f"\n❌ Erro ao executar o servidor: {e}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code) 