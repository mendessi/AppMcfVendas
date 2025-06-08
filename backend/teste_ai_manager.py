import asyncio
from ai_manager import AIManager
import logging

# Configuração de logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

async def test_ai_manager():
    try:
        logger.info("Iniciando teste do AIManager")
        
        # Inicializa o AIManager
        ai = AIManager()
        
        # Testa a geração de resposta
        response = await ai.generate_response("Olá, como posso ajudar?")
        
        logger.info("Teste concluído com sucesso!")
        logger.info(f"Resposta: {response}")
        
    except Exception as e:
        logger.error(f"Erro durante o teste: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_ai_manager()) 