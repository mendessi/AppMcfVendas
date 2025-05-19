from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from typing import List, Optional, Dict, Any
import models
import database
from pydantic import BaseModel
import uvicorn
import logging
import os
from datetime import datetime
from starlette.responses import JSONResponse

# Importa os módulos de autenticação e gerenciamento de empresas
from auth import router as auth_router, get_current_user
from empresa_manager import (
    EmpresaSelect, 
    EmpresaData, 
    selecionar_empresa, 
    get_empresa_atual,
    get_empresa_connection,
    obter_empresas_usuario
)

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)

app = FastAPI(title="API Força de Vendas", description="API para aplicativo de força de vendas")

# Configuração CORS para permitir o frontend
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware personalizado para garantir cabeçalhos CORS em todas as respostas
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    response = await call_next(request)
    origin = request.headers.get("origin", "")
    
    # Se a origem estiver na lista de origens permitidas, use-a especificamente
    # caso contrário, não adicione o cabeçalho (o middleware CORSMiddleware cuidará disso)
    if origin in origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept"
    
    return response

# Inclui as rotas de autenticação
app.include_router(auth_router)

# Rotas básicas para teste
@app.get("/")
async def root():
    return {"message": "API de Força de Vendas funcionando!", "version": "1.0.0"}

# Rota para obter clientes
@app.get("/clientes")
async def get_clientes():
    try:
        return await database.get_clientes()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Rota para obter produtos
@app.get("/produtos")
async def get_produtos():
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

# Rota para obter pedidos
@app.get("/pedidos")
async def get_pedidos():
    try:
        return await database.get_pedidos()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Rota para listar empresas do usuário - SEM AUTENTICAÇÃO para testes
@app.get("/empresas")
async def listar_empresas():
    """
    Lista todas as empresas - versão sem autenticação para testes.
    """
    try:
        # Usar um ID fixo para testes
        usuario_id_teste = 1
        logging.info(f"Listando empresas para o usuário ID de teste: {usuario_id_teste}")
        
        # Obter as empresas usando o ID de teste
        empresas = await obter_empresas_usuario(usuario_id_teste)
        
        if not empresas:
            logging.warning(f"Nenhuma empresa encontrada para o usuário ID de teste: {usuario_id_teste}")
            raise HTTPException(
                status_code=404,
                detail="Nenhuma empresa encontrada para este usuário"
            )
            
        logging.info(f"Encontradas {len(empresas)} empresas para o usuário ID de teste: {usuario_id_teste}")
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
        logging.info(f"Selecionando empresa {empresa.cli_codigo} para o usuário ID: {user_data.user_id}")
        resultado = await selecionar_empresa(user_data.user_id, empresa.cli_codigo)
        logging.info(f"Empresa {empresa.cli_codigo} selecionada com sucesso para o usuário ID: {user_data.user_id}")
        return resultado
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro ao selecionar empresa: {str(e)}")
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
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
