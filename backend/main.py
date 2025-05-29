from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import mock_response
# Importar o router de mock para teste sem CORS
from mock_response import mock_router
# Importar o router de informações da empresa
from empresa_info import router as empresa_info_router
# Importar o router de relatórios
from relatorios import router as relatorios_router
# Importar o router de teste de empresa
from teste_empresa import router as teste_empresa_router
# Importar o router de teste de seleção
from teste_selecionar import router as teste_selecionar_router
# Importar o router de teste de cabeçalhos
from teste_cabecalhos import router as teste_cabecalhos_router
# Importar o router de teste de conexão
from teste_conexao import router as teste_conexao_router
# Importar o router de teste empresa CRUD
from teste_empresa_crud import router as teste_empresa_crud_router
# Importar o router de teste de seleção com session
from teste_selecao_session import router as teste_selecao_session_router
# Importar o router de teste session simples
from teste_session_simples import router as teste_session_simples_router
# Importar o router de teste de conexão de empresa
from teste_conexao_api import router as teste_conexao_api_router
# Importar o router de informações detalhadas da empresa
from empresa_info_detalhada import router as empresa_info_detalhada_router
# Importar o router de teste SQL da empresa
from teste_sql_empresa import router as teste_sql_empresa_router
from typing import List, Optional, Dict, Any
import models
import database
from pydantic import BaseModel
import uvicorn
import logging
import os
import sys
# Importar o router de orçamentos
from orcamento_router import router as orcamento_router
from fastapi import FastAPI

if getattr(sys, 'frozen', False):
    # Executável PyInstaller: arquivos extraídos em _MEIPASS
    base_path = sys._MEIPASS
else:
    # Rodando do fonte: usa o diretório do script
    base_path = os.path.dirname(os.path.abspath(__file__))

# Instância FastAPI principal
# def get_app():
#     app = FastAPI()
#     # ... inclusão de outros routers ...
#     app.include_router(orcamento_router, prefix="/api", tags=["Orçamentos"])
#     return app

app = FastAPI(title="API Força de Vendas", description="API para aplicativo de força de vendas")

dll_path = os.path.join(base_path, "fbclient.dll")

# Garante que a DLL será encontrada pelo Python
if hasattr(os, "add_dll_directory"):
    os.add_dll_directory(base_path)
else:
    # Compatibilidade para Python < 3.8
    os.environ["PATH"] = base_path + os.pathsep + os.environ["PATH"]
from datetime import datetime
from starlette.responses import JSONResponse
import jwt
from jose import JWTError

# Importa os módulos de autenticação e gerenciamento de empresas
from auth import router as auth_router, get_current_user
from empresa_manager import (
    EmpresaSelect, 
    EmpresaData, 
    selecionar_empresa, 
    get_empresa_atual,
    get_empresa_connection,
    obter_empresas_usuario,
    SECRET_KEY,
    ALGORITHM
)

# Configuração de logging
logging.basicConfig(
    level=logging.WARNING,  # Alterado de INFO para WARNING para reduzir logs
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)

# Configurar logs específicos para serem mais silenciosos
logging.getLogger('empresa_manager').setLevel(logging.WARNING)
logging.getLogger('root').setLevel(logging.WARNING)

# Configurar CORS - permitir origens específicas para credenciais
origins = [
    # URLs locais
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://localhost:5500",  # Live Server do VSCode
    "http://127.0.0.1:5500",
    "file://",  # Para testes locais com arquivo HTML
    
    # URLs do Cloudflare Tunnel
    "https://api.mendessolucao.site",
    "https://app.mendessolucao.site"
]

# Middleware personalizado para garantir que CORS funcione em todas as respostas
class CustomCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Obter a origem da requisição
        origin = request.headers.get("origin", "*")
        # Tratar a origem "null" (arquivo HTML local)
        if origin.lower() == "null":
            origin = "*"
            
        # Para requisições OPTIONS (preflight), responder imediatamente
        if request.method == "OPTIONS":
            response = Response(
                status_code=200,
                content="",
                headers={
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-empresa-codigo",
                    "Access-Control-Allow-Credentials": "true"
                }
            )
            return response
            
        # Para outras requisições, chamar o próximo middleware
        response = await call_next(request)
        
        # Garantir que os cabeçalhos CORS estejam presentes
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, x-empresa-codigo, x-empresa-codigo, Origin, Accept, X-Requested-With"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Max-Age"] = "3600"  # Cache para reduzir preflight requests (bom para mobile)
        
        return response

# Adicionar o middleware personalizado (deve ser o primeiro da pilha)
app.add_middleware(CustomCORSMiddleware)

# Inclui as rotas de autenticação
app.include_router(auth_router)

# Inclui as rotas de mock
app.include_router(mock_router)

# Inclui as rotas de informações da empresa
app.include_router(empresa_info_router)

# Inclui as rotas de relatórios
app.include_router(relatorios_router)

# Inclui as rotas de teste de empresa
app.include_router(teste_empresa_router)

# Inclui as rotas de teste de seleção
app.include_router(teste_selecionar_router)

# Inclui as rotas de teste de cabeçalhos
app.include_router(teste_cabecalhos_router)

# Inclui as rotas de teste de conexão
app.include_router(teste_conexao_router)

# Inclui as rotas de teste empresa CRUD
app.include_router(teste_empresa_crud_router)

# Inclui as rotas de teste de seleção com session
app.include_router(teste_selecao_session_router)

# Inclui as rotas de teste session simples
app.include_router(teste_session_simples_router)

# Inclui as rotas de teste de conexão de empresa
app.include_router(teste_conexao_api_router)

# Inclui as rotas de informações detalhadas da empresa
app.include_router(empresa_info_detalhada_router)

# Inclui as rotas de teste SQL da empresa
app.include_router(teste_sql_empresa_router)

# Inclui as rotas de orçamentos
app.include_router(orcamento_router, tags=["Orçamentos"])

# Rotas básicas para teste
@app.get("/")
async def root():
    return {"message": "API de Força de Vendas funcionando!", "version": "1.0.0"}

@app.get("/teste-cors")
async def teste_cors():
    """Rota simples para testar se o CORS está funcionando"""
    return {"cors_ok": True, "message": "Se você consegue ver esta mensagem, o CORS está funcionando!", "timestamp": datetime.now().isoformat()}

@app.options("/teste-cors")
async def options_teste_cors():
    """Responder a requisições OPTIONS para teste"""
    return {"cors_ok": True}

@app.post("/teste-selecionar-empresa")
async def teste_selecionar_empresa(dados: dict):
    """Endpoint simplificado para testar a seleção de empresa sem lógica de negócios"""
    print(f"Dados recebidos: {dados}")
    
    # Simular resposta de sucesso
    return {
        "mensagem": "Empresa selecionada com sucesso (teste)",
        "empresa": dados
    }

# Rota para obter clientes (deprecada, usar a versão autenticada)
@app.get("/api/clientes-old")
async def get_clientes_old():
    try:
        return await database.get_clientes()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Rota para obter produtos (deprecada, usar a versão autenticada)
@app.get("/api/produtos-old")
async def get_produtos_old():
    try:
        return await database.get_produtos()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Modelo para pedido
class PedidoCreate(BaseModel):
    cliente_id: int
    itens: List[dict]
    observacao: Optional[str] = None

# Rota para criar pedido
@app.post("/pedidos")
async def create_pedido(pedido: PedidoCreate):
    try:
        return await database.create_pedido(pedido)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Rota para obter pedidos (deprecada, usar a versão autenticada)
@app.get("/api/pedidos-old")
async def get_pedidos_old():
    try:
        return await database.get_pedidos()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Rota para listar empresas do usuário
@app.get("/empresas")
async def listar_empresas(request: Request):
    """
    Lista todas as empresas do usuário autenticado.
    """
    try:
        # Obtém o token da requisição
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=401,
                detail="Não autorizado",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token = authorization.replace("Bearer ", "")
        
        # Decodifica o token
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            if not email:
                raise HTTPException(
                    status_code=401,
                    detail="Token inválido",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        except JWTError:
            raise HTTPException(
                status_code=401,
                detail="Token inválido",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logging.info(f"Listando empresas para o email: {email}")
        
        # Obter as empresas usando o email
        empresas = await obter_empresas_usuario(email)
        
        if not empresas:
            logging.warning(f"Nenhuma empresa encontrada para o email: {email}")
            raise HTTPException(
                status_code=404,
                detail="Nenhuma empresa encontrada para este usuário"
            )
            
        logging.info(f"Encontradas {len(empresas)} empresas para o email: {email}")
        return empresas
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro ao listar empresas: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao listar empresas: {str(e)}"
        )

# Rota para selecionar empresa
@app.post("/selecionar-empresa", response_model=EmpresaData)
async def selecionar_empresa_route(empresa: EmpresaSelect, user_data = Depends(get_current_user)):
    """
    Seleciona uma empresa para o usuário atual.
    """
    try:
        # Log detalhado para debugging
        logging.info("===== INICIANDO SELEÇÃO DE EMPRESA =====")
        logging.info(f"Dados recebidos: {empresa.dict()}")
        logging.info(f"Usuário autenticado: {user_data}")
        logging.info(f"Tipo de cli_codigo: {type(empresa.cli_codigo)}")
        
        # Verifica se os dados necessários estão presentes
        if not empresa.cli_codigo:
            logging.error("Código da empresa não fornecido")
            raise HTTPException(status_code=400, detail="Código da empresa é obrigatório")
            
        if not user_data or not user_data.user_id:
            logging.error("Dados do usuário inválidos")
            raise HTTPException(status_code=401, detail="Usuário não autenticado")
        
        logging.info(f"Chamando selecionar_empresa com usuario_id={user_data.user_id}, cli_codigo={empresa.cli_codigo}")
        resultado = await selecionar_empresa(user_data.user_id, empresa.cli_codigo)
        logging.info(f"Empresa selecionada com sucesso: {resultado}")
        
        return resultado
    except HTTPException as he:
        logging.error(f"Erro HTTP ao selecionar empresa: {str(he)}")
        raise
    except Exception as e:
        import traceback
        logging.error(f"Erro ao selecionar empresa: {str(e)}")
        logging.error(f"Tipo do erro: {type(e).__name__}")
        logging.error(f"Traceback:\n{traceback.format_exc()}")
        # Log dos dados recebidos novamente no erro para debugging
        try:
            logging.error(f"Dados da empresa que causaram erro: {empresa.dict() if empresa else 'Nenhum'}")
        except Exception as err:
            logging.error(f"Erro ao logar dados da empresa: {str(err)}")
        
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao selecionar empresa: {str(e)}"
        )

# Rota para obter a empresa atual
@app.get("/empresa-atual", response_model=EmpresaData)
async def empresa_atual_route(request: Request):
    """
    Retorna a empresa atualmente selecionada pelo usuário.
    """
    try:
        return get_empresa_atual(request)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro ao obter empresa atual: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao obter empresa atual: {str(e)}"
        )

# Rota para obter clientes com autenticação e conexão à empresa selecionada
@app.get("/clientes")
async def get_clientes(request: Request):
    try:
        # Obtém a conexão com a empresa selecionada
        conn = await get_empresa_connection(request)
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    ID, 
                    NOME, 
                    CNPJ_CPF, 
                    ENDERECO, 
                    TELEFONE, 
                    EMAIL 
                FROM CLIENTES
                ORDER BY NOME
            """)
            
            # Obtém os nomes das colunas
            columns = [desc[0].lower() for desc in cursor.description]
            
            # Converte os resultados em uma lista de dicionários
            results = []
            for row in cursor.fetchall():
                result = {}
                for i, value in enumerate(row):
                    result[columns[i]] = value
                results.append(result)
            
            return results
        finally:
            conn.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Rota para obter produtos com autenticação e conexão à empresa selecionada
@app.get("/produtos")
async def get_produtos(request: Request):
    try:
        # Obtém a conexão com a empresa selecionada
        conn = await get_empresa_connection(request)
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    ID, 
                    CODIGO, 
                    DESCRICAO, 
                    PRECO, 
                    ESTOQUE, 
                    UNIDADE 
                FROM PRODUTOS
                ORDER BY DESCRICAO
            """)
            
            # Obtém os nomes das colunas
            columns = [desc[0].lower() for desc in cursor.description]
            
            # Converte os resultados em uma lista de dicionários
            results = []
            for row in cursor.fetchall():
                result = {}
                for i, value in enumerate(row):
                    result[columns[i]] = value
                results.append(result)
            
            return results
        finally:
            conn.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Rota para criar pedido com autenticação e conexão à empresa selecionada
@app.post("/pedidos")
async def create_pedido(pedido: models.PedidoCreate, request: Request):
    try:
        # Obtém a conexão com a empresa selecionada
        conn = await get_empresa_connection(request)
        try:
            cursor = conn.cursor()
            
            # Inicia uma transação
            # Insere o cabeçalho do pedido
            cursor.execute("""
            INSERT INTO PEDIDOS (
                CLIENTE_ID, 
                DATA, 
                STATUS, 
                VALOR_TOTAL, 
                OBSERVACAO
            ) VALUES (?, ?, ?, ?, ?)
            RETURNING ID
            """, (
                pedido.cliente_id, 
                datetime.now(), 
                'PENDENTE', 
                0,  # Será atualizado depois
                pedido.observacao
            ))
            
            # Obtém o ID do pedido inserido
            pedido_id = cursor.fetchone()[0]
            
            # Calcula o valor total
            valor_total = 0
            
            # Insere os itens do pedido
            for item in pedido.itens:
                cursor.execute("""
                INSERT INTO ITENS_PEDIDO (
                    PEDIDO_ID, 
                    PRODUTO_ID, 
                    QUANTIDADE, 
                    PRECO_UNITARIO, 
                    VALOR_TOTAL
                ) VALUES (?, ?, ?, ?, ?)
                """, (
                    pedido_id,
                    item['produto_id'],
                    item['quantidade'],
                    item['preco_unitario'],
                    item['quantidade'] * item['preco_unitario']
                ))
                
                # Atualiza o valor total
                valor_total += item['quantidade'] * item['preco_unitario']
            
            # Atualiza o valor total do pedido
            cursor.execute("""
            UPDATE PEDIDOS SET VALOR_TOTAL = ? WHERE ID = ?
            """, (valor_total, pedido_id))
            
            conn.commit()
            
            # Retorna o pedido criado
            return {"id": pedido_id, "mensagem": "Pedido criado com sucesso"}
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Rota para obter pedidos com autenticação e conexão à empresa selecionada
@app.get("/pedidos")
async def get_pedidos(request: Request):
    try:
        # Obtém a conexão com a empresa selecionada
        conn = await get_empresa_connection(request)
        try:
            cursor = conn.cursor()
            
            # Consulta para obter os pedidos
            cursor.execute("""
                SELECT 
                    P.ID, 
                    P.CLIENTE_ID, 
                    C.NOME AS CLIENTE_NOME,
                    P.DATA, 
                    P.STATUS, 
                    P.VALOR_TOTAL, 
                    P.OBSERVACAO 
                FROM PEDIDOS P
                JOIN CLIENTES C ON P.CLIENTE_ID = C.ID
                ORDER BY P.DATA DESC
            """)
            
            # Obtém os nomes das colunas
            columns = [desc[0].lower() for desc in cursor.description]
            
            # Converte os resultados em uma lista de dicionários
            pedidos = []
            for row in cursor.fetchall():
                pedido = {}
                for i, value in enumerate(row):
                    pedido[columns[i]] = value
                pedidos.append(pedido)
            
            # Para cada pedido, obtém os itens
            for pedido in pedidos:
                cursor.execute("""
                    SELECT 
                        IP.PRODUTO_ID, 
                        P.DESCRICAO AS PRODUTO_DESCRICAO,
                        IP.QUANTIDADE, 
                        IP.PRECO_UNITARIO, 
                        IP.VALOR_TOTAL 
                    FROM ITENS_PEDIDO IP
                    JOIN PRODUTOS P ON IP.PRODUTO_ID = P.ID
                    WHERE IP.PEDIDO_ID = ?
                """, (pedido['id'],))
                
                # Obtém os nomes das colunas
                item_columns = [desc[0].lower() for desc in cursor.description]
                
                # Converte os resultados em uma lista de dicionários
                itens = []
                for row in cursor.fetchall():
                    item = {}
                    for i, value in enumerate(row):
                        item[item_columns[i]] = value
                    itens.append(item)
                
                pedido['itens'] = itens
            
            return pedidos
        finally:
            conn.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import argparse
    
    # Configurar argumentos de linha de comando
    parser = argparse.ArgumentParser(description="Servidor API Força de Vendas")
    parser.add_argument("--port", type=int, default=8000, help="Porta para executar o servidor (padrão: 8000)")
    args = parser.parse_args()
    
    print(f"Iniciando servidor na porta {args.port}...")
    uvicorn.run(app, host="0.0.0.0", port=args.port)
