from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import Dict, Any, List
import logging
from empresa_manager import obter_empresas_usuario, get_empresa_atual, get_empresa_connection
from jose import JWTError, jwt
from pydantic import BaseModel

# Configuração de segurança
from empresa_manager import SECRET_KEY, ALGORITHM

# Importar modelo de EmpresaSelect
from empresa_manager import EmpresaSelect

# Configurar o logger
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("teste_selecionar")

# Configurar o router
router = APIRouter(tags=["Teste Selecionar"])

class EmpresaSelectSimples(BaseModel):
    """Versão simplificada do modelo EmpresaSelect apenas com o código"""
    cli_codigo: int

@router.post("/teste-selecionar-simples")
async def teste_selecionar_simples(empresa: EmpresaSelectSimples, request: Request):
    """
    Endpoint simplificado para testar a seleção de empresa.
    """
    try:
        log.info(f"Testando seleção simples para empresa código: {empresa.cli_codigo}")
        
        # Obter token da requisição
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            return {
                "sucesso": False,
                "mensagem": "Token não fornecido ou inválido"
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
                    "mensagem": "Token inválido ou expirado"
                }
                
            # Não precisamos manipular o cabeçalho diretamente, vamos usar diretamente a função
            # get_empresa_atual e simplesmente simular uma requisição com o código da empresa
            log.info(f"Buscando empresa com código {empresa.cli_codigo} pelo objeto de sessão...")
            
            try:
                # Obter informações da empresa
                info_empresa = get_empresa_atual(request)
                
                return {
                    "sucesso": True,
                    "mensagem": f"Empresa {info_empresa['cli_nome']} encontrada na sessão",
                    "empresa": {
                        "codigo": info_empresa['cli_codigo'],
                        "nome": info_empresa['cli_nome'],
                        "ip": info_empresa['cli_ip_servidor'],
                        "porta": info_empresa['cli_porta'],
                        "caminho_base": info_empresa['cli_caminho_base'],
                        "nome_base": info_empresa['cli_nome_base']
                    },
                    "request_info": {
                        "auth_header_present": authorization is not None,
                        "empresa_header_present": request.headers.get("x-empresa-codigo") is not None,
                        "empresa_header_value": request.headers.get("x-empresa-codigo"),
                        "cookie_count": len(request.cookies),
                        "cookie_keys": list(request.cookies.keys())
                    }
                }
            except Exception as e:
                log.error(f"Erro ao obter informações da empresa: {str(e)}")
                return {
                    "sucesso": False,
                    "mensagem": f"Erro ao obter informações da empresa: {str(e)}",
                    "empresa": {"cli_codigo": empresa.cli_codigo},
                    "usuario": {
                        "id": usuario_id,
                        "email": email
                    }
                }
                
        except JWTError as e:
            log.error(f"Erro ao decodificar token: {str(e)}")
            return {
                "sucesso": False,
                "mensagem": f"Token inválido: {str(e)}"
            }
            
    except Exception as e:
        log.error(f"Erro no teste de seleção de empresa: {str(e)}")
        return {
            "sucesso": False,
            "mensagem": f"Erro: {str(e)}"
        }
