from fastapi import APIRouter, Request
from pydantic import BaseModel
import logging
from jose import jwt
from empresa_manager import empresa_sessions, SECRET_KEY, ALGORITHM

# Configurar o logger
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("teste_session_simples")

# Configurar o router
router = APIRouter(tags=["Teste Session Simples"])

class EmpresaSimples(BaseModel):
    codigo: int
    nome: str = "SANTOS INDUSTRIA"
    ip: str = "149.56.77.81"
    porta: str = "3050"
    caminho_base: str = "C:\\ERP_MACFIN\\Banco\\Santos"
    nome_base: str = "BASE_PRI.GDB"

@router.post("/salvar-empresa-simples")
async def salvar_empresa_simples(empresa: EmpresaSimples, request: Request):
    """
    Endpoint super simples para salvar uma empresa na sessão
    """
    try:
        # Log para console usando print (isso deve aparecer mesmo sem logging configurado)
        print(f"==== SALVANDO EMPRESA NA SESSÃO: {empresa.codigo} - {empresa.nome} ====")
        
        # Verificar autorização básica
        auth_header = request.headers.get("Authorization", "")
        if not auth_header or not auth_header.startswith("Bearer "):
            print("Token não fornecido")
            return {"sucesso": False, "mensagem": "Token não fornecido"}
        
        token = auth_header.replace("Bearer ", "")
        
        try:
            # Decodificar token
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            usuario_id = payload.get("id")
            
            if not usuario_id:
                print("Token inválido - ID não encontrado")
                return {"sucesso": False, "mensagem": "Token inválido"}
            
            print(f"Usuário autenticado: ID={usuario_id}")
            
            # Dados da empresa (simplificados ao máximo)
            dados_empresa = {
                "cli_codigo": empresa.codigo,
                "cli_nome": empresa.nome,
                "cli_ip_servidor": empresa.ip,
                "cli_porta": empresa.porta,
                "cli_caminho_base": empresa.caminho_base,
                "cli_nome_base": empresa.nome_base,
                "cli_bloqueadoapp": "N"
            }
            
            # Salvar na sessão global
            empresa_sessions[usuario_id] = dados_empresa
            
            print(f"Empresa salva na sessão: {empresa.nome} (ID={empresa.codigo})")
            print(f"Usuários com empresa na sessão: {list(empresa_sessions.keys())}")
            
            return {
                "sucesso": True,
                "mensagem": f"Empresa {empresa.nome} salva na sessão com sucesso",
                "empresa": dados_empresa,
                "sessao_info": {
                    "usuario_id": usuario_id,
                    "empresas_na_sessao": len(empresa_sessions),
                    "empresa_salva": usuario_id in empresa_sessions
                }
            }
            
        except Exception as e:
            print(f"Erro ao processar token: {str(e)}")
            return {"sucesso": False, "mensagem": f"Erro no token: {str(e)}"}
            
    except Exception as e:
        print(f"Erro geral: {str(e)}")
        return {"sucesso": False, "mensagem": f"Erro: {str(e)}"}
