from pydantic_settings import BaseSettings
from functools import lru_cache
import os
import sys
from typing import Optional
from dotenv import load_dotenv

# Adiciona o diretório raiz ao path para acessar o .env
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Carrega variáveis de ambiente
load_dotenv()

# Configurações gerais
API_VERSION = "1.0.0"
DEBUG = True

# Configurações do banco de dados
DB_USER = os.getenv("DB_USER", "SYSDBA")
DB_PASSWORD = os.getenv("DB_PASSWORD", "masterkey")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3050")

# Configurações de segurança
SECRET_KEY = os.getenv("SECRET_KEY", "chave_secreta_temporaria_mude_em_producao")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 horas

# Configuração da OpenAI
OPENAI_API_KEY = ""

# Configurações de CORS
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "https://app.mendessolucao.site",
    "https://api.mendessolucao.site"
]

# Configurações de logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

class Settings(BaseSettings):
    # Configurações do banco de dados
    db_host: str = DB_HOST
    db_port: int = int(DB_PORT)
    db_path: str = "C:\\MCFIN"  # Caminho padrão
    db_name: str = "BASE_PRI.GDB"
    db_user: str = DB_USER
    db_password: str = DB_PASSWORD
    db_charset: str = "ISO8859_1"
    
    # Configurações do Pool de Conexões
    db_pool_min_size: int = 1
    db_pool_max_size: int = 5
    db_pool_timeout: int = 30  # segundos
    
    # Configurações da API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # Configurações de CORS
    cors_origins: list = ALLOWED_ORIGINS
    
    # Chave secreta para JWT
    secret_key: str = SECRET_KEY
    
    # Configurações de Log
    log_level: str = LOG_LEVEL
    
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
