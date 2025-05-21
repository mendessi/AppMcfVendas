from fastapi import APIRouter, Request
import logging
from typing import Dict, Any

# Configurar o logger
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("teste_cabecalhos")

# Configurar o router
router = APIRouter(tags=["Teste"])

@router.get("/teste-cabecalhos")
async def teste_cabecalhos(request: Request):
    """
    Endpoint para testar todos os cabeçalhos recebidos na requisição.
    Útil para verificar se o x-empresa-codigo está sendo enviado corretamente.
    """
    log.info("Testando todos os cabeçalhos da requisição")
    
    # Obter todos os cabeçalhos
    headers = dict(request.headers.items())
    
    # Registrar cabeçalhos importantes para debug
    log.info(f"Authorization: {headers.get('authorization', '')[:15]}...")
    log.info(f"x-empresa-codigo: {headers.get('x-empresa-codigo', 'NÃO ENCONTRADO')}")
    log.info(f"content-type: {headers.get('content-type', 'NÃO ENCONTRADO')}")
    
    # Obter cookies
    cookies = request.cookies
    
    return {
        "sucesso": True,
        "headers": headers,
        "cookies": cookies,
        "destaque": {
            "authorization_present": "authorization" in headers,
            "x_empresa_codigo": headers.get("x-empresa-codigo", "NÃO ENCONTRADO"),
        }
    }
