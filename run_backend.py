#!/usr/bin/env python3
import sys
import os

# Garantir que estamos no diretório correto
project_root = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(project_root, 'backend')

# Adicionar os caminhos necessários ao Python path
sys.path.insert(0, project_root)
sys.path.insert(0, backend_path)

# Mudar para o diretório do backend
os.chdir(backend_path)

# Agora importar e executar
if __name__ == "__main__":
    import uvicorn
    
    # Executar o uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[backend_path]
    ) 