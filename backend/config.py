from pydantic_settings import BaseSettings
from functools import lru_cache
import os
import sys
from typing import Optional

# Adiciona o diretório raiz ao path para acessar o .env
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class Settings(BaseSettings):
    # Configurações do banco de dados
    db_host: str = "149.56.77.81"
    db_port: int = 3050
    db_path: str = "C:\\MCFIN"  # Caminho padrão
    db_name: str = "BASE_PRI.GDB"
    db_user: str = "SYSDBA"
    db_password: str = "masterkey"
    db_charset: str = "ISO8859_1"
    
    # Configurações do Pool de Conexões
    db_pool_min_size: int = 1
    db_pool_max_size: int = 5
    db_pool_timeout: int = 30  # segundos
    
    # Configurações da API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # Configurações de CORS
    cors_origins: list = ["*"]
    
    # Chave secreta para JWT
    secret_key: str = "sua-chave-secreta-aqui-mude-isso"
    
    # Configurações de Log
    log_level: str = "INFO"
    
    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
        env_file_encoding = "utf-8"
    
    @property
    def dsn(self) -> str:
        """Retorna a string de conexão formatada"""
        return f"{self.db_host}/{self.db_port}:{os.path.join(self.db_path, self.db_name)}"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
