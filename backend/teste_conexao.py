from fastapi import APIRouter, Request
from empresa_manager import get_empresa_atual, get_empresa_connection
import logging
from typing import Dict, Any, List, Optional

# Configurar o logger
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("teste_conexao")

# Configurar o router
router = APIRouter(tags=["Teste Conexão"])

@router.get("/teste-conexao")
async def teste_conexao(request: Request):
    """
    Endpoint para testar a conexão com o banco de dados da empresa.
    """
    try:
        # Verificar cabeçalhos
        empresa_codigo = request.headers.get("x-empresa-codigo")
        authorization = request.headers.get("Authorization")
        log.info(f"Headers: auth={authorization is not None}, x-empresa-codigo={empresa_codigo}")
        
        # Verificar empresa
        try:
            log.info("Tentando obter empresa atual...")
            empresa = get_empresa_atual(request)
            log.info(f"Empresa obtida: {empresa['cli_nome']} (ID: {empresa['cli_codigo']})")
            
            # Detalhes da conexão
            detalhes = {
                "codigo": empresa['cli_codigo'],
                "nome": empresa['cli_nome'],
                "ip": empresa['cli_ip_servidor'],
                "porta": empresa['cli_porta'],
                "caminho_base": empresa['cli_caminho_base'],
                "nome_base": empresa['cli_nome_base']
            }
            
            # Tentar estabelecer conexão com o banco
            try:
                log.info("Tentando estabelecer conexão com o banco...")
                conn = await get_empresa_connection(request)
                
                # Tentar executar uma consulta simples
                try:
                    log.info("Tentando executar consulta simples...")
                    cur = conn.cursor()
                    cur.execute("SELECT FIRST 1 * FROM RDB$DATABASE")
                    row = cur.fetchone()
                    
                    # Tentar consulta real nas tabelas
                    try:
                        log.info("Tentando consultar tabela CLIENTES...")
                        cur.execute("SELECT FIRST 1 CLI_CODIGO, CLI_NOME FROM CLIENTES")
                        cliente = cur.fetchone()
                        
                        if cliente:
                            cliente_info = {
                                "codigo": cliente[0],
                                "nome": cliente[1]
                            }
                            conn.close()
                            
                            return {
                                "sucesso": True,
                                "mensagem": "Conexão e consulta realizadas com sucesso",
                                "empresa": detalhes,
                                "teste_conexao": "SUCESSO",
                                "teste_consulta_simples": "SUCESSO",
                                "teste_consulta_clientes": "SUCESSO",
                                "primeiro_cliente": cliente_info
                            }
                        else:
                            conn.close()
                            return {
                                "sucesso": True,
                                "mensagem": "Conexão ok mas nenhum cliente encontrado",
                                "empresa": detalhes,
                                "teste_conexao": "SUCESSO",
                                "teste_consulta_simples": "SUCESSO",
                                "teste_consulta_clientes": "SEM DADOS"
                            }
                    except Exception as e:
                        conn.close()
                        log.error(f"Erro ao consultar CLIENTES: {str(e)}")
                        return {
                            "sucesso": False,
                            "mensagem": f"Erro ao consultar CLIENTES: {str(e)}",
                            "empresa": detalhes,
                            "teste_conexao": "SUCESSO",
                            "teste_consulta_simples": "SUCESSO",
                            "teste_consulta_clientes": "ERRO"
                        }
                    
                except Exception as e:
                    conn.close()
                    log.error(f"Erro na consulta simples: {str(e)}")
                    return {
                        "sucesso": False,
                        "mensagem": f"Erro na consulta simples: {str(e)}",
                        "empresa": detalhes,
                        "teste_conexao": "SUCESSO",
                        "teste_consulta_simples": "ERRO"
                    }
                
            except Exception as e:
                log.error(f"Erro ao conectar ao banco: {str(e)}")
                return {
                    "sucesso": False,
                    "mensagem": f"Erro ao conectar ao banco: {str(e)}",
                    "empresa": detalhes,
                    "teste_conexao": "ERRO"
                }
                
        except Exception as e:
            log.error(f"Erro ao obter empresa atual: {str(e)}")
            return {
                "sucesso": False,
                "mensagem": f"Erro ao obter empresa atual: {str(e)}",
                "headers": {
                    "authorization_present": authorization is not None,
                    "x-empresa-codigo": empresa_codigo
                }
            }
            
    except Exception as e:
        log.error(f"Erro geral no teste de conexão: {str(e)}")
        return {
            "sucesso": False,
            "mensagem": f"Erro geral: {str(e)}"
        }
