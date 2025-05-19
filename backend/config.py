from pydantic_settings import BaseSettings
from functools import lru_cache
import os
import sys

# Adiciona o diretório raiz ao path para acessar o .env
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class Settings(BaseSettings):
    # Configurações do banco de dados
    db_host: str = "localhost"
    db_path: str = "C:\\ERP_MACFIN\\Banco\\Erinalda\\BASE_PRI.GDB"  # Caminho padrão
    db_user: str = "SYSDBA"
    db_password: str = "masterkey"
    db_charset: str = "ISO8859_1"  # Charset usado no conexao_firebird.py
    
    # Configurações da API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # Configurações de CORS
    cors_origins: list = ["*"]
    
    # Chave secreta para JWT
    secret_key: str = "sua-chave-secreta-aqui-mude-isso"
    
    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings():
    return Settings()
