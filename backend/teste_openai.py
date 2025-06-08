import os
from config import OPENAI_API_KEY
import logging

# Definindo a variável de ambiente para a chave da API
os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY

from openai import OpenAI
print(f"Módulo openai importado de: {OpenAI.__module__}")

# Configuração de logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def test_openai_connection():
    try:
        logger.info("Iniciando teste de conexão com OpenAI")
        logger.info(f"Chave da API: {OPENAI_API_KEY[:10]}...")
        
        client = OpenAI(api_key=OPENAI_API_KEY)
        
        # Testa a conexão com uma chamada simples
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Olá, este é um teste."}],
            max_tokens=5
        )
        
        logger.info("Conexão bem sucedida!")
        logger.info(f"Resposta: {response.choices[0].message.content}")
        return True
        
    except Exception as e:
        logger.error(f"Erro ao conectar com OpenAI: {str(e)}")
        return False

if __name__ == "__main__":
    test_openai_connection() 