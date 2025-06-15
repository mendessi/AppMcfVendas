from fastapi import APIRouter, Request, Response
from typing import Dict, Any, List
import platform
import socket
import sys
import os
import logging
from datetime import datetime

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Criar o router para testes externos
router = APIRouter(tags=["External Tests"])

@router.get("/teste-externo", response_model=Dict[str, Any])
async def teste_acesso_externo(request: Request):
    """
    Endpoint simples para testar o acesso externo à API.
    Não requer autenticação e retorna informações básicas do servidor.
    """
    logger.info(f"Requisição de teste externo recebida. Cliente: {request.client}")
    
    # Coletar informações para diagnóstico
    info = {
        "timestamp": datetime.now().isoformat(),
        "servidor": {
            "sistema": platform.system(),
            "versao": platform.version(),
            "python": sys.version.split()[0],
            "hostname": socket.gethostname(),
        },
        "cliente": {
            "ip": request.client.host if request.client else "desconhecido",
            "user_agent": request.headers.get("user-agent", "desconhecido"),
            "origem": request.headers.get("origin", "desconhecida"),
            "mobile": request.headers.get("x-mobile-device") == "true"
        },
        "headers": {k: v for k, v in request.headers.items() if k.lower() not in ["authorization", "cookie"]},
        "status": "OK"
    }
    
    # Criar resposta com os cabeçalhos CORS necessários
    response = Response(
        content=str(info),
        media_type="text/plain"
    )
    
    # Adicionar cabeçalhos CORS
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, x-empresa-codigo, x-external-access, x-mobile-device"
    
    return response

@router.get("/ping")
async def ping():
    """
    Endpoint extremamente simples apenas para verificar se a API está online.
    """
    return {"ping": "pong", "timestamp": datetime.now().isoformat()}

@router.options("/teste-externo")
async def options_teste_externo(request: Request):
    """
    Handler para requisições OPTIONS para o endpoint teste-externo.
    Necessário para o CORS funcionar adequadamente.
    """
    response = Response()
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, x-empresa-codigo, x-external-access, x-mobile-device"
    return response
