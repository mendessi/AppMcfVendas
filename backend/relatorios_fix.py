from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from empresa_manager import get_empresa_connection, get_empresa_atual
import logging

# Configurar o logger
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("relatorios")

# Configurar o router
router = APIRouter(prefix="/relatorios", tags=["Relatórios"])

from fastapi import Response

# --- NOVOS ENDPOINTS PARA VENDAS E ITENS DE VENDA ---

@router.get("/vendas")
async def listar_vendas(request: Request):
    """
    Lista todas as vendas, com filtros opcionais por cliente, data_inicial e data_final.
    Parâmetros query:
      - cli_codigo: filtra por cliente
      - data_inicial, data_final: período (padrão: mês atual)
    """
    from datetime import date, timedelta
    log.info(f"[VENDAS] Listando vendas. Headers: {dict(request.headers)}")
    authorization = request.headers.get("Authorization")
    empresa_codigo = request.headers.get("x-empresa-codigo")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticação não fornecido")
    if not empresa_codigo:
        raise HTTPException(status_code=401, detail="Código da empresa não fornecido")
    try:
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        # Descobrir coluna de data válida
        cursor.execute("SELECT FIRST 1 * FROM VENDAS")
        colunas_vendas = [col[0].lower() for col in cursor.description]
        date_column = "ecf_data" if "ecf_data" in colunas_vendas else ("ecf_cx_data" if "ecf_cx_data" in colunas_vendas else None)
        if not date_column:
            conn.close()
            raise HTTPException(status_code=400, detail="Nenhuma coluna de data encontrada na tabela VENDAS (esperado: ecf_data ou ecf_cx_data)")
        hoje = date.today()
        data_inicial = request.query_params.get('data_inicial')
        data_final = request.query_params.get('data_final')
        if not data_inicial:
            data_inicial = date(hoje.year, hoje.month, 1).isoformat()
        if not data_final:
            if hoje.month == 12:
                proximo_mes = date(hoje.year + 1, 1, 1)
            else:
                proximo_mes = date(hoje.year, hoje.month + 1, 1)
            data_final = (proximo_mes - timedelta(days=1)).isoformat()
        cli_codigo = request.query_params.get('cli_codigo')
        log.info(f"Filtro de data: {date_column} entre {data_inicial} e {data_final}. Cliente: {cli_codigo}")
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
              VENDAS.ECF_DESCONTO,       -- Valor do Desconto
              VENDAS.ECF_CX_DATA         -- Data de autenticação no caixa
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
              AND VENDAS.{date_column} IS NOT NULL
              AND CAST(VENDAS.{date_column} AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
        '''
        params = [data_inicial, data_final]
        if cli_codigo:
            sql += " AND VENDAS.CLI_CODIGO = ?"
            params.append(cli_codigo)
        sql += " ORDER BY VENDAS.ECF_NUMERO DESC"
        cursor.execute(sql, tuple(params))
        columns = [col[0].lower() for col in cursor.description]
        vendas = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return vendas
    except Exception as e:
        import traceback
        log.error(f"Erro ao listar vendas: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro ao listar vendas: {e}")
    finally:
        try:
            conn.close()
        except:
            pass
