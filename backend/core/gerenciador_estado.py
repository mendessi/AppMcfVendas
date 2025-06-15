"""
Gerenciador de Estado Global para conexões com o banco de dados.
Mantém uma única conexão ativa por empresa durante a execução da aplicação.
"""
from fdb import connect
import threading
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class GerenciadorEstado:
    _instancia = None
    _lock = threading.Lock()
    _conexoes: Dict[str, any] = {}
    
    def __new__(cls):
        if cls._instancia is None:
            with cls._lock:
                if cls._instancia is None:
                    cls._instancia = super(GerenciadorEstado, cls).__new__(cls)
        return cls._instancia
    
    def obter_conexao(self, empresa_id: str, dsn: str, user: str, password: str):
        """Obtém uma conexão ativa ou cria uma nova se não existir"""
        with self._lock:
            if empresa_id not in self._conexoes or self._conexoes[empresa_id].closed:
                logger.info(f"Criando nova conexão para empresa {empresa_id}")
                try:
                    self._conexoes[empresa_id] = connect(
                        dsn=dsn,
                        user=user,
                        password=password,
                        charset='UTF8',
                        sql_dialect=3
                    )
                except Exception as e:
                    logger.error(f"Erro ao conectar ao banco: {str(e)}")
                    raise
            return self._conexoes[empresa_id]
    
    def fechar_conexao(self, empresa_id: str):
        """Fecha uma conexão específica"""
        with self._lock:
            if empresa_id in self._conexoes:
                try:
                    if not self._conexoes[empresa_id].closed:
                        self._conexoes[empresa_id].close()
                    del self._conexoes[empresa_id]
                    logger.info(f"Conexão da empresa {empresa_id} fechada")
                except Exception as e:
                    logger.error(f"Erro ao fechar conexão da empresa {empresa_id}: {str(e)}")
    
    def fechar_todas_conexoes(self):
        """Fecha todas as conexões ativas"""
        with self._lock:
            for empresa_id in list(self._conexoes.keys()):
                self.fechar_conexao(empresa_id)

# Instância global
gerenciador_estado = GerenciadorEstado()
