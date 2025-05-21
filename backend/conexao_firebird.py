import fdb
import logging
from config import get_settings

# Obtém as configurações
settings = get_settings()

def obter_conexao_controladora():
    """
    Obtém uma conexão com o banco de dados controlador.
    """
    try:
        conn = fdb.connect(
            host=settings.db_host,
            database=settings.db_path,
            user=settings.db_user,
            password=settings.db_password,
            charset=settings.db_charset
        )
        return conn
    except Exception as e:
        logging.error(f"Erro ao conectar ao banco controlador: {str(e)}")
        raise

def obter_conexao_cliente(empresa):
    """
    Obtém uma conexão com o banco de dados do cliente.
    """
    try:
        # Montar o DSN completo
        ip = empresa['cli_ip_servidor']
        porta = empresa.get('cli_porta', '3050')
        caminho_base = empresa['cli_caminho_base']
        nome_base = empresa.get('cli_nome_base', '')
        
        # Construir o caminho completo
        if nome_base:
            caminho_completo = f"{caminho_base}/{nome_base}"
        else:
            caminho_completo = caminho_base
            
        # Montar o DSN
        if porta and str(porta) != "3050":
            dsn = f"{ip}/{porta}:{caminho_completo}"
        else:
            dsn = f"{ip}:{caminho_completo}"
            
        logging.info(f"Tentando conectar ao banco do cliente: {dsn}")
        
        conn = fdb.connect(
            dsn=dsn,
            user=settings.db_user,
            password=settings.db_password,
            charset=settings.db_charset
        )
        return conn
    except Exception as e:
        logging.error(f"Erro ao conectar ao banco do cliente: {str(e)}")
        raise 

async def testar_conexao(connection):
    """
    Testa a conexão com o banco de dados fazendo uma consulta simples.
    Retorna uma tupla (sucesso, info) onde:
    - sucesso: booleano indicando se a conexão funciona
    - info: dicionário com informações do banco de dados
    """
    try:
        cursor = connection.cursor()
        
        # Consulta a versão do banco de dados
        cursor.execute("SELECT rdb$get_context('SYSTEM', 'ENGINE_VERSION') from rdb$database")
        versao = cursor.fetchone()[0]
        
        # Consulta informações do banco
        cursor.execute("SELECT current_timestamp, current_user from rdb$database")
        agora, usuario = cursor.fetchone()
        
        # Consulta alguma tabela do sistema para verificar se tem acesso
        cursor.execute("SELECT first 1 * from RDB$RELATIONS")
        tem_acesso = cursor.fetchone() is not None
        
        info = {
            "versao": versao,
            "timestamp": agora.isoformat() if agora else None,
            "usuario": usuario,
            "tem_acesso": tem_acesso
        }
        
        return True, info
    except Exception as e:
        logging.error(f"Erro ao testar conexão: {str(e)}")
        return False, {"erro": str(e)}