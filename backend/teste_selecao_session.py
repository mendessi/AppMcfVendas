from fastapi import APIRouter, Request, Depends, HTTPException, status
from typing import Dict, Any, List, Optional
import logging
from pydantic import BaseModel
from jose import JWTError, jwt
from empresa_manager import obter_empresas_usuario, empresa_sessions, SECRET_KEY, ALGORITHM

# Configurar o logger
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("teste_selecao_session")

# Configurar o router
router = APIRouter(tags=["Teste Seleção Session"])

class SelecionarEmpresaRequest(BaseModel):
    cli_codigo: int

@router.post("/selecionar-empresa-session")
async def selecionar_empresa_session(empresa: SelecionarEmpresaRequest, request: Request):
    """
    Endpoint para selecionar uma empresa e salvar na sessão do usuário.
    """
    try:
        log.info(f"Tentando selecionar empresa {empresa.cli_codigo} e salvar na sessão")
        
        # Verificar autorização
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            log.error("Token de autorização não fornecido")
            return {
                "sucesso": False,
                "mensagem": "Token de autorização não fornecido"
            }
        
        token = authorization.replace("Bearer ", "")
        
        try:
            # Decodificar token JWT
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            usuario_id = payload.get("id")
            
            if not usuario_id:
                log.error("Token inválido - ID de usuário não encontrado")
                return {
                    "sucesso": False,
                    "mensagem": "Token inválido"
                }
                
            # Buscar empresa no banco de dados
            try:
                from teste_empresa_crud import EmpresaModel, get_db
                
                db = get_db()
                empresa_db = db.query(EmpresaModel).filter(EmpresaModel.cli_codigo == empresa.cli_codigo).first()
                
                if not empresa_db:
                    log.error(f"Empresa com código {empresa.cli_codigo} não encontrada")
                    return {
                        "sucesso": False,
                        "mensagem": f"Empresa com código {empresa.cli_codigo} não encontrada"
                    }
                
                # Salvar empresa na sessão
                empresa_data = {
                    "cli_codigo": empresa_db.cli_codigo,
                    "cli_nome": empresa_db.cli_nome,
                    "cli_caminho_base": empresa_db.cli_caminho_base,
                    "cli_ip_servidor": empresa_db.cli_ip_servidor,
                    "cli_nome_base": empresa_db.cli_nome_base,
                    "cli_porta": empresa_db.cli_porta if empresa_db.cli_porta else "3050",
                    "cli_bloqueadoapp": empresa_db.cli_bloqueadoapp if empresa_db.cli_bloqueadoapp else "N"
                }
                
                # Armazenar na sessão global
                empresa_sessions[usuario_id] = empresa_data
                
                log.info(f"Empresa {empresa_db.cli_nome} salva na sessão para o usuário {usuario_id}")
                
                return {
                    "sucesso": True,
                    "mensagem": f"Empresa {empresa_db.cli_nome} selecionada com sucesso",
                    "empresa": empresa_data,
                    "debug_info": {
                        "usuario_id": usuario_id,
                        "empresa_sessions_count": len(empresa_sessions),
                        "empresa_in_session": usuario_id in empresa_sessions
                    }
                }
            except Exception as e:
                log.error(f"Erro ao buscar empresa no banco: {str(e)}")
                return {
                    "sucesso": False,
                    "mensagem": f"Erro ao buscar empresa: {str(e)}"
                }
            
        except JWTError as e:
            log.error(f"Erro ao decodificar token: {str(e)}")
            return {
                "sucesso": False,
                "mensagem": f"Token inválido: {str(e)}"
            }
            
    except Exception as e:
        log.error(f"Erro ao selecionar empresa: {str(e)}")
        return {
            "sucesso": False,
            "mensagem": f"Erro ao selecionar empresa: {str(e)}"
        }
