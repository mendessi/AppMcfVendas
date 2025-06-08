"""
Módulo para gerenciamento centralizado de conexões com o banco de dados.
Utiliza o padrão Singleton para garantir uma única instância de conexão por empresa.
"""
import logging
from typing import Optional, Dict, Any
from fdb import connect, Connection
from fastapi import HTTPException, status
from core.gerenciador_estado import gerenciador_estado
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class DatabaseManager:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatabaseManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._settings = get_settings()
        logger.info("DatabaseManager inicializado")
    
    def get_connection(self, empresa_id: str) -> Connection:
        """
        Obtém uma conexão ativa para a empresa especificada.
        
        Args:
            empresa_id: ID da empresa
            
        Returns:
            Connection: Objeto de conexão Firebird
            
        Raises:
            HTTPException: Se não for possível estabelecer a conexão
        """
        try:
            # Obtém a conexão do gerenciador de estado
            conn = gerenciador_estado.obter_conexao(
                empresa_id=empresa_id,
                dsn=self._settings.dsn,
                user=self._settings.db_user,
                password=self._settings.db_password
            )
            
            # Verifica se a conexão está ativa
            if conn.closed:
                logger.warning(f"Conexão fechada detectada para empresa {empresa_id}, recriando...")
                gerenciador_estado.fechar_conexao(empresa_id)
                return self.get_connection(empresa_id)
                
            return conn
            
        except Exception as e:
            logger.error(f"Erro ao obter conexão para empresa {empresa_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Não foi possível conectar ao banco de dados: {str(e)}"
            )
    
    def close_connection(self, empresa_id: str):
        """Fecha a conexão de uma empresa específica"""
        gerenciador_estado.fechar_conexao(empresa_id)

# Instância global
db_manager = DatabaseManager()

def get_db_connection(empresa_id: str) -> Connection:
    """Função auxiliar para obter uma conexão com o banco de dados"""
    return db_manager.get_connection(empresa_id)
