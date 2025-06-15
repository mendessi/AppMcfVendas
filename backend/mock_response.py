from fastapi import APIRouter, Request
import json
import logging

# Criar um router para as rotas de mock
mock_router = APIRouter(prefix="/mock", tags=["mock"])

@mock_router.post("/selecionar-empresa")
async def mock_selecionar_empresa(request: Request):
    """
    Versão mock da rota para selecionar empresa - retorna uma resposta bem-sucedida
    sem tentar conectar ao banco de dados
    """
    try:
        # Registrar os dados recebidos para debugging
        body = await request.json()
        logging.info(f"MOCK: Recebendo requisição para selecionar empresa: {body}")
        
        # Extrair dados básicos da empresa
        empresa_codigo = body.get('cli_codigo', 0)
        empresa_nome = body.get('cli_nome', 'Empresa Mock')
        
        # Simular uma resposta bem-sucedida
        response_data = {
            "cli_codigo": empresa_codigo,
            "cli_nome": empresa_nome,
            "cli_bloqueadoapp": "N",
            "cli_mensagem": "SUCESSO (MOCK)",
            "cli_caminho_base": body.get('cli_caminho_base', ''),
            "cli_ip_servidor": body.get('cli_ip_servidor', '127.0.0.1'),
            "cli_nome_base": body.get('cli_nome_base', ''),
            "cli_porta": body.get('cli_porta', '3050')
        }
        
        logging.info(f"MOCK: Retornando resposta simulada: {response_data}")
        
        # Adicionar cabeçalhos CORS diretamente
        response_headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Content-Type": "application/json"
        }
        
        return response_data
    except Exception as e:
        logging.error(f"MOCK ERROR: {str(e)}")
        return {"error": str(e)}
