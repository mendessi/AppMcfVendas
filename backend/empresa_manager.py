from fastapi import HTTPException, status, Request, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from jose import JWTError, jwt
import logging
import os
from conexao_firebird import obter_conexao_cliente, obter_conexao_controladora

# Configuração de segurança
SECRET_KEY = os.getenv("SECRET_KEY", "chave_secreta_temporaria_mude_em_producao")
ALGORITHM = "HS256"

# Modelo para seleção de empresa
class EmpresaSelect(BaseModel):
    cli_codigo: int

# Modelo para dados da empresa
class EmpresaData(BaseModel):
    cli_codigo: int
    cli_nome: str
    cli_caminho_base: str
    cli_ip_servidor: str
    cli_nome_base: str
    cli_porta: str
    cli_mensagem: Optional[str] = None
    cli_bloqueadoapp: str

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
                empresa = {
                    "cli_codigo": int(row[0]),
                    "cli_nome": str(row[1]),
                    "cli_bloqueadoapp": str(row[2]),
                    "cli_mensagem": str(row[3]),
                    "cli_caminho_base": str(row[4]),
                    "cli_ip_servidor": str(row[5]),
                    "cli_nome_base": str(row[6]),
                    "cli_porta": str(row[7]),
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
                C.CLI_PORTA,
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
            "cli_porta": row[5],
            "cli_mensagem": row[6],
            "cli_bloqueadoapp": row[7]
        }
    except Exception as e:
        logging.error(f"Erro ao obter empresa controladora: {str(e)}")
        return None

async def obter_empresa_por_codigo(cli_codigo: int) -> Dict[str, Any]:
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
                CLI_PORTA,
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
            "cli_porta": row[5],
            "cli_mensagem": row[6],
            "cli_bloqueadoapp": row[7]
        }
    except Exception as e:
        logging.error(f"[EMPRESAS] Erro ao obter empresa por código: {str(e)}")
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
            FROM USUARIOS_CLIENTES
            WHERE USUARIO_ID = ? AND CLI_CODIGO = ?
        """, (usuario_id, cli_codigo))
        
        result = cursor.fetchone()
        conn.close()
        
        return result is not None
    except Exception as e:
        logging.error(f"[EMPRESAS] Erro ao verificar acesso à empresa: {str(e)}")
        return False

async def selecionar_empresa(usuario_id: int, cli_codigo: int):
    """
    Seleciona uma empresa para o usuário e armazena na sessão.
    """
    logging.info(f"[DIAGNÓSTICO] Iniciando seleção de empresa: user_id={usuario_id}, cli_codigo={cli_codigo}")
    logging.info(f"[DIAGNÓSTICO] Estado atual de empresa_sessions: {empresa_sessions}")
    
    # Verifica se o usuário tem acesso à empresa
    tem_acesso = await verificar_acesso_empresa(usuario_id, cli_codigo)
    if not tem_acesso:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário não tem acesso a esta empresa"
        )
    
    # Obtém os dados da empresa
    empresa = await obter_empresa_por_codigo(cli_codigo)
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    
    # Verifica se a empresa está bloqueada
    if empresa["cli_bloqueadoapp"] == "S":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=empresa["cli_mensagem"] or "Acesso bloqueado para esta empresa"
        )
    
    # Armazena a empresa selecionada na sessão
    empresa_sessions[usuario_id] = empresa
    logging.info(f"[DIAGNÓSTICO] Empresa salva em empresa_sessions. Chaves disponíveis: {list(empresa_sessions.keys())}")
    logging.info(f"[DIAGNÓSTICO] Dados da empresa salva: {empresa_sessions[usuario_id]}")
    
    # Testa a conexão com a empresa
    try:
        conn = obter_conexao_cliente(empresa)
        conn.close()
    except Exception as e:
        # Remove a empresa da sessão em caso de erro
        if usuario_id in empresa_sessions:
            del empresa_sessions[usuario_id]
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao conectar à empresa: {str(e)}"
        )
    
    return empresa

def get_empresa_atual(request: Request):
    """
    Obtém a empresa atual do usuário a partir do token JWT.
    """
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
        
        # Obtém a empresa da sessão
        empresa = empresa_sessions.get(usuario_id)
        if not empresa:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nenhuma empresa selecionada",
            )
        
        return empresa
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro ao obter empresa atual: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter empresa atual: {str(e)}",
        )

# Função para obter conexão com a empresa atual
async def get_empresa_connection(request: Request):
    """
    Obtém uma conexão com a empresa atual do usuário.
    """
    empresa = get_empresa_atual(request)
    try:
        return obter_conexao_cliente(empresa)
    except Exception as e:
        logging.error(f"Erro ao conectar à empresa: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao conectar à empresa: {str(e)}",
        )
