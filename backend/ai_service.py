from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging
from ai_manager import AIManager

# Configuração de logging
logger = logging.getLogger(__name__)

# Criar router para endpoints de IA
router = APIRouter(prefix="/api/ai", tags=["IA"])

# Instância do AIManager
ai_manager = AIManager()

# Modelo da requisição
class PerguntaRequest(BaseModel):
    pergunta: str

@router.post("/generate")
async def gerar_resposta(payload: PerguntaRequest, request: Request):
    """
    Endpoint para gerar respostas usando a IA.
    """
    try:
        logger.info(f"Recebida pergunta: {payload.pergunta}")
        
        # Validação dos headers
        auth_header = request.headers.get('Authorization')
        empresa_codigo = request.headers.get('x-empresa-codigo')

        if not auth_header:
            raise HTTPException(
                status_code=401,
                detail="Token de autenticação não fornecido"
            )

        if not empresa_codigo:
            raise HTTPException(
                status_code=400,
                detail="Código da empresa não fornecido"
            )

        # Gera a resposta usando o AIManager
        resposta = await ai_manager.generate_response(payload.pergunta, request)
        logger.info(f"Resposta gerada: {resposta}")
        
        return resposta

    except Exception as e:
        logger.error(f"Erro ao gerar resposta: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar pergunta: {str(e)}"
        ) 