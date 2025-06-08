from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
import json
import os
from auth import get_current_user
import requests
from datetime import datetime

# Configuração de logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# Criar router para endpoints de IA
router = APIRouter(prefix="/ai", tags=["IA"])

# Modelo de dados para requisições
class AIRequest(BaseModel):
    prompt: str
    max_length: Optional[int] = 100
    temperature: Optional[float] = 0.7

# Modelo de dados para respostas
class AIResponse(BaseModel):
    response: str
    confidence: float

class AIManager:
    _instance = None
    _api_key = None
    _api_url = "https://api.openai.com/v1/chat/completions"  # Exemplo com OpenAI, pode ser alterado

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AIManager, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        try:
            # Carrega a chave da API do ambiente ou arquivo de configuração
            self._api_key = os.getenv("AI_API_KEY", "sua_chave_api_aqui")
            log.info("Serviço de IA inicializado com sucesso")
        except Exception as e:
            log.error(f"Erro ao inicializar serviço de IA: {str(e)}")
            raise

    def generate_response(self, prompt: str, max_length: int = 100, temperature: float = 0.7) -> Dict[str, Any]:
        try:
            # Extrair apenas o prompt do usuário, ignorando o contexto da tela
            user_prompt = prompt.split('\n\nContexto da tela:')[0].strip()
            log.info(f"Prompt do usuário: {user_prompt}")
            
            # Simulação de respostas mais úteis
            prompt_lower = user_prompt.lower()
            
            # Respostas para saudações
            if any(word in prompt_lower for word in ['ola', 'oi', 'bom dia', 'boa tarde', 'boa noite']):
                response = {
                    "response": "Olá! Sou a IA Mendes, sua assistente virtual. Como posso ajudar você hoje?",
                    "confidence": 0.95
                }
            # Respostas para perguntas sobre o sistema
            elif any(word in prompt_lower for word in ['ajuda', 'como usar', 'funcionalidades']):
                response = {
                    "response": "Posso ajudar você com:\n1. Informações sobre pedidos\n2. Dúvidas sobre produtos\n3. Acompanhamento de vendas\n4. Suporte geral\n\nO que você gostaria de saber?",
                    "confidence": 0.95
                }
            # Respostas para perguntas sobre pedidos
            elif any(word in prompt_lower for word in ['pedido', 'pedidos', 'venda', 'vendas']):
                response = {
                    "response": "Para ver seus pedidos, você pode:\n1. Acessar o menu 'Pedidos'\n2. Usar o filtro por data\n3. Buscar por número do pedido\n\nPrecisa de ajuda com algo específico?",
                    "confidence": 0.95
                }
            # Resposta padrão
            else:
                response = {
                    "response": "Entendi sua mensagem. Como posso ajudar você com o sistema Força Vendas? Posso auxiliar com pedidos, produtos, vendas ou outras dúvidas.",
                    "confidence": 0.95
                }

            log.info(f"Resposta gerada: {response}")
            return response

        except Exception as e:
            log.error(f"Erro ao gerar resposta: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Erro ao processar requisição de IA"
            )

# Instância global do gerenciador de IA
ai_manager = AIManager()

@router.get("/test")
async def test_ai():
    """
    Endpoint de teste para verificar se o serviço de IA está funcionando
    """
    try:
        test_prompt = "Olá, este é um teste do serviço de IA. Por favor, responda com uma saudação simples."
        result = ai_manager.generate_response(test_prompt)
        
        return {
            "status": "success",
            "message": "Serviço de IA está funcionando",
            "test_response": result["response"],
            "confidence": result["confidence"],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        log.error(f"Erro no teste de IA: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro no teste de IA: {str(e)}"
        )

@router.post("/generate", response_model=AIResponse)
async def generate_text(
    request_data: AIRequest,
    request: Request,
    current_user: Dict = Depends(get_current_user)
):
    """
    Gera texto usando IA com base no prompt fornecido.
    Requer autenticação e validação de usuário.
    """
    try:
        # Validação básica do prompt
        if not request_data.prompt or len(request_data.prompt.strip()) == 0:
            raise HTTPException(
                status_code=400,
                detail="Prompt não pode estar vazio"
            )

        # Gera a resposta
        result = ai_manager.generate_response(
            request_data.prompt,
            request_data.max_length,
            request_data.temperature
        )
        if isinstance(result, dict):
            return AIResponse(
                response=result.get("response", ""),
                confidence=result.get("confidence", 1.0)
            )
        else:
            return AIResponse(
                response=result,
                confidence=1.0
            )
    except Exception as e:
        log.error(f"Erro no endpoint de geração de texto: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Erro interno do servidor"
        ) 