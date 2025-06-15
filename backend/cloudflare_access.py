from fastapi import APIRouter, Request, HTTPException, status, Header
from starlette.responses import JSONResponse
import logging
import json
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from auth import autenticar_usuario, SECRET_KEY, ALGORITHM, obter_conexao_controladora
from datetime import datetime, timedelta
from jose import jwt, JWTError

# Configuração de logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("cloudflare_access")

# Criar router específico para acesso via Cloudflare
router = APIRouter(prefix="/external", tags=["External Access"])

class ExternalLoginRequest(BaseModel):
    email: str
    senha: str
    
class ExternalEmpresaRequest(BaseModel):
    cli_codigo: int
    cli_nome: str
    cli_caminho_base: Optional[str] = None
    cli_ip_servidor: Optional[str] = None
    cli_nome_base: Optional[str] = None
    cli_porta: Optional[str] = None
    
class LoginResponse(BaseModel):
    token: str
    token_type: str
    usuario_id: int
    usuario_nome: str
    usuario_nivel: str
    codigo_vendedor: Optional[str] = None
    
@router.post("/login", response_model=LoginResponse)
async def external_login(request: Request, form_data: ExternalLoginRequest):
    """
    Endpoint de login simplificado para acesso externo via Cloudflare.
    Não utiliza sessões nem cookies.
    """
    log.info(f"Tentativa de login externo: {form_data.email}")
    log.info(f"Headers da requisição: {dict(request.headers)}")
    
    # Registrar informações de diagnóstico
    remote_ip = request.client.host
    user_agent = request.headers.get("user-agent", "unknown")
    is_cloudflare = any(k.lower().startswith("cf-") for k in request.headers.keys())
    
    log.info(f"Diagnóstico de acesso: IP={remote_ip}, Cloudflare={is_cloudflare}")
    log.info(f"User-Agent: {user_agent}")
    
    try:
        # Autenticar o usuário usando a função existente
        user = await autenticar_usuario(form_data.email, form_data.senha)
        
        if not user:
            log.warning(f"Falha na autenticação externa: {form_data.email}")
            return JSONResponse(
                status_code=401,
                content={"detail": "Credenciais inválidas"}
            )
        
        log.info(f"Usuário autenticado via acesso externo: {user['email']}")
        
        # Criar token JWT com tempo de expiração maior para acesso externo
        # (7 dias em vez do padrão de 1 dia)
        expire = datetime.utcnow() + timedelta(days=7)
        
        # IMPORTANTE: garantir que o código do vendedor esteja incluído no token
        to_encode = {
            "sub": user["email"],
            "id": user["id"],
            "nivel": user["nivel"],
            "nome": user.get("nome", user["email"]),
            "exp": expire
        }
        
        # Adicionar código do vendedor se existir
        if "codigo_vendedor" in user and user["codigo_vendedor"]:
            to_encode["codigo_vendedor"] = user["codigo_vendedor"]
            log.info(f"Incluindo código do vendedor no token: {user['codigo_vendedor']}")
        
        # Criar o token
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        
        log.info(f"Login externo bem-sucedido para: {form_data.email}")
        
        # Retornar resposta com token e informações do usuário
        return {
            "token": encoded_jwt,
            "token_type": "bearer",
            "usuario_id": user["id"],
            "usuario_nome": user.get("nome", user["email"]),
            "usuario_nivel": user["nivel"],
            "codigo_vendedor": user.get("codigo_vendedor")
        }
    
    except Exception as e:
        log.error(f"Erro no login externo: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Erro no login: {str(e)}"}
        )

@router.get("/empresas")
async def listar_empresas_externo(request: Request, authorization: Optional[str] = Header(None)):
    """
    Endpoint simplificado para listar empresas de um usuário via acesso externo.
    Não utiliza sessões nem cookies, apenas o token JWT.
    """
    log.info("Requisição externa para listar empresas")
    
    if not authorization or not authorization.startswith("Bearer "):
        log.error("Token não fornecido para listagem externa de empresas")
        return JSONResponse(
            status_code=401,
            content={"detail": "Token de autenticação não fornecido"}
        )
    
    token = authorization.replace("Bearer ", "")
    
    try:
        # Decodificar o token JWT
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        usuario_id = payload.get("id")
        
        if not usuario_id:
            log.error("ID de usuário não encontrado no token")
            return JSONResponse(
                status_code=401,
                content={"detail": "Token inválido - ID não encontrado"}
            )
        
        log.info(f"Obtendo empresas para usuário ID={usuario_id}")
        
        # Obter lista de empresas do usuário
        conn = obter_conexao_controladora()
        cursor = conn.cursor()
        
        # Consulta para obter empresas do usuário
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
            FROM USUARIOS_CLIENTES UC
            JOIN CLIENTES C ON UC.CLI_CODIGO = C.CLI_CODIGO
            WHERE UC.USUARIO_ID = ?
        """, (usuario_id,))
        
        # Converter para lista de dicionários
        empresas = []
        for row in cursor.fetchall():
            empresa = {
                "cli_codigo": row[0],
                "cli_nome": row[1],
                "cli_caminho_base": row[2],
                "cli_ip_servidor": row[3],
                "cli_nome_base": row[4],
                "cli_porta": row[5],
                "cli_mensagem": row[6],
                "cli_bloqueadoapp": row[7]
            }
            empresas.append(empresa)
        
        conn.close()
        
        log.info(f"Empresas encontradas: {len(empresas)}")
        return empresas
    
    except JWTError as e:
        log.error(f"Erro ao decodificar token JWT: {str(e)}")
        return JSONResponse(
            status_code=401,
            content={"detail": f"Token inválido: {str(e)}"}
        )
    except Exception as e:
        log.error(f"Erro ao listar empresas: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Erro ao listar empresas: {str(e)}"}
        )

@router.post("/selecionar-empresa")
async def selecionar_empresa_externo(
    request: Request, 
    empresa_data: ExternalEmpresaRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Endpoint simplificado para selecionar uma empresa via acesso externo.
    Retorna sucesso imediato sem armazenar em sessão, já que usaremos o 
    cabeçalho x-empresa-codigo para as requisições subsequentes.
    """
    log.info(f"Requisição para selecionar empresa {empresa_data.cli_codigo}")
    
    if not authorization or not authorization.startswith("Bearer "):
        return JSONResponse(
            status_code=401,
            content={"detail": "Token de autenticação não fornecido"}
        )
    
    token = authorization.replace("Bearer ", "")
    
    try:
        # Validar o token JWT
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        usuario_id = payload.get("id")
        
        if not usuario_id:
            return JSONResponse(
                status_code=401,
                content={"detail": "Token inválido - ID não encontrado"}
            )
        
        # Verificar se o usuário tem acesso à empresa
        conn = obter_conexao_controladora()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 1 
            FROM USUARIOS_CLIENTES 
            WHERE USUARIO_ID = ? AND CLI_CODIGO = ?
        """, (usuario_id, empresa_data.cli_codigo))
        
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            log.warning(f"Usuário {usuario_id} não tem acesso à empresa {empresa_data.cli_codigo}")
            return JSONResponse(
                status_code=403,
                content={"detail": "Usuário não tem acesso a esta empresa"}
            )
        
        # Em modo externo, não armazenamos na sessão
        # Apenas retornamos sucesso
        log.info(f"Empresa {empresa_data.cli_codigo} selecionada com sucesso para usuário {usuario_id}")
        return {
            "message": "Empresa selecionada com sucesso",
            "empresa": {
                "cli_codigo": empresa_data.cli_codigo,
                "cli_nome": empresa_data.cli_nome
            }
        }
    
    except JWTError as e:
        log.error(f"Erro ao decodificar token JWT: {str(e)}")
        return JSONResponse(
            status_code=401,
            content={"detail": f"Token inválido: {str(e)}"}
        )
    except Exception as e:
        log.error(f"Erro ao selecionar empresa: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Erro ao selecionar empresa: {str(e)}"}
        )
