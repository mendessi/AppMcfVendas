from fastapi import HTTPException, status, Request, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from jose import JWTError, jwt
import os
import fdb
import logging
from auth import SECRET_KEY, ALGORITHM
from conexao_firebird import obter_conexao_cliente, obter_conexao_controladora
import database
import models

# Configurar o logger
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("empresa_manager")

# Configuração de segurança
SECRET_KEY = os.getenv("SECRET_KEY", "chave_secreta_temporaria_mude_em_producao")
ALGORITHM = "HS256"

# Modelo para seleção de empresa
class EmpresaSelect(BaseModel):
    cli_codigo: int
    cli_nome: str
    cli_caminho_base: str
    cli_ip_servidor: str
    cli_nome_base: str
    cli_porta: Optional[str] = "3050"  # Tornando opcional com valor padrão
    cli_mensagem: Optional[str] = None
    cli_bloqueadoapp: str

# Modelo para dados da empresa
class EmpresaData(BaseModel):
    cli_codigo: int
    cli_nome: str
    cli_bloqueadoapp: str
    cli_mensagem: Optional[str] = None
    cli_caminho_base: str
    cli_ip_servidor: str
    cli_nome_base: str
    cli_porta: str

# Armazenamento temporário de conexões de empresas (em produção, use Redis ou similar)
# Chave: ID do usuário, Valor: Dados da empresa selecionada
empresa_sessions = {}

# Armazenamento temporário de empresas liberadas por usuário
# Chave: ID do usuário, Valor: Lista de empresas liberadas
empresas_liberadas = {}

async def obter_empresas_usuario(email: str) -> List[Dict[str, Any]]:
    """
    Obtém as empresas liberadas para o usuário pelo email.
    """
    logging.info(f"[EMPRESAS] Obtendo empresas para o email: {email}")
    
    if not email or not isinstance(email, str):
        logging.error(f"[EMPRESAS] Email de usuário inválido: {email}")
        return []
    
    try:
        conn = obter_conexao_controladora()
        cursor = conn.cursor()
        
        # Primeiro verifica se o usuário existe e está ativo
        cursor.execute("""
            SELECT ID, NIVEL_ACESSO, ATIVO, EMAIL
            FROM USUARIOS_APP
            WHERE EMAIL = ?
        """, (email,))
        
        usuario = cursor.fetchone()
        if not usuario:
            logging.error(f"[EMPRESAS] Usuário não encontrado: {email}")
            return []
            
        if usuario[2] != 'S':  # ATIVO
            logging.error(f"[EMPRESAS] Usuário inativo: {email}")
            return []
        
        logging.info(f"[EMPRESAS] Usuário encontrado: ID={usuario[0]}, Nível={usuario[1]}, Email={usuario[3]}")
        
        # Consulta as empresas vinculadas ao usuário com todos os campos necessários
        cursor.execute("""
            SELECT
                c.CLI_CODIGO, 
                c.CLI_NOME,
                CASE 
                    WHEN c.CLI_BLOQUEADOAPP IS NULL THEN 'N'
                    ELSE c.CLI_BLOQUEADOAPP 
                END as CLI_BLOQUEADOAPP,
                CASE 
                    WHEN c.CLI_MENSAGEM IS NULL THEN ''
                    ELSE c.CLI_MENSAGEM 
                END as CLI_MENSAGEM,
                CASE 
                    WHEN c.CLI_CAMINHO_BASE IS NULL THEN ''
                    ELSE c.CLI_CAMINHO_BASE 
                END as CLI_CAMINHO_BASE,
                CASE 
                    WHEN c.cli_ip_servidor IS NULL THEN '127.0.0.1'
                    ELSE c.cli_ip_servidor 
                END as cli_ip_servidor,
                CASE 
                    WHEN c.CLI_NOME_BASE IS NULL THEN ''
                    ELSE c.CLI_NOME_BASE 
                END as CLI_NOME_BASE,
                CASE 
                    WHEN c.CLI_PORTA IS NULL THEN '3050'
                    ELSE CAST(c.CLI_PORTA AS VARCHAR(10))
                END as CLI_PORTA,
                uc.ID as VINCULO_ID,
                uc.USUARIO_ID,
                ua.nivel_acesso,
                ua.email,
                ua.id AS usuario_app_id
            FROM usuarios_clientes uc
            JOIN CLIENTES c ON c.CLI_CODIGO = uc.CLI_CODIGO
            JOIN USUARIOS_APP ua ON ua.ID = uc.USUARIO_ID
            WHERE ua.EMAIL = ?
            AND ua.ATIVO = 'S'
            AND (c.CLI_BLOQUEADOAPP IS NULL OR c.CLI_BLOQUEADOAPP <> 'S')
        """, (email,))
        
        result = cursor.fetchall()
        
        # Formatar os resultados
        empresas = []
        for row in result:
            empresa = {
                "cli_codigo": row[0],
                "cli_nome": row[1],
                "cli_bloqueadoapp": row[2],
                "cli_mensagem": row[3],
                "cli_caminho_base": row[4],
                "cli_ip_servidor": row[5],
                "cli_nome_base": row[6],
                "cli_porta": row[7],
                "vinculo_id": row[8],
                "usuario_id": row[9],
                "nivel_acesso": row[10],
                "email": row[11],
                "usuario_app_id": row[12]
            }
            empresas.append(empresa)
            
        if not empresas:
            logging.warning(f"[EMPRESAS] Nenhuma empresa encontrada para o usuário {email}")
            
        return empresas
            
    except Exception as e:
        logging.error(f"[EMPRESAS] Erro ao obter empresas: {str(e)}")
        return []

async def obter_empresa_controladora(usuario_id: int) -> Dict[str, Any]:
    """
    Obtém os dados da empresa controladora para um usuário.
    """
    try:
        conn = obter_conexao_controladora()
        cursor = conn.cursor()
        
        # Busca informações da empresa controladora
        cursor.execute("""
            SELECT 
                CLI_CODIGO, 
                CLI_NOME,
                CLI_BLOQUEADOAPP,
                CLI_MENSAGEM,
                CLI_CAMINHO_BASE,
                cli_ip_servidor,
                CLI_NOME_BASE,
                CLI_PORTA
            FROM CLIENTES 
            WHERE CLI_CODIGO = 1
        """)
        
        row = cursor.fetchone()
        if not row:
            return None
            
        empresa = {
            "cli_codigo": row[0],
            "cli_nome": row[1],
            "cli_bloqueadoapp": row[2] if row[2] else 'N',
            "cli_mensagem": row[3] if row[3] else '',
            "cli_caminho_base": row[4] if row[4] else '',
            "cli_ip_servidor": row[5] if row[5] else '127.0.0.1',
            "cli_nome_base": row[6] if row[6] else '',
            "cli_porta": str(row[7]) if row[7] else '3050'
        }
        
        return empresa
            
    except Exception as e:
        logging.error(f"Erro ao obter empresa controladora: {str(e)}")
        return None

async def obter_empresa_por_codigo(cli_codigo: int) -> Dict[str, Any]:
    """
    Obtém os dados de uma empresa pelo código.
    """
    try:
        if not cli_codigo:
            logging.error("Código da empresa não fornecido")
            return None
            
        conn = obter_conexao_controladora()
        cursor = conn.cursor()
        
        # Busca informações da empresa pelo código
        cursor.execute("""
            SELECT 
                CLI_CODIGO, 
                CLI_NOME,
                CLI_BLOQUEADOAPP,
                CLI_MENSAGEM,
                CLI_CAMINHO_BASE,
                cli_ip_servidor,
                CLI_NOME_BASE,
                CLI_PORTA
            FROM CLIENTES 
            WHERE CLI_CODIGO = ?
        """, (cli_codigo,))
        
        row = cursor.fetchone()
        if not row:
            logging.error(f"Empresa com código {cli_codigo} não encontrada")
            return None
            
        empresa = {
            "cli_codigo": row[0],
            "cli_nome": row[1],
            "cli_bloqueadoapp": row[2] if row[2] else 'N',
            "cli_mensagem": row[3] if row[3] else '',
            "cli_caminho_base": row[4] if row[4] else '',
            "cli_ip_servidor": row[5] if row[5] else '127.0.0.1',
            "cli_nome_base": row[6] if row[6] else '',
            "cli_porta": str(row[7]) if row[7] else '3050'
        }
        
        return empresa
            
    except Exception as e:
        logging.error(f"Erro ao obter empresa por código: {str(e)}")
        return None

async def verificar_acesso_empresa(usuario_id: int, cli_codigo: int) -> bool:
    """
    Verifica se o usuário tem acesso à empresa.
    """
    try:
        conn = obter_conexao_controladora()
        cursor = conn.cursor()
        
        # Verifica se o usuário tem acesso à empresa
        cursor.execute("""
            SELECT 1
            FROM usuarios_clientes uc
            JOIN USUARIOS_APP ua ON ua.ID = uc.USUARIO_ID
            WHERE uc.USUARIO_ID = ?
            AND uc.CLI_CODIGO = ?
            AND ua.ATIVO = 'S'
        """, (usuario_id, cli_codigo))
        
        return cursor.fetchone() is not None
            
    except Exception as e:
        logging.error(f"Erro ao verificar acesso à empresa: {str(e)}")
        return False

async def selecionar_empresa(usuario_id: int, cli_codigo: int) -> Dict[str, Any]:
    try:
        # Verificar se a empresa existe
        empresa = await obter_empresa_por_codigo(cli_codigo)
        if not empresa:
            logging.error(f"Empresa {cli_codigo} não encontrada")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Empresa com código {cli_codigo} não encontrada",
            )
            
        # Verificar se o usuário tem acesso à empresa
        tem_acesso = await verificar_acesso_empresa(usuario_id, cli_codigo)
        if not tem_acesso:
            logging.error(f"Usuário {usuario_id} não tem acesso à empresa {cli_codigo}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Usuário não tem acesso à empresa {cli_codigo}",
            )
            
        # Verificar se a empresa está bloqueada
        if empresa.get("cli_bloqueadoapp") == 'S':
            logging.error(f"Empresa {cli_codigo} está bloqueada para o app")
            
            # Se tiver mensagem personalizada, usar
            mensagem = empresa.get("cli_mensagem", "")
            if not mensagem:
                mensagem = "Esta empresa está temporariamente indisponível no aplicativo."
                
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=mensagem,
            )
            
        # Verificar se a empresa tem conexão válida
        try:
            conn = obter_conexao_cliente(empresa)
            # Faz um teste básico para ver se a conexão funciona
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM RDB$DATABASE")
            cursor.fetchone()
            conn.close()
        except Exception as e:
            logging.error(f"Erro ao testar conexão com a empresa {cli_codigo}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Não foi possível conectar ao banco de dados da empresa: {str(e)}",
            )
            
        # Salvar empresa na sessão
        empresa_sessions[usuario_id] = empresa
        logging.info(f"Empresa {cli_codigo} selecionada com sucesso para o usuário {usuario_id}")
        
        return empresa
            
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro ao selecionar empresa: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao selecionar empresa: {str(e)}",
        )

def get_empresa_atual(request: Request) -> Dict[str, Any]:
    """
    Obtém a empresa atual do usuário a partir do token JWT e/ou cabeçalhos.
    Prioridade:
    1. Cabeçalho x-empresa-codigo (para componentes como TopClientes)
    2. Sessão do usuário (para aplicação completa)
    """
    try:
        # Primeiro, verificar pelo token
        authorization = request.headers.get("Authorization")
        usuario_id = None
        
        if authorization and authorization.startswith("Bearer "):
            try:
                token = authorization.replace("Bearer ", "")
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                usuario_id = payload.get("id")
                log.info(f"Usuário ID do token: {usuario_id}")
            except Exception as e:
                log.error(f"Erro ao decodificar token: {str(e)}")
                # Continue sem usuário_id, vamos tentar pelo cabeçalho x-empresa-codigo
        
        # Em seguida, verificar pelo cabeçalho x-empresa-codigo
        empresa_codigo_header = request.headers.get("x-empresa-codigo")
        if empresa_codigo_header:
            try:
                # Converter para inteiro
                empresa_codigo = int(empresa_codigo_header)
                log.info(f"Usando empresa do cabeçalho: {empresa_codigo}")
                
                # Buscar empresa pelo código
                log.info(f"Buscando empresa no banco com código {empresa_codigo}...")
                db = database.get_db()
                
                # Listar todas as empresas disponíveis para debug
                empresas = db.query(models.Empresa).all()
                log.info(f"Total de empresas no banco: {len(empresas)}")
                for emp in empresas:
                    log.info(f"Empresa disponível: ID={emp.cli_codigo}, Nome={emp.cli_nome}")
                
                # Buscar a empresa especificada
                empresa_db = db.query(models.Empresa).filter(models.Empresa.cli_codigo == empresa_codigo).first()
                
                if empresa_db:
                    log.info(f"Empresa encontrada: {empresa_db.cli_nome}")
                    # Converter para dicionário
                    empresa = {
                        "cli_codigo": empresa_db.cli_codigo,
                        "cli_nome": empresa_db.cli_nome,
                        "cli_caminho_base": empresa_db.cli_caminho_base,
                        "cli_ip_servidor": empresa_db.cli_ip_servidor,
                        "cli_nome_base": empresa_db.cli_nome_base,
                        "cli_porta": str(empresa_db.cli_porta) if empresa_db.cli_porta else "3050",
                    }
                    return empresa
                else:
                    log.warning(f"Empresa com código {empresa_codigo} não encontrada no banco de dados")
            except Exception as e:
                log.error(f"Erro ao processar cabeçalho x-empresa-codigo: {str(e)}")
                # Continue para a próxima opção (sessão do usuário)
        
        # Se não encontrou pelo cabeçalho, use a empresa da sessão
        log.info(f"Buscando empresa na sessão para o usuário {usuario_id}")
        log.info(f"Estado atual da sessão global: {len(empresa_sessions)} empresas armazenadas")
        log.info(f"Usuários com empresa na sessão: {list(empresa_sessions.keys())}")
        
        empresa = empresa_sessions.get(usuario_id)
        if not empresa:
            log.error(f"Nenhuma empresa encontrada na sessão para o usuário {usuario_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nenhuma empresa selecionada",
            )
        
        log.info(f"Empresa encontrada na sessão: {empresa['cli_nome']} (ID: {empresa['cli_codigo']})")
        
        return empresa
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro ao obter empresa atual: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter empresa atual: {str(e)}"
        )

# Função para obter conexão com a empresa atual
async def get_empresa_connection(request: Request):
    """
    Obtém uma conexão com a empresa atual do usuário.
    Versão modificada que é mais flexível e permite que os endpoints funcionem mesmo sem autenticação completa.
    """
    try:
        # Primeiro, tenta obter a empresa do cabeçalho x-empresa-codigo
        empresa_codigo_header = request.headers.get("x-empresa-codigo")
        if empresa_codigo_header:
            try:
                # Converter para inteiro
                empresa_codigo = int(empresa_codigo_header)
                log.info(f"Usando empresa do cabeçalho: {empresa_codigo}")
                
                # Buscar empresa pelo código
                log.info(f"Buscando empresa no banco com código {empresa_codigo}...")
                db = database.get_db()
                
                # Buscar a empresa especificada
                empresa_db = db.query(models.Empresa).filter(models.Empresa.cli_codigo == empresa_codigo).first()
                
                if empresa_db:
                    log.info(f"Empresa encontrada: {empresa_db.cli_nome}")
                    # Converter para dicionário
                    empresa = {
                        "cli_codigo": empresa_db.cli_codigo,
                        "cli_nome": empresa_db.cli_nome,
                        "cli_caminho_base": empresa_db.cli_caminho_base,
                        "cli_ip_servidor": empresa_db.cli_ip_servidor,
                        "cli_nome_base": empresa_db.cli_nome_base,
                        "cli_porta": str(empresa_db.cli_porta) if empresa_db.cli_porta else "3050",
                    }
                    
                    # Tentar conectar à empresa
                    try:
                        log.info(f"Tentando conectar à empresa com IP: {empresa.get('cli_ip_servidor')}, Porta: {empresa.get('cli_porta')}, Base: {empresa.get('cli_nome_base')}")
                        return obter_conexao_cliente(empresa)
                    except Exception as conn_err:
                        log.error(f"Erro ao conectar à empresa do cabeçalho: {str(conn_err)}")
                        # Continuar para a próxima opção
                else:
                    log.warning(f"Empresa com código {empresa_codigo} não encontrada no banco de dados")
            except Exception as e:
                log.error(f"Erro ao processar cabeçalho x-empresa-codigo: {str(e)}")
        
        # Se não conseguiu pelo cabeçalho, tenta pelo método padrão (get_empresa_atual)
        try:
            empresa = get_empresa_atual(request)
            # Certificar-se de que a empresa tenha uma porta definida
            if 'cli_porta' not in empresa or not empresa['cli_porta']:
                logging.warning(f"Porta não definida para empresa {empresa.get('cli_codigo')}, usando 3050 como padrão")
                empresa['cli_porta'] = '3050'
                
            logging.info(f"Tentando conectar à empresa com IP: {empresa.get('cli_ip_servidor')}, Porta: {empresa.get('cli_porta')}, Base: {empresa.get('cli_nome_base')}")
            return obter_conexao_cliente(empresa)
        except Exception as e:
            log.error(f"Erro ao obter empresa pela sessão: {str(e)}")
            # Continuar para a próxima opção
        
        # Se todas as tentativas falharem, tenta usar uma empresa padrão (primeira empresa do banco)
        try:
            log.info("Tentando usar a primeira empresa do banco como fallback")
            db = database.get_db()
            primeira_empresa = db.query(models.Empresa).first()
            
            if primeira_empresa:
                log.info(f"Usando primeira empresa como fallback: {primeira_empresa.cli_nome}")
                empresa = {
                    "cli_codigo": primeira_empresa.cli_codigo,
                    "cli_nome": primeira_empresa.cli_nome,
                    "cli_caminho_base": primeira_empresa.cli_caminho_base,
                    "cli_ip_servidor": primeira_empresa.cli_ip_servidor,
                    "cli_nome_base": primeira_empresa.cli_nome_base,
                    "cli_porta": str(primeira_empresa.cli_porta) if primeira_empresa.cli_porta else "3050",
                }
                
                log.info(f"Tentando conectar à empresa fallback com IP: {empresa.get('cli_ip_servidor')}, Porta: {empresa.get('cli_porta')}, Base: {empresa.get('cli_nome_base')}")
                return obter_conexao_cliente(empresa)
            else:
                log.error("Nenhuma empresa encontrada no banco de dados")
        except Exception as fallback_err:
            log.error(f"Erro ao tentar usar empresa fallback: {str(fallback_err)}")
        
        # Se todas as tentativas falharem, retorna None (os endpoints devem tratar isso)
        log.error("Todas as tentativas de obter conexão falharam. Retornando None.")
        return None
    except Exception as e:
        log.error(f"Erro geral ao obter conexão com empresa: {str(e)}")
        return None
