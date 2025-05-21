from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

def setup_cors(app: FastAPI):
    """
    Configuração robusta de CORS para permitir requisições do frontend
    """
    # Lista de origens permitidas
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]
    
    # Adicione o middleware CORS padrão do FastAPI
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

class CORSMiddlewareManual(BaseHTTPMiddleware):
    """
    Middleware manual para garantir que os cabeçalhos CORS sejam adicionados
    a todas as respostas, incluindo respostas de erro
    """
    async def dispatch(self, request: Request, call_next):
        # Para solicitações OPTIONS (preflight), responda imediatamente
        if request.method == "OPTIONS":
            headers = {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age": "86400",  # 24 horas
            }
            return Response(status_code=200, headers=headers)
            
        # Para outras solicitações, chame o próximo middleware e adicione cabeçalhos CORS à resposta
        response = await call_next(request)
        
        origin = request.headers.get("origin", "*")
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        
        return response
