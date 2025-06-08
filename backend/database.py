import asyncio
from typing import List, Dict, Any, Optional
import models
from datetime import datetime
import sys
import os

# Adiciona o diretório raiz ao path para importar o módulo conexao_firebird
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Importa o módulo de conexão existente
from conexao_firebird import obter_conexao_controladora, obter_conexao_cliente

# Função para obter uma conexão com o banco de dados
def get_connection():
    try:
        # Usa a função de conexão existente para conectar à base controladora
        conn = obter_conexao_controladora()
        return conn
    except Exception as e:
        print(f"Erro ao conectar ao banco de dados: {e}")
        raise

# Função para executar consultas no banco de dados
async def execute_query(query: str, params: tuple = None) -> List[Dict[str, Any]]:
    # Executa a consulta em uma thread separada para não bloquear o event loop
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _execute_query, query, params)

def _execute_query(query: str, params: tuple = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        
        # Obtém os nomes das colunas
        columns = [desc[0].lower() for desc in cursor.description] if cursor.description else []
        
        # Converte os resultados em uma lista de dicionários
        results = []
        for row in cursor.fetchall():
            result = {}
            for i, value in enumerate(row):
                result[columns[i]] = value
            results.append(result)
        
        conn.commit()
        return results
    except Exception as e:
        conn.rollback()
        print(f"Erro ao executar consulta: {e}")
        raise
    finally:
        conn.close()

# Função para obter clientes
async def get_clientes():
    query = """
    SELECT 
        ID, 
        NOME, 
        CNPJ_CPF, 
        ENDERECO, 
        TELEFONE, 
        EMAIL 
    FROM CLIENTES
    ORDER BY NOME
    """
    return await execute_query(query)

# Função para obter produtos
async def get_produtos():
    query = """
    SELECT 
        ID, 
        CODIGO, 
        DESCRICAO, 
        PRECO, 
        ESTOQUE, 
        UNIDADE 
    FROM PRODUTOS
    ORDER BY DESCRICAO
    """
    return await execute_query(query)

# Função para criar um pedido
async def create_pedido(pedido_data: models.PedidoCreate):
    # Inicia uma transação
    conn = get_connection()
    try:
        cursor = conn.cursor()
        
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
            pedido_data.cliente_id, 
            datetime.now(), 
            'PENDENTE', 
            0,  # Será atualizado depois
            pedido_data.observacao
        ))
        
        # Obtém o ID do pedido inserido
        pedido_id = cursor.fetchone()[0]
        
        # Calcula o valor total
        valor_total = 0
        
        # Insere os itens do pedido
        for item in pedido_data.itens:
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
        print(f"Erro ao criar pedido: {e}")
        raise
    finally:
        conn.close()

# Função para obter pedidos
async def get_pedidos():
    # Consulta para obter os pedidos
    query_pedidos = """
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
    """
    
    pedidos = await execute_query(query_pedidos)
    
    # Para cada pedido, obtém os itens
    for pedido in pedidos:
        query_itens = """
        SELECT 
            IP.PRODUTO_ID, 
            P.DESCRICAO AS PRODUTO_DESCRICAO,
            IP.QUANTIDADE, 
            IP.PRECO_UNITARIO, 
            IP.VALOR_TOTAL 
        FROM ITENS_PEDIDO IP
        JOIN PRODUTOS P ON IP.PRODUTO_ID = P.ID
        WHERE IP.PEDIDO_ID = ?
        """
        
        itens = await execute_query(query_itens, (pedido['id'],))
        pedido['itens'] = itens
    
    return pedidos
