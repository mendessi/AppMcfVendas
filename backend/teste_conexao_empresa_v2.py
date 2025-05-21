from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
import uvicorn
import logging
import sys
import os
import json

# Configurar logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("teste_conexao")

# Importar versões corrigidas
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from conexao_firebird_corrigido import obter_conexao_cliente, testar_conexao

app = FastAPI()

# Configuração CORS mais permissiva para testes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Para testes apenas; em produção, especifique origens concretas
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar diretório de arquivos estáticos
caminho_raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app.mount("/static", StaticFiles(directory=caminho_raiz), name="static")

@app.get("/")
async def read_root():
    """Redireciona para a página de teste"""
    return RedirectResponse(url="/static/teste_conexao.html")

@app.get("/teste-conexao")
async def teste_conexao_endpoint(codigo: int = None, caminho: str = None, ip: str = None, porta: str = "3050", nome_base: str = None):
    """
    Endpoint para testar conexão direta com uma empresa.
    Parâmetros:
    - codigo: Código da empresa (opcional, apenas para registro)
    - caminho: Caminho da base de dados
    - ip: IP do servidor
    - porta: Porta do servidor (padrão: 3050)
    - nome_base: Nome da base de dados (opcional)
    """
    if not caminho:
        return {"sucesso": False, "mensagem": "Caminho da base não informado"}
    
    if not ip:
        return {"sucesso": False, "mensagem": "IP do servidor não informado"}
    
    try:
        # Criar objeto de empresa
        empresa = {
            "cli_codigo": codigo or 0,
            "cli_nome": "Empresa de Teste",
            "cli_caminho_base": caminho,
            "cli_ip_servidor": ip,
            "cli_nome_base": nome_base or "",
            "cli_porta": porta or "3050"
        }
        
        log.info(f"Tentando conectar com: {json.dumps(empresa, indent=2)}")
        
        # Tenta obter conexão
        conn = obter_conexao_cliente(empresa)
        
        # Testa a conexão
        sucesso, info = await testar_conexao(conn)
        
        # Fecha a conexão
        if conn:
            conn.close()
        
        if sucesso:
            return {
                "sucesso": True,
                "mensagem": "Conexão estabelecida com sucesso",
                "empresa": empresa,
                "info_banco": info
            }
        else:
            return {
                "sucesso": False,
                "mensagem": f"Erro ao testar conexão: {info.get('erro', 'Erro desconhecido')}",
                "empresa": empresa
            }
    except Exception as e:
        log.error(f"Erro ao conectar: {str(e)}")
        return {
            "sucesso": False,
            "mensagem": f"Erro ao tentar conexão: {str(e)}",
            "empresa": {
                "cli_caminho_base": caminho,
                "cli_ip_servidor": ip,
                "cli_nome_base": nome_base or "",
                "cli_porta": porta or "3050"
            }
        }

@app.get("/verificar-dll")
async def verificar_dll(caminho: str = None):
    """
    Verifica se a DLL do Firebird existe no caminho especificado
    """
    if not caminho:
        return {"sucesso": False, "mensagem": "Caminho não informado"}
    
    try:
        # Verificar se o caminho existe
        if not os.path.exists(caminho):
            return {
                "sucesso": False, 
                "mensagem": f"O caminho {caminho} não existe"
            }
        
        # Verificar se é um diretório
        if not os.path.isdir(caminho):
            caminho = os.path.dirname(caminho)
        
        # Verificar se a DLL existe
        dll_path = os.path.join(caminho, 'fbclient.dll')
        existe_dll = os.path.exists(dll_path)
        
        if existe_dll:
            tamanho = os.path.getsize(dll_path)
            data_modificacao = os.path.getmtime(dll_path)
            import datetime
            data = datetime.datetime.fromtimestamp(data_modificacao).strftime('%Y-%m-%d %H:%M:%S')
            
            return {
                "sucesso": True,
                "mensagem": f"DLL encontrada em {dll_path}",
                "caminho_dll": dll_path,
                "tamanho_bytes": tamanho,
                "data_modificacao": data
            }
        else:
            return {
                "sucesso": False,
                "mensagem": f"DLL não encontrada em {caminho}",
                "caminhos_verificados": [dll_path]
            }
    except Exception as e:
        return {
            "sucesso": False,
            "mensagem": f"Erro ao verificar DLL: {str(e)}"
        }

if __name__ == "__main__":
    # Exibir informações sobre o ambiente
    log.info(f"Python version: {sys.version}")
    log.info(f"Path: {sys.path}")
    log.info(f"Diretório atual: {os.getcwd()}")
    log.info(f"Diretório raiz: {caminho_raiz}")
    
    # Iniciar servidor
    uvicorn.run(app, host="0.0.0.0", port=8100)
