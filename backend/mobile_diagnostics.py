from fastapi import APIRouter, Request, HTTPException, status
from starlette.responses import JSONResponse
import logging
import sys
import os
import json
import traceback
from typing import Dict, Any, List

# Configuração de logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("mobile_diagnostics")

# Criar um router específico para diagnósticos móveis
router = APIRouter(prefix="/diagnostics", tags=["Diagnósticos"])

@router.get("/system-info")
async def get_system_info():
    """
    Retorna informações sobre o sistema onde o backend está rodando.
    Útil para diagnosticar problemas de ambiente.
    """
    try:
        # Coletar informações básicas do sistema
        system_info = {
            "python_version": sys.version,
            "system_platform": sys.platform,
            "working_directory": os.getcwd(),
            "modules_loaded": list(sys.modules.keys()),
            "environmental_variables": {k: v for k, v in os.environ.items() 
                                     if not k.lower().startswith(('pass', 'secret', 'key', 'token'))}
        }
        
        # Verificar se o módulo Firebird está disponível
        try:
            import fdb
            system_info["firebird_module"] = {
                "version": fdb.__version__,
                "available": True
            }
        except ImportError:
            system_info["firebird_module"] = {
                "available": False,
                "error": "Módulo FDB não encontrado"
            }
        
        log.info("Informações do sistema coletadas com sucesso")
        return system_info
    
    except Exception as e:
        log.error(f"Erro ao coletar informações do sistema: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Erro ao coletar informações: {str(e)}"}
        )

@router.get("/test-firebird")
async def test_firebird_connection():
    """
    Testa a conexão com o banco de dados Firebird.
    """
    from auth import obter_conexao_controladora
    
    log.info("Iniciando teste de conexão Firebird")
    results = {
        "connection_possible": False,
        "errors": [],
        "version": None,
        "stages": []
    }
    
    try:
        # Etapa 1: Tentar importar o módulo Firebird
        try:
            import fdb
            results["stages"].append({
                "stage": "import_module",
                "success": True,
                "message": f"Módulo FDB importado com sucesso (versão {fdb.__version__})"
            })
        except ImportError as e:
            error_msg = f"Erro ao importar módulo FDB: {str(e)}"
            results["stages"].append({
                "stage": "import_module",
                "success": False,
                "message": error_msg
            })
            results["errors"].append(error_msg)
            # Se não puder importar o módulo, não pode continuar
            return results
        
        # Etapa 2: Tentar conectar ao banco de dados controladora
        try:
            log.info("Tentando conectar ao banco controladora")
            conn = obter_conexao_controladora()
            results["stages"].append({
                "stage": "database_connection",
                "success": True,
                "message": "Conexão estabelecida com o banco controladora"
            })
            
            # Etapa 3: Tentar executar uma consulta simples
            try:
                cursor = conn.cursor()
                cursor.execute("SELECT CURRENT_TIMESTAMP FROM RDB$DATABASE")
                timestamp = cursor.fetchone()[0]
                
                cursor.execute("SELECT RDB$GET_CONTEXT('SYSTEM', 'ENGINE_VERSION') FROM RDB$DATABASE")
                version = cursor.fetchone()[0]
                
                results["stages"].append({
                    "stage": "simple_query",
                    "success": True,
                    "message": f"Consulta executada com sucesso. Firebird timestamp: {timestamp}"
                })
                results["version"] = version
                results["connection_possible"] = True
                
            except Exception as e:
                error_msg = f"Erro ao executar consulta: {str(e)}"
                results["stages"].append({
                    "stage": "simple_query",
                    "success": False,
                    "message": error_msg
                })
                results["errors"].append(error_msg)
            
            # Etapa 4: Verificar tabelas críticas
            try:
                tables_to_check = ["USUARIOS_APP", "CLIENTES", "USUARIOS_CLIENTES"]
                tables_status = {}
                
                for table in tables_to_check:
                    try:
                        cursor.execute(f"SELECT FIRST 1 * FROM {table}")
                        tables_status[table] = {
                            "exists": True,
                            "column_count": len(cursor.description),
                            "columns": [col[0] for col in cursor.description]
                        }
                    except Exception as table_error:
                        tables_status[table] = {
                            "exists": False,
                            "error": str(table_error)
                        }
                
                results["tables"] = tables_status
                results["stages"].append({
                    "stage": "table_check",
                    "success": True,
                    "message": f"Verificação de tabelas concluída. Tabelas verificadas: {', '.join(tables_to_check)}"
                })
                
            except Exception as e:
                error_msg = f"Erro ao verificar tabelas: {str(e)}"
                results["stages"].append({
                    "stage": "table_check",
                    "success": False,
                    "message": error_msg
                })
                results["errors"].append(error_msg)
            
            # Fechar a conexão
            try:
                conn.close()
                results["stages"].append({
                    "stage": "connection_close",
                    "success": True,
                    "message": "Conexão fechada com sucesso"
                })
            except Exception as e:
                error_msg = f"Erro ao fechar conexão: {str(e)}"
                results["stages"].append({
                    "stage": "connection_close", 
                    "success": False,
                    "message": error_msg
                })
                results["errors"].append(error_msg)
            
        except Exception as e:
            error_msg = f"Erro ao conectar ao banco: {str(e)}"
            results["stages"].append({
                "stage": "database_connection",
                "success": False,
                "message": error_msg
            })
            results["errors"].append(error_msg)
        
    except Exception as e:
        log.error(f"Erro geral no teste de conexão: {str(e)}")
        results["errors"].append(f"Erro geral: {str(e)}")
        results["traceback"] = traceback.format_exc()
    
    return results

@router.get("/mobile-check")
async def mobile_check(request: Request):
    """
    Endpoint específico para verificar se a API está respondendo corretamente
    em dispositivos móveis e via Cloudflare Tunnel.
    """
    try:
        # Coletar headers úteis para diagnóstico
        headers_to_check = [
            "user-agent", "host", "origin", "referer", 
            "x-forwarded-for", "x-real-ip", "cf-connecting-ip", 
            "cf-ray", "cf-visitor", "cf-ipcountry"
        ]
        
        important_headers = {k.lower(): v for k, v in request.headers.items() 
                            if k.lower() in headers_to_check}
        
        # Determinar se é um dispositivo móvel
        user_agent = request.headers.get("user-agent", "").lower()
        is_mobile = any(keyword in user_agent for keyword in ["mobile", "android", "iphone", "ipad"])
        
        # Detectar se está usando Cloudflare
        using_cloudflare = any(k.startswith("cf-") for k in request.headers.keys())
        
        # Determinar o tipo de rede
        network_type = "unknown"
        if "cf-connecting-ip" in important_headers:
            network_type = "cloudflare_tunnel"
        elif request.client.host == "127.0.0.1" or request.client.host == "localhost":
            network_type = "local"
        else:
            network_type = "direct_ip"
            
        result = {
            "api_status": "online",
            "timestamp": str(import_module("datetime").datetime.now()),
            "request_info": {
                "client_host": request.client.host,
                "method": request.method,
                "url": str(request.url),
                "important_headers": important_headers
            },
            "device_info": {
                "is_mobile": is_mobile,
                "user_agent_type": "mobile" if is_mobile else "desktop",
                "using_cloudflare": using_cloudflare,
                "network_type": network_type
            }
        }
        
        log.info(f"Mobile check concluído: {json.dumps(result, indent=2)}")
        return result
        
    except Exception as e:
        log.error(f"Erro no mobile-check: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Erro durante verificação: {str(e)}"}
        )

def import_module(name):
    """Helper para importar módulos dinamicamente"""
    return __import__(name, fromlist=[''])
