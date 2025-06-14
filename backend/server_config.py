from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Criar pool de threads para operações bloqueantes
thread_pool = ThreadPoolExecutor(max_workers=10)

def create_app() -> FastAPI:
    app = FastAPI()
    
    # Configurar CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Configurar timeout global para operações assíncronas
    @app.middleware("http")
    async def timeout_middleware(request, call_next):
        try:
            # Timeout de 10 segundos para todas as requisições
            return await asyncio.wait_for(call_next(request), timeout=10.0)
        except asyncio.TimeoutError:
            logger.error(f"Timeout na requisição para {request.url}")
            return JSONResponse(
                status_code=504,
                content={"detail": "A requisição excedeu o tempo limite"}
            )
    
    return app

def run_server():
    config = uvicorn.Config(
        "main:app",
        host="0.0.0.0",
        port=8000,
        workers=4,  # Usar múltiplos workers para melhor concorrência
        loop="uvloop",  # Usar uvloop para melhor performance
        http="httptools",  # Usar httptools para melhor performance
        timeout_keep_alive=5,  # Manter conexões vivas por 5 segundos
        timeout_graceful_shutdown=5,  # Dar 5 segundos para conexões fecharem
        limit_concurrency=100,  # Limitar número de conexões concorrentes
        backlog=2048,  # Aumentar backlog de conexões
    )
    server = uvicorn.Server(config)
    server.run() 