import fdb
import logging
import os
import sys
from config import get_settings

# Configura o logger
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("conexao_firebird")

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
        # Importações necessárias para essa função
        import os
        
        # Montar o DSN completo
        ip = empresa['cli_ip_servidor']
        porta = empresa.get('cli_porta', '3050')
        caminho_base = empresa['cli_caminho_base']
        nome_base = empresa.get('cli_nome_base', '')
        
        # Verificar se os dados essenciais estão presentes
        if not ip:
            logging.error("IP do servidor não configurado na empresa")
            raise Exception("IP do servidor não configurado.")
        if not caminho_base and not nome_base:
            logging.error("Caminho da base não configurado na empresa")
            raise Exception("Caminho da base não configurado.")
            
        logging.info(f"Montando DSN com IP: {ip}, Porta: {porta}, Caminho: {caminho_base}, Nome Base: {nome_base}")
        
        # Tratamento especial para localhost
        if ip in ("localhost", "127.0.0.1"):
            logging.info("Conexão local detectada")
            # Garantir que o caminho base seja absoluto
            if not os.path.isabs(caminho_base):
                caminho_base = os.path.abspath(caminho_base)
                
            if nome_base:
                dsn = os.path.join(caminho_base, nome_base)
            else:
                dsn = caminho_base
                
            # Normalizar separadores de caminho
            dsn = dsn.replace("\\", "/")
        else:
            # Conexão remota - usando a porta corretamente
            if nome_base:
                dsn = f"{ip}/{porta}:{caminho_base}/{nome_base}"
            else:
                dsn = f"{ip}/{porta}:{caminho_base}"
            
        logging.info(f"DSN final: {dsn}")
        
        # Verificar se existe uma DLL do Firebird junto com o banco do cliente
        # Primeiro verificamos se o caminho da base é absoluto, senão tornamos absoluto
        caminho_base_absoluto = os.path.abspath(caminho_base) if not os.path.isabs(caminho_base) else caminho_base
        diretorio_banco = os.path.dirname(caminho_base_absoluto)
        
        dll_cliente_path = os.path.join(diretorio_banco, 'fbclient.dll')
        
        logging.info(f"Verificando DLL em: {dll_cliente_path}")
        
        # Se a DLL existir junto com o banco do cliente, configurar o ambiente para usá-la
        if os.path.exists(dll_cliente_path):
            logging.info(f"DLL do Firebird encontrada junto ao banco do cliente: {dll_cliente_path}")
            # Salva o PATH original
            original_path = os.environ['PATH']
            # Adiciona temporariamente o diretório da DLL ao PATH
            os.environ['PATH'] = diretorio_banco + os.pathsep + original_path
            try:
                conn = fdb.connect(
                    dsn=dsn,
                    user=settings.db_user,
                    password=settings.db_password,
                    charset=settings.db_charset
                )
                logging.info("Conexão estabelecida com sucesso usando DLL do cliente")
                return conn
            finally:
                # Restaura o PATH original independentemente do resultado
                os.environ['PATH'] = original_path
        else:
            # Usa a DLL padrão
            logging.info("Usando DLL padrão do Firebird")
            conn = fdb.connect(
                dsn=dsn,
                user=settings.db_user,
                password=settings.db_password,
                charset=settings.db_charset
            )
            logging.info("Conexão estabelecida com sucesso")
            return conn
    except Exception as e:
        logging.error(f"Erro ao conectar ao banco do cliente: {str(e)}")
        raise Exception(f"Erro ao conectar ao banco Firebird: {str(e)}\nDSN tentado: {dsn}") 

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
