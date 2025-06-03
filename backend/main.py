import os
import sys
import json
import logging
import uvicorn
from fastapi import FastAPI, Depends, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal
import fdb
import jwt
from jose import JWTError
from auth import login, get_current_user
from empresa_manager import selecionar_empresa, get_empresa_atual, EmpresaData, EmpresaSelect
from empresa_manager_corrigido import get_empresa_connection
import models
import database
from starlette.middleware.base import BaseHTTPMiddleware

# Importar o router de orçamentos
from orcamento_router import router as orcamento_router

# Importar o router de autenticação
from auth import router as auth_router

# Importar o router de informações da empresa
from empresa_info import router as empresa_info_router

# Importar o router de relatórios
from relatorios import router as relatorios_router

# Importar o router de informações detalhadas da empresa
from empresa_info_detalhada import router as empresa_info_detalhada_router

# Função para obter a sessão do banco de dados
def get_db():
    db = database.get_connection()
    try:
        yield db
    finally:
        db.close()

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
    
    # URLs do Cloudflare Tunnel - HTTPS
    "https://api.mendessolucao.site",
    "https://app.mendessolucao.site",
    "https://meuapp.mendessolucao.site",
    "https://www.mendessolucao.site",
    "https://mendessolucao.site",
    
    # Permitir também HTTP caso necessário
    "http://api.mendessolucao.site",
    "http://app.mendessolucao.site",
    "http://meuapp.mendessolucao.site",
    "http://www.mendessolucao.site",
    "http://mendessolucao.site"
]

# Middleware personalizado para garantir que CORS funcione em todas as respostas
class CustomCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Obter a origem da requisição
        origin = request.headers.get("origin", "*")
        
        # Lista de domínios permitidos
        allowed_domains = [
            "mendessolucao.site",
            "api.mendessolucao.site", 
            "app.mendessolucao.site",
            "meuapp.mendessolucao.site",
            "ngrok.io",
            "localhost",
            "127.0.0.1"
        ]
        
        # Verificar se a origem é permitida
        origin_allowed = any(domain in origin for domain in allowed_domains) if origin != "*" else True
        
        # Se for produção ou origem permitida, usar a origem específica
        if origin_allowed and origin != "*":
            cors_origin = origin
        else:
            # Para desenvolvimento ou origens não listadas
            cors_origin = "*"
            
        # Para requisições OPTIONS (preflight), responder imediatamente
        if request.method == "OPTIONS":
            response = Response(
                status_code=200,
                content="",
                headers={
                    "Access-Control-Allow-Origin": cors_origin,
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-empresa-codigo, Accept, Origin, X-Requested-With",
                    "Access-Control-Allow-Credentials": "true" if cors_origin != "*" else "false",
                    "Access-Control-Max-Age": "86400"  # 24 horas de cache
                }
            )
            return response
            
        # Para outras requisições, chamar o próximo middleware
        response = await call_next(request)
        
        # Garantir que os cabeçalhos CORS estejam presentes
        response.headers["Access-Control-Allow-Origin"] = cors_origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, x-empresa-codigo, Accept, Origin, X-Requested-With"
        response.headers["Access-Control-Allow-Credentials"] = "true" if cors_origin != "*" else "false"
        response.headers["Access-Control-Max-Age"] = "86400"  # Cache de 24h para reduzir preflight requests
        
        return response

# Adicionar o middleware personalizado (deve ser o primeiro da pilha)
app.add_middleware(CustomCORSMiddleware)

# Inclui as rotas de autenticação
app.include_router(auth_router)

# Inclui as rotas de mock
# app.include_router(mock_router)

# Inclui as rotas de informações da empresa
app.include_router(empresa_info_router)

# Inclui as rotas de relatórios
app.include_router(relatorios_router)

# Inclui as rotas de teste de empresa
# app.include_router(teste_empresa_router)

# Inclui as rotas de teste de seleção
# app.include_router(teste_selecionar_router)

# Inclui as rotas de teste de cabeçalhos
# app.include_router(teste_cabecalhos_router)

# Inclui as rotas de teste de conexão
# app.include_router(teste_conexao_router)

# Inclui as rotas de teste empresa CRUD
# app.include_router(teste_empresa_crud_router)

# Inclui as rotas de teste de seleção com session
# app.include_router(teste_selecao_session_router)

# Inclui as rotas de teste session simples
# app.include_router(teste_session_simples_router)

# Inclui as rotas de teste de conexão de empresa
# app.include_router(teste_conexao_api_router)

# Inclui as rotas de informações detalhadas da empresa
app.include_router(empresa_info_detalhada_router)

# Inclui as rotas de teste SQL da empresa
# app.include_router(teste_sql_empresa_router)

# Inclui as rotas de orçamentos
app.include_router(orcamento_router, tags=["Orçamentos"])

# Rotas básicas para teste
@app.get("/")
async def root():
    return {"message": "API de Força de Vendas funcionando!", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Endpoint de health check para verificar se a API está acessível"""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "message": "API está funcionando corretamente"
    }

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
                    NUMERO,
                    BAIRRO,
                    CIDADE,
                    UF,
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
                result = {
                    "id": row[0] if len(row) > 0 else None,
                    "nome": row[1] if len(row) > 1 else "",
                    "cnpj_cpf": row[2] if len(row) > 2 else "",
                    "endereco": row[3] if len(row) > 3 and row[3] is not None else "",
                    "numero": row[4] if len(row) > 4 and row[4] is not None else "",
                    "bairro": row[5] if len(row) > 5 and row[5] is not None else "",
                    "cidade": row[6] if len(row) > 6 and row[6] is not None else "",
                    "uf": row[7] if len(row) > 7 and row[7] is not None else "",
                    "telefone": row[8] if len(row) > 8 and row[8] is not None else "",
                    "email": row[9] if len(row) > 9 and row[9] is not None else ""
                }
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

@app.get("/clientes/buscar")
async def buscar_clientes(termo: str, db: Session = Depends(get_db)):
    try:
        query = """
            SELECT 
                CLI_CODIGO as codigo,
                CLI_NOME as nome,
                CLI_CNPJ as cnpj,
                CLI_CPF as cpf
            FROM CLIENTES 
            WHERE CLI_NOME LIKE :termo 
            OR CLI_CNPJ LIKE :termo 
            OR CLI_CPF LIKE :termo
            ORDER BY CLI_NOME
            FETCH FIRST 20 ROWS ONLY
        """
        result = await db.execute(text(query), {"termo": f"%{termo}%"})
        clientes = result.fetchall()
        return [dict(cliente) for cliente in clientes]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/produtos/buscar")
async def buscar_produtos(termo: str, db: Session = Depends(get_db)):
    try:
        query = """
            SELECT 
                PRO_CODIGO as codigo,
                PRO_DESCRICAO as descricao,
                PRO_VENDA as preco,
                PRO_QUANTIDADE as estoque,
                UNI_CODIGO as unidade,
                PRO_IMAGEM as imagem
            FROM PRODUTO 
            WHERE PRO_DESCRICAO LIKE :termo 
            OR PRO_CODIGO LIKE :termo
            ORDER BY PRO_DESCRICAO
            FETCH FIRST 20 ROWS ONLY
        """
        result = await db.execute(text(query), {"termo": f"%{termo}%"})
        produtos = result.fetchall()
        return [dict(produto) for produto in produtos]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ItemOrcamento(BaseModel):
    codigo: str
    descricao: str
    quantidade: float
    valor_unitario: float
    valor_total: float
    imagem: str = None

class OrcamentoCreate(BaseModel):
    cliente_codigo: str
    nome_cliente: str
    tabela_codigo: str = None
    formapag_codigo: str = None
    valor_total: float
    data_orcamento: str
    data_validade: str = None
    observacao: str = None
    vendedor_codigo: str = None
    especie: str = "0"
    desconto: float = 0
    produtos: List[ItemOrcamento]

@app.post("/orcamentos")
async def criar_orcamento(orcamento: OrcamentoCreate, db: Session = Depends(get_db)):
    try:
        # Iniciar transação
        async with db.begin():
            # Gerar número do orçamento
            query_numero = """
                SELECT COALESCE(MAX(ORC_NUMERO), 0) + 1 as proximo_numero
                FROM ORCAMENTO
            """
            result = await db.execute(text(query_numero))
            numero = result.scalar()

            # Inserir cabeçalho do orçamento
            query_orcamento = """
                INSERT INTO ORCAMENTO (
                    ORC_NUMERO,
                    CLI_CODIGO,
                    CLI_NOME,
                    TAB_CODIGO,
                    FPG_CODIGO,
                    ORC_TOTAL,
                    ORC_DATA,
                    ORC_VALIDADE,
                    ORC_OBSERVACAO,
                    VEN_CODIGO,
                    ORC_ESPECIE,
                    ORC_DESCONTO
                ) VALUES (
                    :numero,
                    :cliente_codigo,
                    :nome_cliente,
                    :tabela_codigo,
                    :formapag_codigo,
                    :valor_total,
                    :data_orcamento,
                    :data_validade,
                    :observacao,
                    :vendedor_codigo,
                    :especie,
                    :desconto
                )
            """
            await db.execute(text(query_orcamento), {
                "numero": numero,
                "cliente_codigo": orcamento.cliente_codigo,
                "nome_cliente": orcamento.nome_cliente,
                "tabela_codigo": orcamento.tabela_codigo,
                "formapag_codigo": orcamento.formapag_codigo,
                "valor_total": orcamento.valor_total,
                "data_orcamento": orcamento.data_orcamento,
                "data_validade": orcamento.data_validade,
                "observacao": orcamento.observacao,
                "vendedor_codigo": orcamento.vendedor_codigo,
                "especie": orcamento.especie,
                "desconto": orcamento.desconto
            })

            # Inserir itens do orçamento
            for idx, item in enumerate(orcamento.produtos, 1):
                query_item = """
                    INSERT INTO ITENS_ORCAMENTO (
                        ORC_NUMERO,
                        PRO_CODIGO,
                        PRO_DESCRICAO,
                        ITE_QUANTIDADE,
                        ITE_VALOR_UNITARIO,
                        ITE_VALOR_TOTAL,
                        ITE_SEQUENCIA,
                        PRO_IMAGEM
                    ) VALUES (
                        :numero,
                        :codigo,
                        :descricao,
                        :quantidade,
                        :valor_unitario,
                        :valor_total,
                        :sequencia,
                        :imagem
                    )
                """
                await db.execute(text(query_item), {
                    "numero": numero,
                    "codigo": item.codigo,
                    "descricao": item.descricao,
                    "quantidade": item.quantidade,
                    "valor_unitario": item.valor_unitario,
                    "valor_total": item.valor_total,
                    "sequencia": idx,
                    "imagem": item.imagem
                })

            return {
                "numero": numero,
                "mensagem": "Orçamento criado com sucesso"
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/orcamentos")
async def listar_orcamentos(
    cliente_codigo: str = None,
    data_inicio: str = None,
    data_fim: str = None,
    db: Session = Depends(get_db)
):
    try:
        query = """
            SELECT 
                o.ORC_NUMERO as numero,
                o.CLI_CODIGO as cliente_codigo,
                o.CLI_NOME as cliente_nome,
                o.ORC_TOTAL as total,
                o.ORC_DATA as data,
                o.ORC_VALIDADE as validade,
                o.ORC_OBSERVACAO as observacao,
                o.VEN_CODIGO as vendedor_codigo,
                o.ORC_ESPECIE as especie,
                o.ORC_DESCONTO as desconto,
                o.TAB_CODIGO as tabela_codigo,
                o.FPG_CODIGO as formapag_codigo
            FROM ORCAMENTO o
            WHERE 1=1
        """
        params = {}

        if cliente_codigo:
            query += " AND o.CLI_CODIGO = :cliente_codigo"
            params["cliente_codigo"] = cliente_codigo

        if data_inicio:
            query += " AND o.ORC_DATA >= :data_inicio"
            params["data_inicio"] = data_inicio

        if data_fim:
            query += " AND o.ORC_DATA <= :data_fim"
            params["data_fim"] = data_fim

        query += " ORDER BY o.ORC_DATA DESC, o.ORC_NUMERO DESC"

        result = await db.execute(text(query), params)
        orcamentos = result.fetchall()

        # Buscar itens de cada orçamento
        for orcamento in orcamentos:
            query_itens = """
                SELECT 
                    i.PRO_CODIGO as codigo,
                    i.PRO_DESCRICAO as descricao,
                    i.ITE_QUANTIDADE as quantidade,
                    i.ITE_VALOR_UNITARIO as valor_unitario,
                    i.ITE_VALOR_TOTAL as valor_total,
                    i.ITE_SEQUENCIA as sequencia,
                    i.PRO_IMAGEM as imagem
                FROM ITENS_ORCAMENTO i
                WHERE i.ORC_NUMERO = :numero
                ORDER BY i.ITE_SEQUENCIA
            """
            result_itens = await db.execute(text(query_itens), {"numero": orcamento.numero})
            orcamento.itens = [dict(item) for item in result_itens.fetchall()]

        return [dict(orcamento) for orcamento in orcamentos]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/orcamentos/{numero}")
async def buscar_orcamento(numero: int, db: Session = Depends(get_db)):
    try:
        # Buscar cabeçalho do orçamento
        query = """
            SELECT 
                o.ORC_NUMERO as numero,
                o.CLI_CODIGO as cliente_codigo,
                o.CLI_NOME as cliente_nome,
                o.ORC_TOTAL as total,
                o.ORC_DATA as data,
                o.ORC_VALIDADE as validade,
                o.ORC_OBSERVACAO as observacao,
                o.VEN_CODIGO as vendedor_codigo,
                o.ORC_ESPECIE as especie,
                o.ORC_DESCONTO as desconto,
                o.TAB_CODIGO as tabela_codigo,
                o.FPG_CODIGO as formapag_codigo
            FROM ORCAMENTO o
            WHERE o.ORC_NUMERO = :numero
        """
        result = await db.execute(text(query), {"numero": numero})
        orcamento = result.fetchone()

        if not orcamento:
            raise HTTPException(status_code=404, detail="Orçamento não encontrado")

        # Buscar itens do orçamento
        query_itens = """
            SELECT 
                i.PRO_CODIGO as codigo,
                i.PRO_DESCRICAO as descricao,
                i.ITE_QUANTIDADE as quantidade,
                i.ITE_VALOR_UNITARIO as valor_unitario,
                i.ITE_VALOR_TOTAL as valor_total,
                i.ITE_SEQUENCIA as sequencia,
                i.PRO_IMAGEM as imagem
            FROM ITENS_ORCAMENTO i
            WHERE i.ORC_NUMERO = :numero
            ORDER BY i.ITE_SEQUENCIA
        """
        result_itens = await db.execute(text(query_itens), {"numero": numero})
        orcamento.itens = [dict(item) for item in result_itens.fetchall()]

        return dict(orcamento)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/orcamentos/{numero}")
async def excluir_orcamento(numero: int, db: Session = Depends(get_db)):
    try:
        # Iniciar transação
        async with db.begin():
            # Verificar se o orçamento existe
            query_check = """
                SELECT COUNT(*) as total
                FROM ORCAMENTO
                WHERE ORC_NUMERO = :numero
            """
            result = await db.execute(text(query_check), {"numero": numero})
            if result.scalar() == 0:
                raise HTTPException(status_code=404, detail="Orçamento não encontrado")

            # Excluir itens do orçamento
            query_delete_itens = """
                DELETE FROM ITENS_ORCAMENTO
                WHERE ORC_NUMERO = :numero
            """
            await db.execute(text(query_delete_itens), {"numero": numero})

            # Excluir cabeçalho do orçamento
            query_delete_orcamento = """
                DELETE FROM ORCAMENTO
                WHERE ORC_NUMERO = :numero
            """
            await db.execute(text(query_delete_orcamento), {"numero": numero})

            return {
                "mensagem": "Orçamento excluído com sucesso"
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/orcamentos/{numero}")
async def atualizar_orcamento(numero: int, orcamento: OrcamentoCreate, db: Session = Depends(get_db)):
    try:
        # Iniciar transação
        async with db.begin():
            # Verificar se o orçamento existe
            query_check = """
                SELECT COUNT(*) as total
                FROM ORCAMENTO
                WHERE ORC_NUMERO = :numero
            """
            result = await db.execute(text(query_check), {"numero": numero})
            if result.scalar() == 0:
                raise HTTPException(status_code=404, detail="Orçamento não encontrado")

            # Atualizar cabeçalho do orçamento
            query_orcamento = """
                UPDATE ORCAMENTO SET
                    CLI_CODIGO = :cliente_codigo,
                    CLI_NOME = :nome_cliente,
                    TAB_CODIGO = :tabela_codigo,
                    FPG_CODIGO = :formapag_codigo,
                    ORC_TOTAL = :valor_total,
                    ORC_DATA = :data_orcamento,
                    ORC_VALIDADE = :data_validade,
                    ORC_OBSERVACAO = :observacao,
                    VEN_CODIGO = :vendedor_codigo,
                    ORC_ESPECIE = :especie,
                    ORC_DESCONTO = :desconto
                WHERE ORC_NUMERO = :numero
            """
            await db.execute(text(query_orcamento), {
                "numero": numero,
                "cliente_codigo": orcamento.cliente_codigo,
                "nome_cliente": orcamento.nome_cliente,
                "tabela_codigo": orcamento.tabela_codigo,
                "formapag_codigo": orcamento.formapag_codigo,
                "valor_total": orcamento.valor_total,
                "data_orcamento": orcamento.data_orcamento,
                "data_validade": orcamento.data_validade,
                "observacao": orcamento.observacao,
                "vendedor_codigo": orcamento.vendedor_codigo,
                "especie": orcamento.especie,
                "desconto": orcamento.desconto
            })

            # Excluir itens antigos
            query_delete_itens = """
                DELETE FROM ITENS_ORCAMENTO
                WHERE ORC_NUMERO = :numero
            """
            await db.execute(text(query_delete_itens), {"numero": numero})

            # Inserir novos itens
            for idx, item in enumerate(orcamento.produtos, 1):
                query_item = """
                    INSERT INTO ITENS_ORCAMENTO (
                        ORC_NUMERO,
                        PRO_CODIGO,
                        PRO_DESCRICAO,
                        ITE_QUANTIDADE,
                        ITE_VALOR_UNITARIO,
                        ITE_VALOR_TOTAL,
                        ITE_SEQUENCIA,
                        PRO_IMAGEM
                    ) VALUES (
                        :numero,
                        :codigo,
                        :descricao,
                        :quantidade,
                        :valor_unitario,
                        :valor_total,
                        :sequencia,
                        :imagem
                    )
                """
                await db.execute(text(query_item), {
                    "numero": numero,
                    "codigo": item.codigo,
                    "descricao": item.descricao,
                    "quantidade": item.quantidade,
                    "valor_unitario": item.valor_unitario,
                    "valor_total": item.valor_total,
                    "sequencia": idx,
                    "imagem": item.imagem
                })

            return {
                "mensagem": "Orçamento atualizado com sucesso"
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tabelas")
async def listar_tabelas(db: Session = Depends(get_db)):
    try:
        query = """
            SELECT 
                TAB_CODIGO as codigo,
                TAB_NOME as nome
            FROM TABELA_PRECO
            ORDER BY TAB_NOME
        """
        result = await db.execute(text(query))
        tabelas = result.fetchall()
        return [dict(tabela) for tabela in tabelas]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/formas-pagamento")
async def listar_formas_pagamento(db: Session = Depends(get_db)):
    try:
        query = """
            SELECT 
                FPG_CODIGO as codigo,
                FPG_NOME as nome
            FROM FORMA_PAGAMENTO
            ORDER BY FPG_NOME
        """
        result = await db.execute(text(query))
        formas = result.fetchall()
        return [dict(forma) for forma in formas]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/vendedores")
async def listar_vendedores(request: Request):
    try:
        # Usar a conexão direta do Firebird ao invés de SQLAlchemy
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        query = """
            SELECT 
                VEN_CODIGO as codigo,
                VEN_NOME as nome,
                VEN_DESC_MAXIMO as desconto_maximo
            FROM VENDEDOR
            ORDER BY VEN_NOME
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        
        vendedores = []
        for row in rows:
            vendedor = {
                "codigo": str(row[0]).strip() if row[0] else "",
                "nome": str(row[1]).strip() if row[1] else "",
                "desconto_maximo": float(row[2] or 0)
            }
            vendedores.append(vendedor)
        
        return vendedores
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    import argparse
    
    # Configurar argumentos de linha de comando
    parser = argparse.ArgumentParser(description="Servidor API Força de Vendas")
    parser.add_argument("--port", type=int, default=8000, help="Porta para executar o servidor (padrão: 8000)")
    args = parser.parse_args()
    
    print(f"Iniciando servidor na porta {args.port}...")
    uvicorn.run(app, host="0.0.0.0", port=args.port)
