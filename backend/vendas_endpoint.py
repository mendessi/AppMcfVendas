from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
import logging as log
import fdb
from urllib.parse import unquote
from utils import get_db_connection, get_empresa_info

# Configuração do router
router = APIRouter()

@router.get("/vendas")
async def listar_vendas(
    request: Request,
    data_inicial: Optional[str] = None,
    data_final: Optional[str] = None,
    cli_codigo: Optional[str] = None
):
    """
    Lista todas as vendas no período especificado.
    Parâmetros:
    - data_inicial: Data inicial no formato YYYY-MM-DD
    - data_final: Data final no formato YYYY-MM-DD
    - cli_codigo: Código do cliente (opcional)
    """
    log.info(f"[VENDAS] Headers recebidos: {dict(request.headers)}")
    authorization = request.headers.get("Authorization")
    empresa_codigo = request.headers.get("x-empresa-codigo")
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticação não fornecido")
    
    if not empresa_codigo:
        raise HTTPException(status_code=400, detail="Código da empresa não fornecido")
    
    try:
        # Obter conexão com o banco de dados
        conn = get_db_connection(empresa_codigo)
        cursor = conn.cursor()
        
        # Verificar se a tabela VENDAS existe
        try:
            cursor.execute("SELECT 1 FROM VENDAS WHERE 1=0")
        except Exception as e:
            log.error(f"Erro ao verificar tabela VENDAS: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={"detail": "Tabela VENDAS não encontrada"}
            )
        
        # Obter as colunas da tabela VENDAS
        cursor.execute("SELECT RDB$FIELD_NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME = 'VENDAS'")
        colunas_vendas = [col[0].strip().lower() for col in cursor.fetchall()]
        
        # Determinar a coluna de data a ser usada
        date_column = "ECF_DATA"
        
        # Definir período de datas
        if not data_inicial or not data_final:
            hoje = datetime.now()
            primeiro_dia = hoje.replace(day=1)
            proximo_mes = primeiro_dia + timedelta(days=32)
            proximo_mes = proximo_mes.replace(day=1)
            
            data_inicial = primeiro_dia.isoformat()
            data_final = (proximo_mes - timedelta(days=1)).isoformat()
        
        log.info(f"Filtro de data: {date_column} entre {data_inicial} e {data_final}. Cliente: {cli_codigo}")
        
        # Verificar se a coluna ECF_CX_DATA existe na tabela VENDAS
        existe_ecf_cx_data = "ecf_cx_data" in colunas_vendas
        log.info(f"Coluna ECF_CX_DATA existe? {existe_ecf_cx_data}")
        
        sql = f'''
            SELECT
              VENDAS.ECF_NUMERO,         -- ID da Venda
              VENDAS.ECF_DATA,           -- Data da Venda
              VENDEDOR.VEN_NOME,         -- Nome do Vendedor
              VENDAS.CLI_CODIGO,         -- Código do Cliente
              VENDAS.NOME,               -- Nome do Cliente
              VENDAS.ECF_TOTAL,          -- Total da Venda
              TABPRECO.TAB_NOME,         -- Nome da Tabela de Preço
              FORMAPAG.FPG_NOME,         -- Nome da Forma de Pagamento
              VENDAS.ECF_CAIXA,          -- Caixa que autenticou
              VENDAS.ECF_DESCONTO        -- Valor do Desconto
              {', VENDAS.ECF_CX_DATA' if existe_ecf_cx_data else ''}         -- Data de autenticação no caixa
            FROM
              VENDAS
            LEFT JOIN
              VENDEDOR ON VENDAS.VEN_CODIGO = VENDEDOR.VEN_CODIGO
            LEFT JOIN
              TABPRECO ON VENDAS.ECF_TAB_COD = TABPRECO.TAB_COD
            LEFT JOIN
              FORMAPAG ON VENDAS.ECF_FPG_COD = FORMAPAG.FPG_COD
            WHERE
              VENDAS.ECF_CANCELADA = 'N'
              AND VENDAS.ECF_CONCLUIDA = 'S'
              AND CAST(VENDAS.ECF_DATA AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
        '''
        
        params = [data_inicial, data_final]
        
        if cli_codigo:
            sql += "\nAND VENDAS.CLI_CODIGO = ?"
            params.append(cli_codigo)
        
        sql += "\nORDER BY VENDAS.ECF_DATA DESC"
        
        log.info(f"SQL: {sql}")
        log.info(f"Parâmetros: {params}")
        
        cursor.execute(sql, params)
        vendas = []
        
        for row in cursor.fetchall():
            venda = {
                "ecf_numero": row[0],
                "ecf_data": row[1].isoformat() if row[1] else None,
                "ven_nome": row[2],
                "cli_codigo": row[3],
                "nome": row[4],
                "ecf_total": float(row[5]) if row[5] is not None else 0.0,
                "tab_nome": row[6],
                "fpg_nome": row[7],
                "ecf_caixa": row[8],
                "ecf_desconto": float(row[9]) if row[9] is not None else 0.0
            }
            
            if existe_ecf_cx_data and len(row) > 10:
                venda["ecf_cx_data"] = row[10].isoformat() if row[10] else None
            
            vendas.append(venda)
        
        log.info(f"Total de vendas encontradas: {len(vendas)}")
        
        return vendas
    
    except Exception as e:
        log.error(f"Erro ao listar vendas: {str(e)}")
        import traceback
        log.error(traceback.format_exc())
        
        return JSONResponse(
            status_code=500,
            content={"detail": f"Erro ao listar vendas: {str(e)}"}
        )
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()
