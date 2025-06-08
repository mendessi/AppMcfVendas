from fastapi import APIRouter, HTTPException, Request
from typing import Dict, Any
import logging
from conexao_firebird import obter_conexao_cliente, testar_conexao

# Configurar logger
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("teste_conexao_api")

# Configurar router
router = APIRouter(tags=["Teste Conexão"])

@router.post("/testar-conexao-empresa")
async def testar_conexao_empresa(dados_empresa: Dict[str, Any]):
    """
    Endpoint para testar conexão direta com uma empresa específica.
    Recebe os dados da empresa e tenta estabelecer uma conexão.
    """
    try:
        log.info(f"Testando conexão para empresa: {dados_empresa.get('cli_codigo')} - {dados_empresa.get('cli_nome')}")
        
        # Validar dados mínimos necessários
        if not dados_empresa.get("cli_ip_servidor"):
            raise HTTPException(status_code=400, detail="IP do servidor não informado")
        
        if not (dados_empresa.get("cli_caminho_base") or dados_empresa.get("cli_nome_base")):
            raise HTTPException(status_code=400, detail="Caminho da base de dados não informado")
            
        # Tenta obter conexão
        conn = obter_conexao_cliente(dados_empresa)
        
        # Testa a conexão
        sucesso, info = await testar_conexao(conn)
        
        # Fecha a conexão
        if conn:
            conn.close()
        
        if sucesso:
            return {
                "sucesso": True,
                "mensagem": "Conexão estabelecida com sucesso",
                "empresa": {
                    "cli_codigo": dados_empresa.get("cli_codigo"),
                    "cli_nome": dados_empresa.get("cli_nome")
                },
                "info_banco": info
            }
        else:
            return {
                "sucesso": False,
                "mensagem": f"Erro ao testar conexão: {info.get('erro', 'Erro desconhecido')}",
                "empresa": {
                    "cli_codigo": dados_empresa.get("cli_codigo"),
                    "cli_nome": dados_empresa.get("cli_nome")
                }
            }
    except Exception as e:
        log.error(f"Erro ao testar conexão: {str(e)}")
        return {
            "sucesso": False,
            "mensagem": f"Erro ao testar conexão: {str(e)}",
            "empresa": {
                "cli_codigo": dados_empresa.get("cli_codigo"),
                "cli_nome": dados_empresa.get("cli_nome")
            }
        }
