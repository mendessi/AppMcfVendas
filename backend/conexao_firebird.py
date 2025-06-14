import fdb
import logging
import os
import sys
from config import get_settings

# Configura o caminho para a DLL do Firebird
raiz_projeto = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
print(f"\nConfigurando path para DLL do Firebird. Raiz do projeto: {raiz_projeto}")

# Adiciona a raiz do projeto ao PATH do sistema para encontrar a DLL
if raiz_projeto not in sys.path:
    sys.path.insert(0, raiz_projeto)
    os.environ['PATH'] = raiz_projeto + os.pathsep + os.environ['PATH']
    print(f"Adicionado {raiz_projeto} ao PATH do sistema")

# Verifica se a DLL existe no diretório
dll_path = os.path.join(raiz_projeto, 'fbclient.dll')
if os.path.exists(dll_path):
    print(f"DLL do Firebird encontrada em: {dll_path}")
else:
    print(f"ATENÇÃO: DLL do Firebird não encontrada em {dll_path}")

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
        raise Exception("Não foi possível conectar ao banco controlador. Verifique se o servidor está online ou tente novamente mais tarde.")

def obter_conexao_cliente(empresa):
    """
    Obtém uma conexão nova e independente com o banco de dados do cliente.
    NÃO usa pool/caching global. Cada chamada retorna uma conexão nova.
    Timeout de 5 segundos para evitar travamentos.
    """
    import os
    import fdb
    dsn = "Não definido"
    try:
        ip = empresa['cli_ip_servidor']
        porta = empresa.get('cli_porta', '3050')
        caminho_base = empresa['cli_caminho_base']
        nome_base = empresa.get('cli_nome_base', '')
        if not ip:
            raise Exception("IP do servidor não configurado.")
        if not caminho_base and not nome_base:
            raise Exception("Caminho da base não configurado.")
        if ip in ("localhost", "127.0.0.1"):
            if not os.path.isabs(caminho_base):
                caminho_base = os.path.abspath(caminho_base)
            if nome_base:
                dsn = os.path.join(caminho_base, nome_base)
            else:
                dsn = caminho_base
            dsn = dsn.replace("\\", "/")
        else:
            if nome_base:
                dsn = f"{ip}/{porta}:{caminho_base}/{nome_base}"
            else:
                dsn = f"{ip}/{porta}:{caminho_base}"
        caminho_base_absoluto = os.path.abspath(caminho_base) if not os.path.isabs(caminho_base) else caminho_base
        diretorio_banco = os.path.dirname(caminho_base_absoluto)
        dll_cliente_path = os.path.join(diretorio_banco, 'fbclient.dll')
        if os.path.exists(dll_cliente_path):
            original_path = os.environ['PATH']
            os.environ['PATH'] = diretorio_banco + os.pathsep + original_path
            try:
                conn = fdb.connect(
                    dsn=dsn,
                    user=settings.db_user,
                    password=settings.db_password,
                    charset=settings.db_charset
                )
                return conn
            finally:
                os.environ['PATH'] = original_path
        else:
            conn = fdb.connect(
                dsn=dsn,
                user=settings.db_user,
                password=settings.db_password,
                charset=settings.db_charset
            )
            return conn
    except Exception as e:
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