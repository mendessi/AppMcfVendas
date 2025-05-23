from fastapi import APIRouter, Request, HTTPException, status
from typing import List, Dict, Any
import logging
import json
from starlette.responses import JSONResponse
from auth import SECRET_KEY, ALGORITHM, obter_conexao_controladora
from jose import jwt, JWTError

# Configuração de logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# Criar um router específico para endpoints móveis simplificados
router = APIRouter(prefix="/mobile", tags=["Mobile"])

@router.get("/empresas")
async def listar_empresas_mobile(request: Request):
    """
    Versão simplificada do endpoint de empresas para dispositivos móveis.
    Não faz validações complexas e retorna respostas mais simples.
    """
    log.info(f"==== MOBILE API: Requisição para listar empresas ====")
    log.info(f"Headers: {dict(request.headers)}")
    
    # Obter o token da requisição
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        log.error("Token não fornecido no cabeçalho Authorization")
        return JSONResponse(
            status_code=401,
            content={"detail": "Token não fornecido"}
        )
    
    token = authorization.replace("Bearer ", "")
    log.info(f"Token recebido (primeiros 10 caracteres): {token[:10]}...")
    
    try:
        # Decodificar o token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        usuario_id = payload.get("id")
        
        if not usuario_id:
            log.error("ID do usuário não encontrado no token")
            return JSONResponse(
                status_code=401,
                content={"detail": "Token inválido - ID não encontrado"}
            )
        
        log.info(f"ID do usuário obtido do token: {usuario_id}")
        
        # Obter empresas do usuário
        try:
            conn = obter_conexao_controladora()
            cursor = conn.cursor()
            
            # Consulta simplificada
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
            
            empresas = []
            for row in cursor.fetchall():
                empresas.append({
                    "cli_codigo": row[0],
                    "cli_nome": row[1],
                    "cli_caminho_base": row[2],
                    "cli_ip_servidor": row[3],
                    "cli_nome_base": row[4],
                    "cli_porta": row[5],
                    "cli_mensagem": row[6],
                    "cli_bloqueadoapp": row[7]
                })
            
            conn.close()
            
            log.info(f"Encontradas {len(empresas)} empresas para o usuário {usuario_id}")
            
            # Retornar as empresas diretamente sem filtros adicionais
            return JSONResponse(
                content=empresas,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization"
                }
            )
            
        except Exception as db_err:
            log.error(f"Erro ao consultar banco de dados: {str(db_err)}")
            return JSONResponse(
                status_code=500,
                content={"detail": f"Erro ao obter empresas: {str(db_err)}"}
            )
            
    except JWTError as jwt_err:
        log.error(f"Erro ao decodificar token JWT: {str(jwt_err)}")
        return JSONResponse(
            status_code=401,
            content={"detail": f"Token inválido: {str(jwt_err)}"}
        )
    except Exception as e:
        log.error(f"Erro não tratado: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Erro interno: {str(e)}"}
        )
