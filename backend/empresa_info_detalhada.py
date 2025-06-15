from fastapi import APIRouter, Depends, HTTPException, Request, status
from typing import Dict, Any
import logging
from empresa_manager import get_empresa_connection, get_empresa_atual

# Configurar logger
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("empresa_info_detalhada")

# Configurar router
router = APIRouter(tags=["Empresa Info"])

@router.get("/empresa-info-detalhada")
async def obter_empresa_info_detalhada(request: Request) -> Dict[str, Any]:
    """
    Obtém informações detalhadas da empresa atual.
    Tenta várias abordagens:
    1. Busca na empresa selecionada atualmente
    2. Se falhar, retorna os dados básicos da empresa sem consulta SQL
    """
    log.info("Obtendo informações detalhadas da empresa atual")
    
    try:
        # Obter informações da empresa atual - temos dados suficientes aqui
        empresa_atual = get_empresa_atual(request)
        log.info(f"Empresa atual obtida: {empresa_atual.get('cli_nome')}")
        
        # Formatar os dados da empresa de forma mais amigável
        empresa_info_basica = {
            "emp_cod": empresa_atual.get('cli_codigo', 0),
            "emp_nome": empresa_atual.get('cli_nome', 'Empresa Atual'),
            # Podemos incluir outros dados que já temos disponíveis
            "emp_cnpj": empresa_atual.get('cli_cnpj', empresa_atual.get('cli_cpf', '-')),
            "cli_ip_servidor": empresa_atual.get('cli_ip_servidor', ''),
            "cli_caminho_base": empresa_atual.get('cli_caminho_base', ''),
            "cli_nome_base": empresa_atual.get('cli_nome_base', '')
        }
        
        try:
            # Obter conexão com a empresa selecionada
            conn = await get_empresa_connection(request)
            
            try:
                # Criar cursor
                cursor = conn.cursor()
                
                # Primeiro verifica se a tabela EMPRESA existe
                log.info("Verificando se a tabela EMPRESA existe")
                try:
                    # Tenta esta consulta para verificar se a tabela existe
                    cursor.execute("""SELECT first 1 * FROM RDB$RELATIONS 
                                      WHERE RDB$RELATION_NAME = 'EMPRESA'""")
                    has_empresa_table = cursor.fetchone() is not None
                    
                    # Verifica se a tabela PARAMET existe
                    cursor.execute("""SELECT first 1 * FROM RDB$RELATIONS 
                                      WHERE RDB$RELATION_NAME = 'PARAMET'""")
                    has_paramet_table = cursor.fetchone() is not None
                    
                    if has_empresa_table and has_paramet_table:
                        log.info("Tabelas EMPRESA e PARAMET encontradas, tentando consulta original")
                        # Executar a consulta solicitada
                        try:
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
                            
                            # Obter resultado
                            result = cursor.fetchone()
                            
                            if result:
                                log.info("Dados completos da empresa encontrados")
                                # Mapear resultado para um dicionário
                                empresa_info = {
                                    "emp_cod": result[0],
                                    "emp_nome": result[1],
                                    "emp_cnpj": result[2] if result[2] else "-"
                                }
                                
                                return {
                                    "sucesso": True,
                                    "mensagem": "Informações da empresa obtidas com sucesso",
                                    "empresa": empresa_info
                                }
                        except Exception as sql_err:
                            log.error(f"Erro na consulta original: {str(sql_err)}")
                            # Continua para outras abordagens
                    else:
                        log.warning(f"Tabelas não encontradas: EMPRESA={has_empresa_table}, PARAMET={has_paramet_table}")
                except Exception as table_err:
                    log.error(f"Erro ao verificar tabelas: {str(table_err)}")
                
                # Tentativa alternativa - buscar apenas da tabela empresa
                log.info("Tentando abordagem alternativa - apenas tabela empresa")
                try:
                    cursor.execute("""SELECT first 1 * FROM RDB$RELATIONS 
                                      WHERE RDB$RELATION_NAME = 'EMPRESA'""")
                    if cursor.fetchone():
                        cursor.execute("""
                            SELECT first 1
                                emp_cod,
                                emp_nome,
                                emp_cnpj
                            FROM 
                                empresa
                        """)
                        
                        result = cursor.fetchone()
                        if result:
                            log.info("Dados da empresa encontrados na abordagem alternativa")
                            empresa_info = {
                                "emp_cod": result[0],
                                "emp_nome": result[1],
                                "emp_cnpj": result[2] if result[2] else "-"
                            }
                            
                            return {
                                "sucesso": True,
                                "mensagem": "Informações da empresa obtidas com sucesso (alternativa)",
                                "empresa": empresa_info
                            }
                except Exception as alt_err:
                    log.error(f"Erro na abordagem alternativa: {str(alt_err)}")
                
                # Segunda tentativa alternativa - verificar nomes de colunas reais
                log.info("Tentando obter metadados das tabelas")
                try:
                    # Listar todas as tabelas 
                    cursor.execute("SELECT first 10 RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0")
                    tables = [row[0].strip() for row in cursor.fetchall()]
                    log.info(f"Tabelas encontradas no banco: {tables}")
                    
                    # Se encontrou alguma tabela, tenta obter algumas informações
                    if tables:
                        # Tenta pegar a primeira tabela
                        table = tables[0]
                        cursor.execute(f"SELECT first 1 * FROM {table}")
                        log.info(f"Conseguiu consultar a tabela {table}")
                except Exception as meta_err:
                    log.error(f"Erro ao tentar obter metadados: {str(meta_err)}")
            finally:
                # Fechar conexão
                conn.close()
        except Exception as conn_err:
            log.error(f"Erro ao conectar com o banco: {str(conn_err)}")
        
        # Se chegou até aqui, não conseguiu obter dados completos da empresa
        # Retorna os dados que já temos diretamente
        log.info("Retornando informações da empresa selecionada")
        return {
            "sucesso": True,
            "mensagem": "Informações da empresa selecionada",
            "empresa": {
                "emp_cod": empresa_info_basica["emp_cod"],
                "emp_nome": empresa_info_basica["emp_nome"],
                "emp_cnpj": empresa_info_basica["emp_cnpj"]
            }
        }
    except Exception as e:
        log.error(f"Erro ao obter informações da empresa: {str(e)}")
        # Em vez de lançar um erro, retorna um objeto de resposta com a falha
        return {
            "sucesso": False,
            "mensagem": f"Erro ao obter informações da empresa: {str(e)}",
            "empresa": {
                "emp_cod": 0,
                "emp_nome": "Selecione uma empresa",
                "emp_cnpj": "Acesse o menu de seleção"
            }
        }
