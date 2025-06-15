from fastapi import APIRouter, Request, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import socket
import platform
import os
import sys
import logging
import jwt
from datetime import datetime
import fdb
import traceback

# Importar funções necessárias
from auth import get_current_user, SECRET_KEY, ALGORITHM
from empresa_manager import get_empresa_atual, get_empresa_connection

# Configurar o router
router = APIRouter(tags=["Diagnóstico"])

class DiagnosticoRequest(BaseModel):
    """Modelo para solicitação de diagnóstico com parâmetros opcionais"""
    empresa_codigo: Optional[int] = None
    test_db: Optional[bool] = True
    test_jwt: Optional[bool] = True
    include_headers: Optional[bool] = True
    include_env: Optional[bool] = True

@router.post("/diagnostico-acesso")
async def diagnostico_acesso(request: Request, dados: DiagnosticoRequest):
    """
    Endpoint para diagnóstico de acesso que verifica vários aspectos do sistema e da conexão.
    Este endpoint é útil para debugging de problemas de acesso externo e conexão com o banco de dados.
    """
    resultado = {
        "timestamp": datetime.now().isoformat(),
        "ambiente": {},
        "rede": {},
        "headers": {},
        "auth": {},
        "empresa": {},
        "database": {}
    }
    
    # Informações do ambiente
    if dados.include_env:
        try:
            resultado["ambiente"] = {
                "sistema": platform.system(),
                "versao_sistema": platform.version(),
                "python_versao": sys.version,
                "diretorio_atual": os.getcwd(),
                "pid": os.getpid(),
                "encoding": sys.getfilesystemencoding(),
                "timezone": datetime.now().astimezone().tzinfo.tzname(datetime.now())
            }
        except Exception as e:
            resultado["ambiente"]["erro"] = str(e)
    
    # Informações de rede
    try:
        hostname = socket.gethostname()
        resultado["rede"] = {
            "hostname": hostname,
            "ip_local": socket.gethostbyname(hostname),
            "client_host": request.client.host if request.client else "desconhecido",
            "client_port": request.client.port if request.client else "desconhecido",
            "url_base": str(request.base_url),
            "url_path": str(request.url.path),
            "metodo": request.method
        }
    except Exception as e:
        resultado["rede"]["erro"] = str(e)
    
    # Cabeçalhos da requisição
    if dados.include_headers:
        try:
            # Obter todos os cabeçalhos
            headers_dict = dict(request.headers.items())
            
            # Ocultar informações sensíveis
            if "authorization" in headers_dict:
                headers_dict["authorization"] = "Bearer [OCULTO]"
            if "cookie" in headers_dict:
                headers_dict["cookie"] = "[OCULTO]"
                
            resultado["headers"] = headers_dict
        except Exception as e:
            resultado["headers"]["erro"] = str(e)
    
    # Testar autenticação JWT
    if dados.test_jwt:
        try:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.replace("Bearer ", "")
                try:
                    # Tentar decodificar o token
                    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                    resultado["auth"] = {
                        "valido": True,
                        "payload": {
                            "sub": payload.get("sub"),
                            "exp": payload.get("exp"),
                            "exp_data": datetime.fromtimestamp(payload.get("exp")).isoformat() if payload.get("exp") else None,
                            "user_id": payload.get("user_id"),
                            "email": payload.get("email"),
                            "nivel": payload.get("nivel"),
                            "ven_codigo": payload.get("ven_codigo")
                        }
                    }
                except jwt.ExpiredSignatureError:
                    resultado["auth"] = {"valido": False, "erro": "Token expirado"}
                except jwt.InvalidTokenError:
                    resultado["auth"] = {"valido": False, "erro": "Token inválido"}
            else:
                resultado["auth"] = {"valido": False, "erro": "Token não fornecido ou formato inválido"}
        except Exception as e:
            resultado["auth"] = {"valido": False, "erro": str(e), "traceback": traceback.format_exc()}
    
    # Verificar empresa selecionada
    try:
        empresa_codigo = dados.empresa_codigo
        empresa_header = request.headers.get("x-empresa-codigo")
        
        # Priorizar o código da empresa fornecido na requisição
        if empresa_codigo:
            resultado["empresa"]["selecionada_via"] = "parametro"
            resultado["empresa"]["codigo"] = empresa_codigo
        elif empresa_header:
            resultado["empresa"]["selecionada_via"] = "header"
            resultado["empresa"]["codigo"] = empresa_header
        
        # Tentar obter a empresa atual
        empresa = await get_empresa_atual(request)
        if empresa:
            resultado["empresa"]["encontrada"] = True
            resultado["empresa"]["dados"] = {
                "codigo": empresa.cli_codigo,
                "nome": empresa.cli_nome,
                "caminho_base": empresa.cli_caminho_base,
                "ip_servidor": empresa.cli_ip_servidor,
                "nome_base": empresa.cli_nome_base,
                "porta": str(empresa.cli_porta) if hasattr(empresa, 'cli_porta') else str(empresa.get('cli_porta', '3050'))
            }
        else:
            resultado["empresa"]["encontrada"] = False
    except Exception as e:
        resultado["empresa"]["erro"] = str(e)
        resultado["empresa"]["traceback"] = traceback.format_exc()
    
    # Testar conexão com o banco de dados
    if dados.test_db and "dados" in resultado["empresa"]:
        try:
            empresa_dados = resultado["empresa"]["dados"]
            try:
                # Construir a string de conexão para o Firebird
                caminho_completo = os.path.join(
                    empresa_dados["caminho_base"], 
                    empresa_dados["nome_base"]
                )
                
                # Conectar ao banco de dados
                conn = fdb.connect(
                    host=empresa_dados["ip_servidor"],
                    database=caminho_completo,
                    user='SYSDBA',
                    password='masterkey',
                    charset='WIN1252',
                    port=int(empresa_dados["porta"])
                )
                
                resultado["database"]["conexao"] = "sucesso"
                
                # Obter informações do banco de dados
                cursor = conn.cursor()
                
                # Testar versão do Firebird
                cursor.execute("SELECT rdb$get_context('SYSTEM', 'ENGINE_VERSION') FROM rdb$database")
                versao = cursor.fetchone()[0]
                resultado["database"]["versao"] = versao
                
                # Testar existência de tabelas importantes
                tabelas_importantes = ["EMPRESA", "CLIENTES", "USUARIOS_APP", "VENDEDORES", "VENDAS"]
                tabelas_existentes = {}
                
                for tabela in tabelas_importantes:
                    try:
                        cursor.execute(f"SELECT FIRST 1 1 FROM {tabela}")
                        cursor.fetchone()
                        tabelas_existentes[tabela] = True
                    except Exception:
                        tabelas_existentes[tabela] = False
                
                resultado["database"]["tabelas"] = tabelas_existentes
                
                # Executar consulta simples para testar a estrutura
                try:
                    cursor.execute("SELECT COUNT(*) FROM EMPRESA")
                    count = cursor.fetchone()[0]
                    resultado["database"]["contagem_empresas"] = count
                except Exception as e:
                    resultado["database"]["erro_consulta_empresa"] = str(e)
                
                conn.close()
            except Exception as db_err:
                resultado["database"]["conexao"] = "falha"
                resultado["database"]["erro"] = str(db_err)
                resultado["database"]["traceback"] = traceback.format_exc()
        except Exception as e:
            resultado["database"]["erro_geral"] = str(e)
    
    # Retornar resultado completo
    return resultado

@router.get("/info-sistema")
async def info_sistema(request: Request):
    """
    Retorna informações básicas sobre o sistema e o ambiente onde a API está rodando.
    Útil para debug rápido sem necessidade de autenticação.
    """
    try:
        return {
            "sistema": platform.system(),
            "versao": platform.version(),
            "python": sys.version.split()[0],
            "hostname": socket.gethostname(),
            "timestamp": datetime.now().isoformat(),
            "client_ip": request.client.host if request.client else "desconhecido",
            "acesso_externo": request.headers.get("x-external-access") == "true",
            "mobile": request.headers.get("x-mobile-device") == "true",
            "user_agent": request.headers.get("user-agent", "desconhecido")
        }
    except Exception as e:
        return {"erro": str(e)}

# Endpoint para verificar e validar o token JWT
class TokenRequest(BaseModel):
    token: str

@router.post("/verificar-token")
async def verificar_token(dados: TokenRequest):
    """
    Verifica se um token JWT é válido e retorna suas informações decodificadas.
    Útil para debugar problemas com tokens expirados ou inválidos.
    """
    try:
        payload = jwt.decode(dados.token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Calcular tempo restante para expiração
        expiracao = datetime.fromtimestamp(payload.get("exp", 0))
        agora = datetime.now()
        tempo_restante = (expiracao - agora).total_seconds()
        
        return {
            "valido": True,
            "payload": {
                "sub": payload.get("sub"),
                "user_id": payload.get("user_id"),
                "email": payload.get("email"),
                "nivel": payload.get("nivel"),
                "ven_codigo": payload.get("ven_codigo", None)
            },
            "expiracao": {
                "timestamp": payload.get("exp"),
                "data": expiracao.isoformat(),
                "tempo_restante_segundos": tempo_restante,
                "expirado": tempo_restante <= 0
            }
        }
    except jwt.ExpiredSignatureError:
        return {"valido": False, "erro": "Token expirado"}
    except jwt.InvalidTokenError:
        return {"valido": False, "erro": "Token inválido"}
    except Exception as e:
        return {"valido": False, "erro": str(e)}
