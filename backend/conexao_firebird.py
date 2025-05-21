import fdb
import logging
from typing import Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

def obter_conexao_controladora():
    """Obtém uma conexão com a base controladora usando as variáveis do .env."""
    try:
        host = os.getenv("DB_HOST", "localhost")
        path = os.getenv("DB_PATH")
        user = os.getenv("DB_USER", "SYSDBA")
        password = os.getenv("DB_PASSWORD", "masterkey")

        logging.info(f"[CONEXAO] Tentando conectar na base controladora:")
        logging.info(f"[CONEXAO] Host: {host}")
        logging.info(f"[CONEXAO] Caminho: {path}")
        logging.info(f"[CONEXAO] Usuário: {user}")

        # Tenta conectar via dsn host:path
        try:
            conn = fdb.connect(
                dsn=f"{host}:{path}",
                user=user,
                password=password
            )
            logging.info(f"[CONEXAO] Conectado via dsn: {host}:{path}")
            return conn
        except Exception as e:
            logging.error(f"[CONEXAO] Falha ao conectar via dsn: {str(e)}")
            raise
    except Exception as e:
        logging.error(f"[CONEXAO] Erro ao conectar na base controladora: {str(e)}")
        raise

def obter_conexao_cliente(dados_conexao: Dict[str, Any]):
    """
    Estabelece conexão com o banco de dados do cliente usando os dados fornecidos.
    
    Args:
        dados_conexao (dict): Dicionário contendo os dados de conexão:
            - CLI_IP_SERVIDOR: IP do servidor
            - CLI_NOME_BASE: Nome do banco de dados
            - CLI_PORTA: Porta do servidor
            - CLI_CAMINHO_BASE: Caminho do arquivo do banco
    
    Returns:
        fdb.Connection: Objeto de conexão com o banco de dados
    """
    try:
        # Extrai os dados de conexão
        host = dados_conexao.get('CLI_IP_SERVIDOR')
        database = dados_conexao.get('CLI_NOME_BASE')
        port = dados_conexao.get('CLI_PORTA')
        caminho_base = dados_conexao.get('CLI_CAMINHO_BASE')
        
        # Log dos dados de conexão (sem senha)
        logging.info(f"[CONEXÃO] Tentando conectar ao banco: {host}:{port}/{database}")
        logging.info(f"[CONEXÃO] Caminho do banco: {caminho_base}")
        
        # Monta a string de conexão
        dsn = f"{host}:{caminho_base}"
        
        # Estabelece a conexão
        conn = fdb.connect(
            dsn=dsn,
            user='SYSDBA',
            password='masterkey',
            port=int(port)
        )
        
        logging.info("[CONEXÃO] Conexão estabelecida com sucesso")
        return conn
        
    except Exception as e:
        logging.error(f"[CONEXÃO] Erro ao conectar ao banco: {str(e)}")
        raise Exception(f"Erro ao conectar ao banco: {str(e)}")

def testar_conexao(dados_conexao: Dict[str, Any]) -> bool:
    """
    Testa a conexão com o banco de dados do cliente.
    
    Args:
        dados_conexao (dict): Dicionário contendo os dados de conexão
    
    Returns:
        bool: True se a conexão foi bem sucedida, False caso contrário
    """
    try:
        conn = obter_conexao_cliente(dados_conexao)
        conn.close()
        return True
    except Exception as e:
        logging.error(f"[TESTE CONEXÃO] Falha: {str(e)}")
        return False 