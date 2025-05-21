from fastapi import APIRouter, HTTPException, Request, status
from typing import Dict, Any
import logging
from empresa_manager import get_empresa_connection

# Configurar logger
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("teste_sql_empresa")

# Configurar router
router = APIRouter(tags=["Teste SQL"])

@router.post("/testar-sql-empresa")
async def testar_sql_empresa(dados_empresa: Dict[str, Any]) -> Dict[str, Any]:
    """
    Endpoint para testar a consulta SQL específica em uma empresa.
    Executa a consulta:
    SELECT 
        e.emp_cod,
        e.emp_nome,
        e.emp_cnpj
    FROM 
        empresa e
    JOIN 
        paramet p ON p.par_emp_padrao = e.emp_cod
    """
    try:
        log.info(f"Testando consulta SQL para empresa: {dados_empresa.get('cli_codigo')} - {dados_empresa.get('cli_nome')}")
        
        # Validar dados mínimos necessários
        if not dados_empresa.get("cli_ip_servidor"):
            raise HTTPException(status_code=400, detail="IP do servidor não informado")
        
        if not (dados_empresa.get("cli_caminho_base") or dados_empresa.get("cli_nome_base")):
            raise HTTPException(status_code=400, detail="Caminho da base de dados não informado")
        
        # Montar objeto de empresa para conexão
        empresa = {
            "cli_codigo": dados_empresa.get("cli_codigo", 0),
            "cli_nome": dados_empresa.get("cli_nome", "Empresa de Teste"),
            "cli_caminho_base": dados_empresa.get("cli_caminho_base", ""),
            "cli_ip_servidor": dados_empresa.get("cli_ip_servidor", ""),
            "cli_nome_base": dados_empresa.get("cli_nome_base", ""),
            "cli_porta": dados_empresa.get("cli_porta", "3050")
        }
        
        try:
            # Obter conexão com a empresa
            from conexao_firebird import obter_conexao_cliente
            log.info(f"Tentando conectar à empresa: {empresa}")
            conn = obter_conexao_cliente(empresa)
            
            try:
                # Verificar primeiro se as tabelas existem
                cursor = conn.cursor()
                
                # Verificar se a tabela EMPRESA existe
                cursor.execute("""
                    SELECT first 1 * FROM RDB$RELATIONS 
                    WHERE RDB$RELATION_NAME = 'EMPRESA'
                """)
                empresa_exists = cursor.fetchone() is not None
                
                # Verificar se a tabela PARAMET existe
                cursor.execute("""
                    SELECT first 1 * FROM RDB$RELATIONS 
                    WHERE RDB$RELATION_NAME = 'PARAMET'
                """)
                paramet_exists = cursor.fetchone() is not None
                
                # Se ambas as tabelas existem, executar a consulta completa
                if empresa_exists and paramet_exists:
                    log.info("Tabelas encontradas, executando consulta SQL")
                    try:
                        # Executar a consulta solicitada
                        cursor.execute("""
                            SELECT 
                                e.emp_cod,
                                e.emp_nome,
                                e.emp_cnpj
                            FROM 
                                empresa e
                            JOIN 
                                paramet p ON p.par_emp_padrao = e.emp_cod
                        """)
                        
                        # Obter resultados
                        results = []
                        for row in cursor.fetchall():
                            results.append({
                                "emp_cod": row[0],
                                "emp_nome": row[1],
                                "emp_cnpj": row[2] if row[2] else "-"
                            })
                        
                        return {
                            "sucesso": True,
                            "mensagem": f"Consulta SQL executada com sucesso. Encontrados {len(results)} registros.",
                            "resultado": results,
                            "estrutura_bd": {
                                "tabela_empresa": empresa_exists,
                                "tabela_paramet": paramet_exists
                            }
                        }
                    except Exception as sql_error:
                        log.error(f"Erro ao executar consulta SQL: {str(sql_error)}")
                        return {
                            "sucesso": False,
                            "mensagem": f"Erro ao executar consulta SQL: {str(sql_error)}",
                            "estrutura_bd": {
                                "tabela_empresa": empresa_exists,
                                "tabela_paramet": paramet_exists
                            }
                        }
                else:
                    # Retornar informações sobre as tabelas existentes
                    return {
                        "sucesso": False,
                        "mensagem": "Não foi possível executar a consulta SQL porque uma ou mais tabelas não existem.",
                        "estrutura_bd": {
                            "tabela_empresa": empresa_exists,
                            "tabela_paramet": paramet_exists
                        }
                    }
            finally:
                conn.close()
        except Exception as conn_error:
            log.error(f"Erro ao conectar à empresa: {str(conn_error)}")
            return {
                "sucesso": False,
                "mensagem": f"Erro ao conectar à empresa: {str(conn_error)}"
            }
    except Exception as e:
        log.error(f"Erro ao testar consulta SQL: {str(e)}")
        return {
            "sucesso": False,
            "mensagem": f"Erro ao testar consulta SQL: {str(e)}"
        }
