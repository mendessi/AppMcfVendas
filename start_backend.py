import sys
import os
import uvicorn

# Adicionar o diretório backend ao path do Python
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.insert(0, backend_path)

# Mudar para o diretório backend
os.chdir(backend_path)

if __name__ == "__main__":
    # Importar a aplicação depois de configurar o path
    from main import app
    
    # Executar o servidor
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        reload_dirs=[backend_path]
    ) 