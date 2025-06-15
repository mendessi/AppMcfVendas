from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import Dict, Any, List
import logging
from empresa_manager import get_empresa_atual, obter_empresas_usuario
from jose import JWTError, jwt

# Configuração de segurança
from empresa_manager import SECRET_KEY, ALGORITHM

# Configurar o logger
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("teste_empresa")

# Configurar o router
router = APIRouter(tags=["Teste"])

@router.get("/teste-empresa-atual")
async def teste_empresa_atual(request: Request):
    """
    Endpoint de teste para verificar a empresa atualmente selecionada na sessão.
    Retorna detalhes sobre a empresa para debug.
    """
    try:
        log.info("Testando acesso à empresa atual")
        
        # Obter informações da requisição para debug
        auth_header = request.headers.get("Authorization", "")
        empresa_header = request.headers.get("x-empresa-codigo", "")
        
        log.info(f"Auth header: {auth_header[:15]}... / Empresa header: {empresa_header}")
        
        # Verificar cookies e sessão
        cookies = request.cookies
        cookie_keys = list(cookies.keys())
        
        # Tentar obter a empresa atual
        try:
            empresa = get_empresa_atual(request)
            log.info(f"Empresa encontrada: {empresa.get('cli_nome', 'Nome não encontrado')}")
            
            # Construir resposta detalhada
            return {
                "sucesso": True,
                "mensagem": "Empresa encontrada na sessão",
                "empresa": {
                    "codigo": empresa.get("cli_codigo"),
                    "nome": empresa.get("cli_nome"),
                    "ip": empresa.get("cli_ip_servidor"),
                    "porta": empresa.get("cli_porta"),
                    "caminho_base": empresa.get("cli_caminho_base"),
                    "nome_base": empresa.get("cli_nome_base")
                },
                "request_info": {
                    "auth_header_present": bool(auth_header),
                    "empresa_header_present": bool(empresa_header),
                    "empresa_header_value": empresa_header,
                    "cookie_count": len(cookie_keys),
                    "cookie_keys": cookie_keys
                }
            }
        except Exception as e:
            log.error(f"Erro ao obter empresa atual: {str(e)}")
            return {
                "sucesso": False,
                "mensagem": f"Erro ao obter empresa: {str(e)}",
                "request_info": {
                    "auth_header_present": bool(auth_header),
                    "empresa_header_present": bool(empresa_header),
                    "empresa_header_value": empresa_header,
                    "cookie_count": len(cookie_keys),
                    "cookie_keys": cookie_keys
                }
            }
    except Exception as e:
        log.error(f"Erro no teste de empresa: {str(e)}")
        return {
            "sucesso": False,
            "mensagem": f"Erro no teste: {str(e)}"
        }

@router.get("/teste-listar-empresas")
async def teste_listar_empresas(request: Request):
    """
    Endpoint de teste para listar as empresas disponíveis para o usuário.
    """
    try:
        log.info("Teste de listagem de empresas")
        
        # Obter token da requisição
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            return {
                "sucesso": False,
                "mensagem": "Token não fornecido ou inválido",
                "empresas": []
            }
        
        token = authorization.replace("Bearer ", "")
        
        try:
            # Decodificar token
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            usuario_id = payload.get("id")
            email = payload.get("sub")
            
            if not usuario_id or not email:
                return {
                    "sucesso": False,
                    "mensagem": "Token inválido ou expirado",
                    "empresas": []
                }
                
            # Obter empresas do usuário
            if email:
                log.info(f"Listando empresas para usuário ID={usuario_id}, Email={email}")
                empresas = await obter_empresas_usuario(email)
                
                # Formatar resposta
                return {
                    "sucesso": True,
                    "mensagem": f"Encontradas {len(empresas)} empresas",
                    "empresas": empresas,
                    "usuario": {
                        "id": usuario_id,
                        "email": email
                    }
                }
            else:
                return {
                    "sucesso": False,
                    "mensagem": "Email não encontrado no token",
                    "empresas": []
                }
                
        except JWTError as e:
            log.error(f"Erro ao decodificar token: {str(e)}")
            return {
                "sucesso": False,
                "mensagem": f"Token inválido: {str(e)}",
                "empresas": []
            }
            
    except Exception as e:
        log.error(f"Erro ao listar empresas: {str(e)}")
        return {
            "sucesso": False,
            "mensagem": f"Erro: {str(e)}",
            "empresas": []
        }
