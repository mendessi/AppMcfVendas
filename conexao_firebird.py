import os
import sys
import logging
from dotenv import load_dotenv

# Adiciona o diretório atual ao PATH para garantir que o fbclient.dll local seja usado
current_dir = os.path.dirname(os.path.abspath(__file__))
os.environ["PATH"] = current_dir + os.pathsep + os.environ["PATH"]

# Usar fdb em vez de firebird-driver para melhor compatibilidade com Python 3.13
import fdb

load_dotenv()

# Configurações padrão
CHARSET = "ISO8859_1"  # Charset padrão para todas as conexões
DEFAULT_USER = "SYSDBA"
DEFAULT_PASSWORD = "masterkey"

def buscar_config_app():
    """
    Busca as configurações da base controladora na tabela CONFIG_APP (modelo chave-valor).
    Retorna dict com ip, porta e caminho_base.
    """
    try:
        # Primeiro tenta ler do ambiente
        banco_path = os.getenv("DB_PATH")
        if not banco_path:
            raise ValueError("DB_PATH não configurado no ambiente")

        usuario = os.getenv("DB_USER", DEFAULT_USER)
        senha = os.getenv("DB_PASSWORD", DEFAULT_PASSWORD)
        
        logging.info(f"Tentando conectar ao banco inicial: {banco_path}")
        
        # Usar fdb para conectar
        with fdb.connect(dsn=banco_path, user=usuario, password=senha, charset=CHARSET) as con:
            cur = con.cursor()
            cur.execute("""
                SELECT CHAVE_CONFIG, VALOR_CONFIG FROM CONFIG_APP
                WHERE CHAVE_CONFIG IN ('IP_BASE_CONTROLADORA', 'PORTA_BASE_CONTROLADORA', 'BASE_CONTROLADORA')
            """)
            rows = cur.fetchall()
            config_dict = {row[0]: row[1] for row in rows}
            
            # Validar configurações obrigatórias
            required_keys = ['IP_BASE_CONTROLADORA', 'BASE_CONTROLADORA']
            missing_keys = [k for k in required_keys if k not in config_dict]
            if missing_keys:
                raise ValueError(f"Configurações ausentes na tabela CONFIG_APP: {', '.join(missing_keys)}")
            
            return {
                'ip': config_dict['IP_BASE_CONTROLADORA'],
                'porta': config_dict.get('PORTA_BASE_CONTROLADORA', '3050'),
                'caminho_base': config_dict['BASE_CONTROLADORA']
            }
    except Exception as e:
        logging.error(f"Erro ao buscar CONFIG_APP: {str(e)}")
        raise

def obter_conexao_controladora():
    """
    Conecta à base controladora usando as informações da tabela CONFIG_APP.
    Esta é a base onde estão as informações de usuários, clientes e configurações.
    """
    try:
        # Buscar configurações da base controladora
        config = buscar_config_app()
        if not config:
            raise Exception("Configurações da base controladora não encontradas")
        
        ip = config['ip']
        porta = config['porta']
        caminho_base = config['caminho_base']
        
        # Montar o DSN
        if porta and str(porta) != "3050":
            dsn = f"{ip}/{porta}:{caminho_base}"
        else:
            dsn = f"{ip}:{caminho_base}"
        
        logging.info(f"Tentando conectar à base controladora: {ip}:****")
        
        # Usar fdb para conectar
        conn = fdb.connect(
            dsn=dsn,
            user=os.getenv('DB_USER', DEFAULT_USER),
            password=os.getenv('DB_PASSWORD', DEFAULT_PASSWORD),
            charset=CHARSET
        )
        logging.info("Conexão com base controladora estabelecida com sucesso")
        return conn
    except Exception as e:
        logging.error(f"Erro ao conectar à base controladora: {str(e)}")
        raise

def obter_conexao_empresa():
    """
    Conecta ao Firebird usando os dados da empresa selecionada na sessão.
    """
    from flask import session
    import logging

    logging.info("Iniciando obtenção de conexão com a empresa")

    if "empresa_escolhida" not in session:
        logging.warning("Empresa não encontrada na sessão, tentando usar dados do .env")
        # Se não houver empresa na sessão, usa os valores do .env (conexão controladora)
        db_host = os.getenv("DB_HOST")
        db_path = os.getenv("DB_PATH")
        db_user = os.getenv("DB_USER", "SYSDBA")
        db_password = os.getenv("DB_PASSWORD", "masterkey")
        if not db_host or not db_path:
            logging.error("DB_HOST ou DB_PATH não configurados no .env")
            raise Exception("DB_HOST ou DB_PATH não configurados.")
        dsn = f"{db_host}:{db_path}"
        logging.info(f"Usando DSN do .env: {db_host}:****")
    else:
        # Usa os dados da empresa escolhida na sessão
        empresa = session["empresa_escolhida"]
        logging.info(
            f"Dados da empresa encontrados na sessão: {empresa.get('CLI_NOME', 'Nome não encontrado')}"
        )

        ip_servidor = empresa.get("CLI_IP_SERVIDOR")
        porta = empresa.get("CLI_PORTA", 3050)
        caminho_base = empresa.get("CLI_CAMINHO_BASE")
        nome_base = empresa.get("CLI_NOME_BASE")
        usar_porta_explicita = empresa.get("USAR_PORTA_EXPLICITA", False)

        # Verificações de segurança
        if not ip_servidor:
            logging.error("IP do servidor não configurado na empresa")
            raise Exception("IP do servidor não configurado na empresa selecionada.")
        if not caminho_base and not nome_base:
            logging.error("Caminho da base não configurado na empresa")
            raise Exception("Caminho da base não configurado na empresa selecionada.")

        logging.info(f"Montando DSN com IP: {ip_servidor}, Porta: {porta}")

        # Montar DSN sem porta se for padrão 3050
        if ip_servidor in ("localhost", "127.0.0.1"):
            logging.info("Conexão local detectada")
            # Garantir que o caminho base seja absoluto
            if not os.path.isabs(caminho_base):
                caminho_base = os.path.abspath(caminho_base)

            if nome_base:
                dsn = os.path.join(caminho_base, nome_base)
            else:
                dsn = caminho_base
        else:
            if usar_porta_explicita and porta and str(porta) != "3050":
                if nome_base:
                    dsn = f"{ip_servidor}/{porta}:{caminho_base}/{nome_base}"
                else:
                    dsn = f"{ip_servidor}/{porta}:{caminho_base}"
            else:
                # Não inclui porta se for 3050
                if nome_base:
                    dsn = f"{ip_servidor}:{caminho_base}/{nome_base}"
                else:
                    dsn = f"{ip_servidor}:{caminho_base}"

        # Normalizar separadores de caminho
        dsn = dsn.replace("\\", "/")
        logging.info(f"DSN montado: {dsn}")

        # Usar as credenciais padrão para todas as empresas
        db_user = os.getenv("DB_USER", "SYSDBA")
        db_password = os.getenv("DB_PASSWORD", "masterkey")

    try:
        logging.info(f"Tentando conectar ao banco com usuário {db_user}")
        # Definir o charset no momento da conexão, não depois
        conn = fdb.connect(
            dsn=dsn, user=db_user, password=db_password, charset="ISO8859_1"
        )
        logging.info("Conexão estabelecida com sucesso")
        return conn
    except Exception as e:
        logging.error(f"Erro ao conectar ao banco Firebird da empresa: {e}\nDSN: {dsn}")
        raise Exception(f"Erro ao conectar ao banco Firebird: {e}\nDSN: {dsn}")

def obter_conexao(banco_path=None):
    if banco_path is None:
        banco_path = Banco
    logging.info(f'Caminho do banco usado na conexão: {banco_path}')
    # Ajuste: se for conexão local, usar apenas o caminho do arquivo
    if banco_path.startswith('127.0.0.1') or banco_path.startswith('localhost'):
        # Remove IP/porta se estiver presente
        if ':' in banco_path:
            banco_path = banco_path.split(':', 1)[-1]
    return connect(
        database=banco_path,
        user=usuario,
        password=senha,
        charset=charset
    )

def obter_conexao_dinamica(ip, caminho, porta=None, usar_porta=False):
    """
    Estabelece uma conexão dinâmica com o banco de dados Firebird.
    
    Args:
        ip (str): IP do servidor
        caminho (str): Caminho completo do banco de dados
        porta (str, optional): Porta do servidor. Defaults to None.
        usar_porta (bool, optional): Se deve usar a porta explicitamente. Defaults to False.
        
    Returns:
        Connection: Objeto de conexão com o banco de dados
    """
    try:
        # Validar parâmetros
        if not ip:
            raise ValueError("IP do servidor não fornecido")
            
        if not caminho:
            raise ValueError("Caminho do banco não fornecido")
            
        # Construir string de conexão
        if usar_porta and porta and str(porta) != "3050":
            dsn = f"{ip}/{porta}:{caminho}"
        else:
            dsn = f"{ip}:{caminho}"
            
        logging.info(f"Tentando conexão dinâmica com: {dsn}")
        
        # Estabelecer conexão usando fdb
        conn = fdb.connect(
            dsn=dsn,
            user=os.getenv('FIREBIRD_USER', 'SYSDBA'),
            password=os.getenv('FIREBIRD_PASSWORD', 'masterkey'),
            charset='UTF8'
        )
        
        return conn
        
    except Exception as e:
        logging.error(f"Erro ao estabelecer conexão dinâmica: {e}")
        raise

def obter_conexao_cliente(dados_conexao):
    """
    Obtém uma conexão com o banco de dados do cliente usando os dados fornecidos.
    
    Args:
        dados_conexao (dict): Dicionário com os dados de conexão:
            - CLI_IP_SERVIDOR: IP do servidor
            - CLI_PORTA: Porta do servidor (opcional)
            - CLI_NOME_BASE: Nome do banco de dados (opcional)
            - CLI_CAMINHO_BASE: Caminho do banco de dados (opcional)
            - USAR_PORTA_EXPLICITA: Se deve usar a porta explicitamente (opcional)
    
    Returns:
        Connection: Conexão com o banco de dados
    """
    try:
        # Validar dados obrigatórios
        if not dados_conexao.get('CLI_IP_SERVIDOR'):
            raise ValueError("IP do servidor não fornecido")
            
        if not dados_conexao.get('CLI_NOME_BASE') and not dados_conexao.get('CLI_CAMINHO_BASE'):
            raise ValueError("Nome ou caminho do banco de dados não fornecido")
            
        # Obter dados de conexão
        ip = dados_conexao['CLI_IP_SERVIDOR']
        porta = dados_conexao.get('CLI_PORTA', '3050')
        
        # Preparar o caminho do banco
        caminho_base = dados_conexao.get('CLI_CAMINHO_BASE', '').replace('\\', '/')
        nome_base = dados_conexao.get('CLI_NOME_BASE', '')
        
        # Construir o caminho completo
        if caminho_base and nome_base:
            caminho_completo = f"{caminho_base}/{nome_base}"
        else:
            caminho_completo = nome_base or caminho_base
            
        # Criar configuração para conexão
        fb_config = driver.config()
        fb_config.server.host = ip
        fb_config.server.port = int(porta) if porta else 3050
        fb_config.database.charset = 'ISO8859_1'
            
        logging.info(f"Tentando conexão com: {ip}:{caminho_completo}")
        
        # Estabelecer conexão usando firebird-driver
        conn = driver.connect(
            database=caminho_completo,
            user=os.getenv('DB_USER', 'SYSDBA'),
            password=os.getenv('DB_PASSWORD', 'masterkey'),
            config=fb_config
        )
        
        logging.info("Conexão estabelecida com sucesso")
        return conn
        
    except Exception as e:
        logging.error(f"Erro ao obter conexão: {str(e)}")
        raise

def montar_dsn_firebird(ip, porta, caminho_base, nome_base):
    """
    Monta o DSN completo para conexão Firebird a partir dos campos da consulta.
    Exemplo de retorno: 131.221.227.188/3050:C:/bases/base_pri.gdb
    """
    # Verificações de segurança
    if not ip or str(ip).lower() == 'undefined':
        raise ValueError(f"IP do servidor inválido: {ip}")
    if not porta or str(porta).lower() == 'undefined':
        raise ValueError(f"Porta do servidor inválida: {porta}")
    if not caminho_base or str(caminho_base).lower() == 'undefined':
        raise ValueError(f'Caminho base inválido: {caminho_base}')
    if not nome_base or str(nome_base).lower() == 'undefined':
        raise ValueError(f'Nome da base inválido: {nome_base}')
    caminho_base_normalizado = str(caminho_base).replace("\\", "/").rstrip("/")
    caminho_completo = f"{caminho_base_normalizado}/{nome_base}"
    dsn = f"{ip}/{porta}:{caminho_completo}"
    return dsn
