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
from server_config import thread_pool
import asyncio

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
            JOIN usuarios_app ua ON ua.id = uc.USUARIO_ID
            WHERE ua.email = ?
            ORDER BY c.CLI_NOME
        """, (email,))
        
        rows = cursor.fetchall()
        logging.info(f"[EMPRESAS] Dados brutos do banco: {rows}")
        
        empresas = []
        for row in rows:
            try:
                logging.info(f"[EMPRESAS] Processando linha: {row}")
                # Garantir que a porta seja uma string válida
                porta = str(row[7]) if row[7] is not None else '3050'
                
                empresa = {
                    "cli_codigo": int(row[0]),
                    "cli_nome": str(row[1]),
                    "cli_bloqueadoapp": str(row[2]),
                    "cli_mensagem": str(row[3]),
                    "cli_caminho_base": str(row[4]),
                    "cli_ip_servidor": str(row[5]),
                    "cli_nome_base": str(row[6]),
                    "cli_porta": porta,
                    "id": int(row[8]),  # VINCULO_ID
                    "usuario_id": int(row[9]),
                    "nivel_acesso": str(row[10]),
                    "email": str(row[11]),
                    "usuario_app_id": int(row[12])
                }
                logging.info(f"[EMPRESAS] Empresa processada: {empresa}")
                empresas.append(empresa)
            except Exception as e:
                logging.error(f"[EMPRESAS] Erro ao processar empresa: {str(e)}")
                logging.error(f"[EMPRESAS] Linha com erro: {row}")
                continue
        
        conn.close()
        logging.info(f"[EMPRESAS] {len(empresas)} empresas encontradas para o email {email}")
        return empresas
    except Exception as e:
        logging.error(f"[EMPRESAS] Erro ao obter empresas: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar empresas: {str(e)}"
        )

async def obter_empresa_controladora(usuario_id: int):
    """
    Obtém os dados da empresa controladora para um usuário.
    """
    try:
        conn = obter_conexao_controladora()
        cursor = conn.cursor()
        
        # Consulta a empresa controladora do usuário
        cursor.execute("""
            SELECT 
                C.CLI_CODIGO, 
                C.CLI_NOME, 
                C.CLI_CAMINHO_BASE, 
                C.CLI_IP_SERVIDOR,
                C.CLI_NOME_BASE,
                CAST(C.CLI_PORTA AS VARCHAR(10)) as CLI_PORTA,
                C.CLI_MENSAGEM,
                C.CLI_BLOQUEADOAPP
            FROM CONFIG_APP
            WHERE CHAVE_CONFIG = 'EMPRESA_CONTROLADORA'
        """)
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
            
        return {
            "cli_codigo": row[0],
            "cli_nome": row[1],
            "cli_caminho_base": row[2],
            "cli_ip_servidor": row[3],
            "cli_nome_base": row[4],
            "cli_porta": str(row[5]) if row[5] else '3050',
            "cli_mensagem": row[6],
            "cli_bloqueadoapp": row[7]
        }
    except Exception as e:
        logging.error(f"Erro ao obter empresa controladora: {str(e)}")
        return None

async def obter_empresa_por_codigo(cli_codigo: int):
    """
    Obtém os dados de uma empresa pelo código.
    """
    try:
        conn = obter_conexao_controladora()
        cursor = conn.cursor()
        
        # Consulta a empresa pelo código
        cursor.execute("""
            SELECT 
                CLI_CODIGO, 
                CLI_NOME, 
                CLI_CAMINHO_BASE, 
                CLI_IP_SERVIDOR,
                CLI_NOME_BASE,
                CAST(CLI_PORTA AS VARCHAR(10)) as CLI_PORTA,
                CLI_MENSAGEM,
                CLI_BLOQUEADOAPP
            FROM CLIENTES
            WHERE CLI_CODIGO = ?
        """, (cli_codigo,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
            
        return {
            "cli_codigo": row[0],
            "cli_nome": row[1],
            "cli_caminho_base": row[2],
            "cli_ip_servidor": row[3],
            "cli_nome_base": row[4],
            "cli_porta": str(row[5]) if row[5] else '3050',
            "cli_mensagem": row[6],
            "cli_bloqueadoapp": row[7]
        }
    except Exception as e:
        logging.error(f"Erro ao obter empresa por código: {str(e)}")
        return None

async def verificar_acesso_empresa(usuario_id: int, cli_codigo: int):
    """
    Verifica se o usuário tem acesso à empresa.
    """
    try:
        conn = obter_conexao_controladora()
        cursor = conn.cursor()
        
        # Verifica se o usuário tem acesso à empresa
        cursor.execute("""
            SELECT 1
            FROM USUARIOS_CLIENTES
            WHERE USUARIO_ID = ? AND CLI_CODIGO = ?
        """, (usuario_id, cli_codigo))
        
        result = cursor.fetchone()
        conn.close()
        
        return result is not None
    except Exception as e:
        logging.error(f"Erro ao verificar acesso à empresa: {str(e)}")
        return False

async def selecionar_empresa(usuario_id: int, cli_codigo: int):
    """
    Seleciona uma empresa para o usuário.
    Implementação assíncrona que não bloqueia outras requisições.
    Usa pool de threads para operações bloqueantes.
    """
    log.info(f"Selecionando empresa {cli_codigo} para usuário {usuario_id}")
    
    # Verificar se o usuário existe
    try:
        # Usar pool de threads para operações bloqueantes
        loop = asyncio.get_event_loop()
        conn_controladora = await loop.run_in_executor(thread_pool, obter_conexao_controladora)
        cursor_controladora = conn_controladora.cursor()
        
        cursor_controladora.execute("""
            SELECT ID, NIVEL_ACESSO FROM USUARIOS_APP 
            WHERE ID = ?
        """, (usuario_id,))
        
        usuario = cursor_controladora.fetchone()
        conn_controladora.close()
        
        if not usuario:
            log.error(f"Usuário {usuario_id} não encontrado")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
            
        nivel_acesso = usuario[1]
    except Exception as e:
        log.error(f"Erro ao verificar usuário: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao verificar usuário: {str(e)}"
        )
    
    # Obter dados da empresa
    try:
        # Usar pool de threads para operações bloqueantes
        loop = asyncio.get_event_loop()
        conn_controladora = await loop.run_in_executor(thread_pool, obter_conexao_controladora)
        cursor_controladora = conn_controladora.cursor()
        
        cursor_controladora.execute("""
            SELECT 
                CLI_CODIGO, 
                CLI_NOME, 
                CLI_CAMINHO_BASE, 
                CLI_IP_SERVIDOR,
                CLI_NOME_BASE,
                CAST(CLI_PORTA AS VARCHAR(10)) as CLI_PORTA,
                CLI_MENSAGEM,
                CLI_BLOQUEADOAPP
            FROM CLIENTES
            WHERE CLI_CODIGO = ?
        """, (cli_codigo,))
        
        row = cursor_controladora.fetchone()
        conn_controladora.close()
        
        if not row:
            log.error(f"Empresa {cli_codigo} não encontrada")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Empresa não encontrada"
            )
            
        empresa = {
            "cli_codigo": row[0],
            "cli_nome": row[1],
            "cli_caminho_base": row[2],
            "cli_ip_servidor": row[3],
            "cli_nome_base": row[4],
            "cli_porta": str(row[5]) if row[5] else '3050',
            "cli_mensagem": row[6],
            "cli_bloqueadoapp": row[7]
        }
    except Exception as e:
        log.error(f"Erro ao obter dados da empresa: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter dados da empresa: {str(e)}"
        )
    
    # Verificar se a empresa está bloqueada
    if empresa['cli_bloqueadoapp'] == 'S':
        log.warning(f"Empresa {cli_codigo} está bloqueada")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=empresa['cli_mensagem'] or "Empresa bloqueada para acesso"
        )
    
    # Verificar se o usuário tem acesso à empresa
    try:
        # Usar pool de threads para operações bloqueantes
        loop = asyncio.get_event_loop()
        conn_controladora = await loop.run_in_executor(thread_pool, obter_conexao_controladora)
        cursor_controladora = conn_controladora.cursor()
        
        cursor_controladora.execute("""
            SELECT COUNT(*) 
            FROM USUARIOS_CLIENTES 
            WHERE USUARIO_ID = ? AND CLI_CODIGO = ?
        """, (usuario_id, cli_codigo))
        
        tem_acesso = cursor_controladora.fetchone()[0] > 0
        conn_controladora.close()
        
        if not tem_acesso and nivel_acesso != 'A':
            log.warning(f"Usuário {usuario_id} não tem acesso à empresa {cli_codigo}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário não tem acesso a esta empresa"
            )
    except Exception as e:
        log.error(f"Erro ao verificar acesso do usuário: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao verificar acesso: {str(e)}"
        )
    
    # Testar conexão com a empresa de forma assíncrona
    try:
        # Usar pool de threads para operações bloqueantes
        loop = asyncio.get_event_loop()
        connection = await loop.run_in_executor(thread_pool, obter_conexao_cliente, empresa)
        
        # Testa a conexão fazendo uma consulta simples
        conexao_ok, info = await testar_conexao(connection)
        connection_success = conexao_ok
        connection_info = info
        
        # Fecha a conexão após o teste
        connection.close()
        
        # Se a conexão for bem-sucedida, verificar se o usuário é vendedor e se tem email cadastrado
        if connection_success:
            # Obter dados do usuário para verificar se é vendedor
            try:
                # Usar pool de threads para operações bloqueantes
                loop = asyncio.get_event_loop()
                conn_controladora = await loop.run_in_executor(thread_pool, obter_conexao_controladora)
                cursor_controladora = conn_controladora.cursor()
                
                cursor_controladora.execute("""
                    SELECT ID, EMAIL, NIVEL_ACESSO FROM USUARIOS_APP 
                    WHERE ID = ?
                """, (usuario_id,))
                
                usuario_info = cursor_controladora.fetchone()
                conn_controladora.close()
                
                if not usuario_info:
                    log.error(f"Usuário {usuario_id} não encontrado após conexão bem-sucedida")
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Usuário não encontrado"
                    )
                    
                email = usuario_info[1]
                nivel_acesso = usuario_info[2]
                
                # Se for vendedor, verificar se tem email cadastrado
                if nivel_acesso == 'V' and not email:
                    log.warning(f"Vendedor {usuario_id} não tem email cadastrado")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Vendedores precisam ter um email cadastrado"
                    )
            except Exception as e:
                log.error(f"Erro ao verificar dados do usuário: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Erro ao verificar dados do usuário: {str(e)}"
                )
    except Exception as e:
        log.error(f"Erro ao testar conexão com a empresa: {str(e)}")
        connection_success = False
        connection_info = {"erro": str(e)}
    
    # Preparar resposta
    empresa_dict = {
        "cli_codigo": empresa['cli_codigo'],
        "cli_nome": empresa['cli_nome'],
        "cli_caminho_base": empresa['cli_caminho_base'],
        "cli_ip_servidor": empresa['cli_ip_servidor'],
        "cli_nome_base": empresa['cli_nome_base'],
        "cli_porta": empresa['cli_porta'],
        "cli_mensagem": empresa['cli_mensagem'],
        "cli_bloqueadoapp": empresa['cli_bloqueadoapp'],
        "conexao_sucesso": connection_success,
        "conexao_info": connection_info
    }
    
    if not connection_success:
        empresa_dict["conexao_erro"] = str(connection_info.get('erro', 'Erro desconhecido'))
        log.warning(f"Conexão com a base do cliente {cli_codigo} falhou: {connection_info.get('erro')}")
    else:
        log.info(f"Conexão com a base do cliente {cli_codigo} estabelecida com sucesso")
    
    log.info(f"Empresa {cli_codigo} selecionada com sucesso para o usuário {usuario_id}")
    return empresa_dict

def get_empresa_atual(request: Request):
    """
    Obtém a empresa atual do usuário a partir do token JWT e/ou cabeçalhos.
    Prioridade:
    1. Cabeçalho x-empresa-codigo (para componentes como TopClientes)
    2. Sessão do usuário (para aplicação completa)
    """
    log.info("=== INICIANDO GET_EMPRESA_ATUAL ===")
    log.info(f"Headers disponíveis: {list(request.headers.keys())}")
    try:
        # Obtém o token da requisição
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Não autorizado",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token = authorization.replace("Bearer ", "")
        
        # Decodifica o token
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            usuario_id = payload.get("id")
            if not usuario_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token inválido",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Verificar primeiro se o cabeçalho x-empresa-codigo está presente
        empresa_codigo_header = request.headers.get("x-empresa-codigo")
        log.info(f"Cabeçalho x-empresa-codigo: {empresa_codigo_header}")
        
        # Imprimir todos os cabeçalhos para diagnóstico
        log.info("Todos os cabeçalhos:")
        for key, value in request.headers.items():
            log.info(f"  {key}: {value}")
        
        if empresa_codigo_header:
            try:
                # Converter para inteiro
                empresa_codigo = int(empresa_codigo_header)
                log.info(f"Usando empresa do cabeçalho: {empresa_codigo}")
                
                # Buscar empresa pelo código
                log.info(f"Buscando empresa no banco com código {empresa_codigo}...")
                
                try:
                    # Usar a conexão direta ao invés de ORM
                    conn = database.get_connection()
                    cursor = conn.cursor()
                    
                    # Buscar diretamente a empresa especificada sem listar todas
                    log.info(f"Buscando empresa com código {empresa_codigo}...")
                    cursor.execute("""
                        SELECT 
                            CLI_CODIGO, 
                            CLI_NOME, 
                            CLI_CAMINHO_BASE, 
                            CLI_IP_SERVIDOR, 
                            CLI_NOME_BASE, 
                            CAST(CLI_PORTA AS VARCHAR(10)) as CLI_PORTA 
                        FROM CLIENTES 
                        WHERE CLI_CODIGO = ?
                    """, (empresa_codigo,))
                    empresa_db = cursor.fetchone()
                
                    if empresa_db:
                        log.info(f"Empresa encontrada: {empresa_db[1]}")
                        # Converter para dicionário com os campos corretos
                        empresa = {
                            "cli_codigo": empresa_db[0],
                            "cli_nome": empresa_db[1],
                            "cli_caminho_base": empresa_db[2] or '',
                            "cli_ip_servidor": empresa_db[3] or '127.0.0.1',
                            "cli_nome_base": empresa_db[4] or '',
                            "cli_porta": str(empresa_db[5]) if empresa_db[5] is not None else '3050',
                        }
                        conn.close()
                        return empresa
                    else:
                        log.warning(f"Empresa com código {empresa_codigo} não encontrada no banco de dados")
                        conn.close()
                except Exception as db_err:
                    log.error(f"Erro ao consultar empresa no banco: {str(db_err)}")
                    if 'conn' in locals():
                        try:
                            conn.close()
                        except:
                            pass
            except Exception as e:
                log.error(f"Erro ao processar cabeçalho x-empresa-codigo: {str(e)}")
                # Continue para a próxima opção (sessão do usuário)
        
        # Se não encontrou pelo cabeçalho, use a empresa da sessão
        log.info(f"Buscando empresa na sessão para o usuário {usuario_id}")
        log.info(f"Estado atual da sessão global: {len(empresa_sessions)} empresas armazenadas")
        log.info(f"Usuários com empresa na sessão: {list(empresa_sessions.keys())}")
        
        empresa = empresa_sessions.get(usuario_id)
        if not empresa:
            log.warning(f"Nenhuma empresa encontrada na sessão para o usuário {usuario_id}")
            # Em vez de lançar uma exceção, vamos retornar uma empresa padrão vazia
            # Isso permite que o frontend decida como lidar com a situação
            log.info("Retornando empresa padrão vazia")
            return {
                "cli_codigo": 0,
                "cli_nome": "Selecione uma empresa",
                "cli_caminho_base": "",
                "cli_ip_servidor": "",
                "cli_nome_base": "",
                "cli_porta": "3050",
                "cli_cnpj": "Nenhuma empresa selecionada",
                "empresa_nao_selecionada": True
            }
        
        # Garantir que a porta seja uma string válida
        if 'cli_porta' not in empresa or empresa['cli_porta'] is None:
            empresa['cli_porta'] = '3050'
        else:
            empresa['cli_porta'] = str(empresa['cli_porta'])
        
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
    """
    empresa = get_empresa_atual(request)
    
    # Verificar se a empresa é válida antes de tentar conectar
    if empresa.get('empresa_nao_selecionada', False) or not empresa or empresa.get('cli_codigo', 0) == 0:
        logging.warning("Nenhuma empresa válida selecionada")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selecione uma empresa válida antes de prosseguir"
        )
    
    # Verificar se os dados mínimos estão presentes
    if not empresa.get('cli_ip_servidor'):
        logging.error(f"IP do servidor não configurado para empresa {empresa.get('cli_codigo')}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Configuração da empresa incompleta: IP do servidor não definido"
        )
    
    if not empresa.get('cli_caminho_base') and not empresa.get('cli_nome_base'):
        logging.error(f"Caminho da base não configurado para empresa {empresa.get('cli_codigo')}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Configuração da empresa incompleta: caminho da base não definido"
        )
    
    try:
        # Certificar-se de que a empresa tenha uma porta definida
        if 'cli_porta' not in empresa or not empresa['cli_porta']:
            logging.warning(f"Porta não definida para empresa {empresa.get('cli_codigo')}, usando 3050 como padrão")
            empresa['cli_porta'] = '3050'
            
        logging.info(f"Tentando conectar à empresa com IP: {empresa.get('cli_ip_servidor')}, Porta: {empresa.get('cli_porta')}, Base: {empresa.get('cli_nome_base')}")
        return obter_conexao_cliente(empresa)
    except Exception as e:
        logging.error(f"Erro ao conectar à empresa: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao conectar à empresa: {str(e)}",
        )
