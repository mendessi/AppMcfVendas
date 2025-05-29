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

# Modelos para as respostas
class TopVendedor(BaseModel):
    """Modelo para representar um vendedor no relatório de top vendedores"""
    nome: str
    total: float
    qtde_vendas: int = 0
    codigo: Optional[int] = None
    meta: Optional[float] = 50000.00

class TopVendedoresResponse(BaseModel):
    """Modelo para a resposta do endpoint de top vendedores"""
    data_inicial: str
    data_final: str
    top_vendedores: List[TopVendedor]
    filtro_vendedor_aplicado: bool = False

class DashboardStats(BaseModel):
    """Modelo para dados estatísticos do Dashboard"""
    vendas_dia: float = 0
    vendas_mes: float = 0
    total_clientes: int = 0
    total_produtos: int = 0
    total_pedidos: int = 0
    valor_total_pedidos: float = 0
    vendas_nao_autenticadas: float = 0
    percentual_crescimento: float = 0
    vendas_autenticadas: float = 0

class TopCliente(BaseModel):
    """Modelo para representar um cliente no relatório de top clientes"""
    nome: str
    total: float
    qtde_vendas: int = 0
    codigo: Optional[int] = None
    cidade: str
    uf: str
    qtde_compras: int
    ecf_data: Optional[str] = None

class TopClientesResponse(BaseModel):
    """Modelo para a resposta do endpoint de top clientes"""
    data_inicial: str
    data_final: str
    top_clientes: List[TopCliente]

class VendaPorDia(BaseModel):
    """Modelo para representar vendas por dia"""
    data: str
    total: float
    quantidade: int

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

@router.get("/dashboard-stats")
async def get_dashboard_stats(request: Request, data_inicial: Optional[str] = None, data_final: Optional[str] = None):
    """
    Endpoint para obter estatísticas gerais para o Dashboard, incluindo vendas do dia, do mês, etc.
    """
    log.info(f"Recebendo requisição para dashboard-stats com data_inicial={data_inicial} e data_final={data_final}")
    
    try:
        # Definir datas padrão se não fornecidas
        hoje = date.today()
        
        # Data atual para vendas do dia
        data_hoje = hoje.isoformat()
        
        # Data inicial do mês (para vendas do mês)
        if not data_inicial:
            data_inicial = date(hoje.year, hoje.month, 1).isoformat()
        else:
            # Validar formato
            datetime.fromisoformat(data_inicial)
            
        # Data final do mês
        if not data_final:
            # Último dia do mês
            if hoje.month == 12:
                proximo_mes = date(hoje.year + 1, 1, 1)
            else:
                proximo_mes = date(hoje.year, hoje.month + 1, 1)
            ultimo_dia = (proximo_mes - timedelta(days=1)).isoformat()
            data_final = ultimo_dia
        else:
            # Validar formato
            datetime.fromisoformat(data_final)
            
        log.info(f"Período de consulta: {data_inicial} a {data_final}")
        
        # Obter a conexão com o banco da empresa selecionada
        empresa = get_empresa_atual(request)
        if not empresa:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                              detail="Empresa não encontrada. Selecione uma empresa válida.")
        
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        stats = DashboardStats()
        
        try:
            # Consulta para vendas do dia
            sql_vendas_dia = """
                SELECT COALESCE(SUM(ECF_TOTAL), 0)
                FROM VENDAS
                WHERE VENDAS.ecf_cancelada = 'N'
                AND VENDAS.ecf_concluida = 'S'
                AND CAST(VENDAS.ecf_data AS DATE) = CAST(? AS DATE)
            """
            cursor.execute(sql_vendas_dia, (data_hoje,))
            row = cursor.fetchone()
            if row and row[0] is not None:
                stats.vendas_dia = float(row[0])
            
            # Consulta para vendas do mês
            sql_vendas_mes = """
                SELECT COALESCE(SUM(ECF_TOTAL), 0)
                FROM VENDAS
                WHERE VENDAS.ecf_cancelada = 'N'
                AND VENDAS.ecf_concluida = 'S'
                AND CAST(VENDAS.ecf_data AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
            """
            cursor.execute(sql_vendas_mes, (data_inicial, data_final))
            row = cursor.fetchone()
            if row and row[0] is not None:
                stats.vendas_mes = float(row[0])
            
            # Consulta para vendas autenticadas e não autenticadas
            sql_vendas_auth = """
                SELECT 
                    COALESCE(SUM(CASE WHEN ECF_CX_DATA IS NOT NULL THEN ECF_TOTAL ELSE 0 END), 0) as VENDAS_AUTH,
                    COALESCE(SUM(CASE WHEN ECF_CX_DATA IS NULL THEN ECF_TOTAL ELSE 0 END), 0) as VENDAS_NAO_AUTH
                FROM VENDAS
                WHERE VENDAS.ecf_cancelada = 'N'
                AND VENDAS.ecf_concluida = 'S'
                AND CAST(VENDAS.ecf_data AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
            """
            cursor.execute(sql_vendas_auth, (data_inicial, data_final))
            row = cursor.fetchone()
            if row:
                stats.vendas_autenticadas = float(row[0] or 0)
                stats.vendas_nao_autenticadas = float(row[1] or 0)
            
            # Consulta para total de clientes
            sql_total_clientes = "SELECT COUNT(*) FROM CLIENTES"
            cursor.execute(sql_total_clientes)
            row = cursor.fetchone()
            if row and row[0] is not None:
                stats.total_clientes = int(row[0])
            
            # Consulta para total de produtos
            sql_total_produtos = "SELECT COUNT(*) FROM PRODUTO"
            cursor.execute(sql_total_produtos)
            row = cursor.fetchone()
            if row and row[0] is not None:
                stats.total_produtos = int(row[0])
            
            # Consulta para total de pedidos no período
            sql_total_pedidos = """
                SELECT COUNT(*), COALESCE(SUM(ECF_TOTAL), 0)
                FROM VENDAS
                WHERE VENDAS.ecf_cancelada = 'N'
                AND VENDAS.ecf_concluida = 'S'
                AND CAST(VENDAS.ecf_data AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
            """
            cursor.execute(sql_total_pedidos, (data_inicial, data_final))
            row = cursor.fetchone()
            if row:
                stats.total_pedidos = int(row[0] or 0)
                stats.valor_total_pedidos = float(row[1] or 0)
            
            return stats
            
        except Exception as e:
            log.error(f"Erro ao buscar estatísticas: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erro ao buscar estatísticas: {str(e)}")
        finally:
            try:
                conn.close()
            except:
                pass
                
    except Exception as e:
        log.error(f"Erro geral ao buscar estatísticas do dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro geral: {str(e)}")

@router.get("/top-vendedores")
async def get_top_vendedores(request: Request, data_inicial: Optional[str] = None, data_final: Optional[str] = None):
    """
    Endpoint para obter os top vendedores com maior volume de vendas no período.
    """
    log.info(f"Recebendo requisição para top-vendedores com data_inicial={data_inicial} e data_final={data_final}")
    
    try:
        # Definir datas padrão se não fornecidas
        hoje = date.today()
        if not data_inicial:
            data_inicial = date(hoje.year, hoje.month, 1).isoformat()
        if not data_final:
            if hoje.month == 12:
                proximo_mes = date(hoje.year + 1, 1, 1)
            else:
                proximo_mes = date(hoje.year, hoje.month + 1, 1)
            data_final = (proximo_mes - timedelta(days=1)).isoformat()
            
        # Obter a conexão com o banco da empresa selecionada
        empresa = get_empresa_atual(request)
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
            
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        try:
            # Consulta para top vendedores
            sql = """
                SELECT 
                    V.VEN_NOME,
                    V.VEN_CODIGO,
                    COUNT(*) as QTD_VENDAS,
                    COALESCE(SUM(VD.ECF_TOTAL), 0) as TOTAL,
                    COALESCE(V.VEN_META, 50000.00) as META
                FROM VENDAS VD
                LEFT JOIN VENDEDOR V ON VD.VEN_CODIGO = V.VEN_CODIGO
                WHERE VD.ECF_CANCELADA = 'N'
                AND VD.ECF_CONCLUIDA = 'S'
                AND CAST(VD.ECF_DATA AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
                GROUP BY V.VEN_NOME, V.VEN_CODIGO, V.VEN_META
                ORDER BY TOTAL DESC
            """
            
            cursor.execute(sql, (data_inicial, data_final))
            rows = cursor.fetchall()
            
            top_vendedores = []
            for row in rows:
                vendedor = TopVendedor(
                    nome=row[0] or "Nome não informado",
                    codigo=row[1],
                    qtde_vendas=int(row[2] or 0),
                    total=float(row[3] or 0),
                    meta=float(row[4] or 50000.00)
                )
                top_vendedores.append(vendedor)
            
            return TopVendedoresResponse(
                data_inicial=data_inicial,
                data_final=data_final,
                top_vendedores=top_vendedores
            )
            
        except Exception as e:
            log.error(f"Erro ao buscar top vendedores: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erro ao buscar top vendedores: {str(e)}")
        finally:
            try:
                conn.close()
            except:
                pass
                
    except Exception as e:
        log.error(f"Erro geral ao buscar top vendedores: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro geral: {str(e)}")

@router.get("/top-clientes")
async def get_top_clientes(request: Request, data_inicial: Optional[str] = None, data_final: Optional[str] = None):
    """
    Endpoint para obter os top clientes com maior volume de compras no período.
    """
    log.info(f"Recebendo requisição para top-clientes com data_inicial={data_inicial} e data_final={data_final}")
    
    try:
        # Definir datas padrão se não fornecidas
        hoje = date.today()
        if not data_inicial:
            data_inicial = date(hoje.year, hoje.month, 1).isoformat()
        if not data_final:
            if hoje.month == 12:
                proximo_mes = date(hoje.year + 1, 1, 1)
            else:
                proximo_mes = date(hoje.year, hoje.month + 1, 1)
            data_final = (proximo_mes - timedelta(days=1)).isoformat()
            
        # Obter a conexão com o banco da empresa selecionada
        empresa = get_empresa_atual(request)
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
            
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        try:
            # Consulta para top clientes
            sql = """
                SELECT FIRST 10
                    C.CLI_NOME,
                    C.CLI_CODIGO,
                    C.CIDADE,
                    C.UF,
                    COUNT(*) as QTD_VENDAS,
                    COALESCE(SUM(V.ECF_TOTAL), 0) as TOTAL,
                    MAX(V.ECF_DATA) as ULTIMA_COMPRA
                FROM VENDAS V
                LEFT JOIN CLIENTES C ON V.CLI_CODIGO = C.CLI_CODIGO
                WHERE V.ECF_CANCELADA = 'N'
                AND V.ECF_CONCLUIDA = 'S'
                AND CAST(V.ECF_DATA AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
                GROUP BY C.CLI_NOME, C.CLI_CODIGO, C.CIDADE, C.UF
                ORDER BY TOTAL DESC
            """
            
            cursor.execute(sql, (data_inicial, data_final))
            rows = cursor.fetchall()
            
            top_clientes = []
            for row in rows:
                cliente = TopCliente(
                    nome=row[0] or "Nome não informado",
                    codigo=row[1],
                    cidade=row[2] or "",
                    uf=row[3] or "",
                    qtde_compras=int(row[4] or 0),
                    total=float(row[5] or 0),
                    ecf_data=row[6].isoformat() if row[6] else None
                )
                top_clientes.append(cliente)
            
            return TopClientesResponse(
                data_inicial=data_inicial,
                data_final=data_final,
                top_clientes=top_clientes
            )
            
        except Exception as e:
            log.error(f"Erro ao buscar top clientes: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erro ao buscar top clientes: {str(e)}")
        finally:
            try:
                conn.close()
            except:
                pass
                
    except Exception as e:
        log.error(f"Erro geral ao buscar top clientes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro geral: {str(e)}")

@router.get("/vendas-por-dia")
async def get_vendas_por_dia(request: Request, data_inicial: Optional[str] = None, data_final: Optional[str] = None):
    """
    Endpoint para retornar as vendas agrupadas por dia no período informado.
    """
    log.info(f"Recebendo requisição para vendas-por-dia com data_inicial={data_inicial} e data_final={data_final}")
    
    try:
        # Definir datas padrão se não fornecidas
        hoje = date.today()
        if not data_inicial:
            data_inicial = date(hoje.year, hoje.month, 1).isoformat()
        if not data_final:
            if hoje.month == 12:
                proximo_mes = date(hoje.year + 1, 1, 1)
            else:
                proximo_mes = date(hoje.year, hoje.month + 1, 1)
            data_final = (proximo_mes - timedelta(days=1)).isoformat()
            
        # Obter a conexão com o banco da empresa selecionada
        empresa = get_empresa_atual(request)
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
            
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        try:
            # Consulta para vendas por dia
            sql = """
                SELECT 
                    CAST(ECF_DATA AS DATE) as DATA,
                    COUNT(*) as QUANTIDADE,
                    COALESCE(SUM(ECF_TOTAL), 0) as TOTAL
                FROM VENDAS
                WHERE ECF_CANCELADA = 'N'
                AND ECF_CONCLUIDA = 'S'
                AND CAST(ECF_DATA AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
                GROUP BY CAST(ECF_DATA AS DATE)
                ORDER BY DATA
            """
            
            cursor.execute(sql, (data_inicial, data_final))
            rows = cursor.fetchall()
            
            vendas_por_dia = []
            for row in rows:
                venda = VendaPorDia(
                    data=row[0].isoformat(),
                    quantidade=int(row[1] or 0),
                    total=float(row[2] or 0)
                )
                vendas_por_dia.append(venda)
            
            return vendas_por_dia
            
        except Exception as e:
            log.error(f"Erro ao buscar vendas por dia: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erro ao buscar vendas por dia: {str(e)}")
        finally:
            try:
                conn.close()
            except:
                pass
                
    except Exception as e:
        log.error(f"Erro geral ao buscar vendas por dia: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro geral: {str(e)}")

@router.get("/clientes/{cliente_codigo}/vendas")
async def get_vendas_cliente(request: Request, cliente_codigo: str, data_inicial: Optional[str] = None, data_final: Optional[str] = None):
    """
    Endpoint para retornar as vendas de um cliente específico no período informado.
    """
    log.info(f"[VENDAS_CLIENTE] Iniciando busca de vendas para cliente {cliente_codigo}")
    
    try:
        # Validar código do cliente
        if not cliente_codigo or cliente_codigo == "0":
            log.info(f"[VENDAS_CLIENTE] Cliente não informado ou código 0")
            return {
                "cliente_codigo": cliente_codigo,
                "data_inicial": data_inicial,
                "data_final": data_final,
                "total_vendas": 0,
                "valor_total": 0,
                "vendas": [],
                "mensagem": "Cliente não informado"
            }
            
        # Definir datas padrão se não fornecidas
        hoje = date.today()
        if not data_inicial:
            data_inicial = date(hoje.year, hoje.month, 1).isoformat()
        if not data_final:
            if hoje.month == 12:
                proximo_mes = date(hoje.year + 1, 1, 1)
            else:
                proximo_mes = date(hoje.year, hoje.month + 1, 1)
            data_final = (proximo_mes - timedelta(days=1)).isoformat()
            
        log.info(f"[VENDAS_CLIENTE] Período: {data_inicial} a {data_final}")
            
        # Obter a conexão com o banco da empresa selecionada
        empresa = get_empresa_atual(request)
        if not empresa:
            log.error("[VENDAS_CLIENTE] Empresa não encontrada")
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
            
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        try:
            # Primeiro verifica se o cliente existe
            log.info(f"[VENDAS_CLIENTE] Verificando existência do cliente {cliente_codigo}")
            cursor.execute("SELECT CLI_CODIGO, CLI_NOME FROM CLIENTES WHERE CLI_CODIGO = ?", (cliente_codigo,))
            cliente = cursor.fetchone()
            
            if not cliente:
                log.info(f"[VENDAS_CLIENTE] Cliente {cliente_codigo} não encontrado")
                return {
                    "cliente_codigo": cliente_codigo,
                    "data_inicial": data_inicial,
                    "data_final": data_final,
                    "total_vendas": 0,
                    "valor_total": 0,
                    "vendas": [],
                    "mensagem": "Cliente não encontrado"
                }
            
            log.info(f"[VENDAS_CLIENTE] Cliente encontrado: {cliente[1]}")
            
            # Consulta para vendas do cliente
            sql = """
                SELECT 
                    V.ECF_NUMERO,
                    V.ECF_DATA,
                    V.ECF_TOTAL,
                    V.ECF_DESCONTO,
                    V.ECF_CAIXA,
                    V.ECF_CX_DATA,
                    V.VEN_CODIGO,
                    VEND.VEN_NOME,
                    V.ECF_TAB_COD,
                    TAB.TAB_NOME,
                    V.ECF_FPG_COD,
                    FPG.FPG_NOME,
                    V.ECF_TOTAL_ITENS
                FROM VENDAS V
                LEFT JOIN VENDEDOR VEND ON V.VEN_CODIGO = VEND.VEN_CODIGO
                LEFT JOIN TABPRECO TAB ON V.ECF_TAB_COD = TAB.TAB_COD
                LEFT JOIN FORMAPAG FPG ON V.ECF_FPG_COD = FPG.FPG_COD
                WHERE V.CLI_CODIGO = ?
                AND V.ECF_CANCELADA = 'N'
                AND V.ECF_CONCLUIDA = 'S'
                AND CAST(V.ECF_DATA AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
                ORDER BY V.ECF_DATA DESC, V.ECF_NUMERO DESC
            """
            
            log.info(f"[VENDAS_CLIENTE] Executando consulta de vendas")
            cursor.execute(sql, (cliente_codigo, data_inicial, data_final))
            rows = cursor.fetchall()
            log.info(f"[VENDAS_CLIENTE] Encontradas {len(rows)} vendas")
            
            vendas = []
            for idx, row in enumerate(rows):
                try:
                    # Converte valores numéricos garantindo que sejam float
                    total = float(row[2] or 0)
                    desconto = float(row[3] or 0)
                    total_itens = int(row[12] or 0)
                    
                    venda = {
                        "id": f"venda_{row[0]}_{idx}",  # ID único para cada venda
                        "ecf_numero": row[0],
                        "ecf_data": row[1].isoformat() if row[1] else None,
                        "ecf_total": total,
                        "ecf_desconto": desconto,
                        "ecf_caixa": row[4],
                        "ecf_cx_data": row[5].isoformat() if row[5] else None,
                        "ven_codigo": row[6],
                        "ven_nome": row[7],
                        "tab_codigo": row[8],
                        "tab_nome": row[9],
                        "fpg_codigo": row[10],
                        "fpg_nome": row[11],
                        "ecf_total_itens": total_itens
                    }
                    vendas.append(venda)
                except Exception as e:
                    log.error(f"[VENDAS_CLIENTE] Erro ao processar venda {row[0] if row else 'N/A'}: {str(e)}")
                    continue
            
            # Garante que vendas seja sempre um array
            if not isinstance(vendas, list):
                log.warning("[VENDAS_CLIENTE] vendas não é uma lista, convertendo para lista vazia")
                vendas = []
            
            log.info(f"[VENDAS_CLIENTE] Processamento concluído com sucesso")
            if not vendas:
                return {
                    "cliente_codigo": cliente_codigo,
                    "cliente_nome": cliente[1] if cliente else None,
                    "data_inicial": data_inicial,
                    "data_final": data_final,
                    "total_vendas": 0,
                    "valor_total": 0,
                    "vendas": []
                }
            
            # Retorna diretamente o array de vendas
            return vendas
            
        except Exception as e:
            import traceback
            log.error(f"[VENDAS_CLIENTE] Erro ao buscar vendas do cliente: {str(e)}\n{traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Erro ao buscar vendas do cliente: {str(e)}")
        finally:
            try:
                conn.close()
            except:
                pass
                
    except Exception as e:
        import traceback
        log.error(f"[VENDAS_CLIENTE] Erro geral: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro geral: {str(e)}")

@router.get("/vendas/{ecf_numero}/itens")
async def get_itens_venda(request: Request, ecf_numero: str):
    """
    Endpoint para retornar os itens de uma venda específica.
    """
    log.info(f"[ITENS_VENDA] Buscando itens da venda {ecf_numero}")
    
    try:
        # Validar número da venda
        if not ecf_numero:
            log.info("[ITENS_VENDA] Número da venda não informado")
            return {
                "ecf_numero": ecf_numero,
                "itens": [],
                "mensagem": "Número da venda não informado"
            }
            
        # Obter a conexão com o banco da empresa selecionada
        empresa = get_empresa_atual(request)
        if not empresa:
            log.error("[ITENS_VENDA] Empresa não encontrada")
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
            
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        try:
            # Consulta para itens da venda
            sql = """
                SELECT 
                    I.ECF_NUMERO,
                    I.PRO_CODIGO,
                    I.PRO_DESCRICAO,
                    I.PRO_QUANTIDADE,
                    I.PRO_VENDA,
                    (I.PRO_QUANTIDADE * I.PRO_VENDA) as PRO_TOTAL,
                    P.PRO_MARCA,
                    P.UNI_CODIGO,
                    P.PRO_QUANTIDADE AS ESTOQUE_ATUAL
                FROM ITVENDA I
                LEFT JOIN PRODUTO P ON I.PRO_CODIGO = P.PRO_CODIGO
                WHERE I.ECF_NUMERO = ?
                ORDER BY I.IEC_SEQUENCIA
            """
            
            log.info(f"[ITENS_VENDA] Executando consulta de itens")
            cursor.execute(sql, (ecf_numero,))
            rows = cursor.fetchall()
            log.info(f"[ITENS_VENDA] Encontrados {len(rows)} itens")
            
            itens = []
            for idx, row in enumerate(rows):
                try:
                    # Converte valores numéricos garantindo que sejam float
                    quantidade = float(row[3] if row[3] is not None else 0)
                    valor_unitario = float(row[4] if row[4] is not None else 0)
                    total = quantidade * valor_unitario  # Calcula o total aqui também
                    estoque = float(row[8] if row[8] is not None else 0)
                    
                    item = {
                        "id": f"item_{row[0]}_{row[1]}_{idx}",  # ID único para cada item
                        "ECF_NUMERO": row[0],
                        "PRO_CODIGO": row[1],
                        "PRO_DESCRICAO": row[2] if row[2] is not None else "",
                        "PRO_QUANTIDADE": quantidade,
                        "PRO_VENDA": valor_unitario,
                        "PRO_TOTAL": total,
                        "PRO_MARCA": row[5] if row[5] is not None else "",
                        "UNI_CODIGO": row[6] if row[6] is not None else "",
                        "ESTOQUE_ATUAL": estoque
                    }
                    itens.append(item)
                except Exception as e:
                    log.error(f"[ITENS_VENDA] Erro ao processar item {row[1] if row else 'N/A'}: {str(e)}")
                    continue
            
            # Garante que itens seja sempre um array
            if not isinstance(itens, list):
                log.warning("[ITENS_VENDA] itens não é uma lista, convertendo para lista vazia")
                itens = []
            
            log.info(f"[ITENS_VENDA] Processamento concluído com sucesso")
            if not itens:
                return {
                    "ecf_numero": ecf_numero,
                    "itens": [],
                    "mensagem": "Nenhum item encontrado para esta venda"
                }
            
            # Retorna diretamente o array de itens
            return itens
            
        except Exception as e:
            import traceback
            log.error(f"[ITENS_VENDA] Erro ao buscar itens da venda: {str(e)}\n{traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Erro ao buscar itens da venda: {str(e)}")
        finally:
            try:
                conn.close()
            except:
                pass
                
    except Exception as e:
        import traceback
        log.error(f"[ITENS_VENDA] Erro geral: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro geral: {str(e)}")

@router.get("/listar_tabelas")
async def listar_tabelas(request: Request):
    """
    Endpoint para listar todas as tabelas de preço.
    """
    try:
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        sql = """
            SELECT 
                TAB_COD as codigo,
                TAB_NOME as nome
            FROM TABPRECO
            ORDER BY TAB_NOME
        """
        
        cursor.execute(sql)
        rows = cursor.fetchall()
        
        tabelas = []
        for row in rows:
            tabela = {
                "codigo": row[0],
                "nome": row[1] or ""
            }
            tabelas.append(tabela)
            
        return tabelas
        
    except Exception as e:
        log.error(f"Erro ao listar tabelas: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao listar tabelas: {str(e)}")
    finally:
        try:
            conn.close()
        except:
            pass

@router.get("/listar_formas_pagamento")
async def listar_formas_pagamento(request: Request):
    """
    Endpoint para listar todas as formas de pagamento.
    """
    try:
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        sql = """
            SELECT 
                FPG_COD as codigo,
                FPG_NOME as nome
            FROM FORMAPAG
            ORDER BY FPG_NOME
        """
        
        cursor.execute(sql)
        rows = cursor.fetchall()
        
        formas = []
        for row in rows:
            forma = {
                "codigo": row[0],
                "nome": row[1] or ""
            }
            formas.append(forma)
            
        return formas
        
    except Exception as e:
        log.error(f"Erro ao listar formas de pagamento: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao listar formas de pagamento: {str(e)}")
    finally:
        try:
            conn.close()
        except:
            pass

@router.get("/listar_vendedores")
async def listar_vendedores(request: Request):
    """
    Endpoint para listar todos os vendedores.
    """
    try:
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        sql = """
            SELECT 
                VEN_CODIGO as codigo,
                VEN_NOME as nome
            FROM VENDEDOR
            ORDER BY VEN_NOME
        """
        
        cursor.execute(sql)
        rows = cursor.fetchall()
        
        vendedores = []
        for row in rows:
            vendedor = {
                "codigo": row[0],
                "nome": row[1] or ""
            }
            vendedores.append(vendedor)
            
        return vendedores
        
    except Exception as e:
        log.error(f"Erro ao listar vendedores: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao listar vendedores: {str(e)}")
    finally:
        try:
            conn.close()
        except:
            pass

@router.get("/clientes")
async def buscar_clientes(request: Request, q: str = ""):
    """
    Endpoint para buscar clientes por nome ou CNPJ.
    """
    try:
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        sql = """
            SELECT FIRST 20
                CLI_CODIGO,
                CLI_NOME,
                APELIDO,
                CONTATO,
                CPF,
                CNPJ
            FROM CLIENTES
            WHERE UPPER(CLI_NOME) CONTAINING UPPER(?)
               OR CNPJ CONTAINING ?
            ORDER BY CLI_NOME
        """
        cursor.execute(sql, (q, q))
        rows = cursor.fetchall()
        
        clientes = []
        for row in rows:
            cliente = {
                "cli_codigo": row[0],
                "cli_nome": row[1] or "",
                "apelido": row[2] or "",
                "contato": row[3] or "",
                "cpf": row[4] or "",
                "cnpj": row[5] or ""
            }
            clientes.append(cliente)
        
        return clientes
        
    except Exception as e:
        log.error(f"Erro ao buscar clientes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar clientes: {str(e)}")
    finally:
        try:
            conn.close()
        except:
            pass

@router.get("/produtos")
async def buscar_produtos(request: Request, q: str = ""):
    """
    Endpoint para buscar produtos por descrição, código ou marca.
    """
    try:
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        sql = """
            SELECT FIRST 20
                P.PRO_CODIGO,
                P.PRO_DESCRICAO,
                P.PRO_VENDA,
                P.PRO_VENDAPZ,
                P.PRO_DESCPROVLR,
                P.PRO_MARCA,
                P.UNI_CODIGO,
                P.PRO_QUANTIDADE,
                P.PRO_IMAGEM
            FROM PRODUTO P
            WHERE UPPER(P.PRO_DESCRICAO) CONTAINING UPPER(?)
            OR CAST(P.PRO_CODIGO AS VARCHAR(20)) CONTAINING ?
            OR UPPER(P.PRO_MARCA) CONTAINING UPPER(?)
            ORDER BY P.PRO_DESCRICAO
        """
        
        cursor.execute(sql, (q, q, q))
        rows = cursor.fetchall()
        
        produtos = []
        for row in rows:
            try:
                # Log para debug
                log.info(f"Processando produto: {row[0]} - {row[1]}")
                log.info(f"Valores: venda={row[2]}, prazo={row[3]}, minimo={row[4]}")
                
                valor_unitario = float(row[2]) if row[2] is not None else 0.0
                valor_prazo = float(row[3]) if row[3] is not None else 0.0
                valor_minimo = float(row[4]) if row[4] is not None else 0.0
                estoque = float(row[7]) if row[7] is not None else 0.0
                
                produto = {
                    "pro_codigo": row[0],
                    "pro_descricao": row[1] or "",
                    "pro_venda": valor_unitario,
                    "pro_vendapz": valor_prazo,
                    "pro_descprovlr": valor_minimo,
                    "pro_marca": row[5] or "",
                    "uni_codigo": row[6] or "",
                    "pro_quantidade": estoque,
                    "pro_imagem": row[8] or ""
                }
                
                # Log para debug do produto processado
                log.info(f"Produto processado: {produto}")
                
                produtos.append(produto)
            except (ValueError, TypeError) as e:
                log.error(f"Erro ao processar produto {row[0]}: {str(e)}")
                continue
            
        return produtos
        
    except Exception as e:
        log.error(f"Erro ao buscar produtos: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar produtos: {str(e)}")
    finally:
        try:
            conn.close()
        except:
            pass

@router.get("/produtos/estrutura")
async def verificar_estrutura_produto(request: Request):
    """
    Endpoint temporário para verificar a estrutura da tabela PRODUTO.
    """
    try:
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        # Consulta para obter a estrutura da tabela
        sql = """
            SELECT FIRST 1 *
            FROM PRODUTO
        """
        
        cursor.execute(sql)
        columns = [col[0] for col in cursor.description]
        
        return {
            "colunas": columns,
            "mensagem": "Estrutura da tabela PRODUTO"
        }
        
    except Exception as e:
        log.error(f"Erro ao verificar estrutura: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao verificar estrutura: {str(e)}")
    finally:
        try:
            conn.close()
        except:
            pass

@router.get("/top-produtos")
async def top_produtos(request: Request, data_inicial: Optional[str] = None, data_final: Optional[str] = None):
    try:
        # Obter parâmetros da query string
        data_inicial = request.query_params.get('data_inicial')
        data_final = request.query_params.get('data_final')
        
        if not data_inicial or not data_final:
            return JSONResponse({'error': 'Data inicial e final são obrigatórias'}), 400

        # Conectar ao banco de dados
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()

        # Buscar top produtos por valor
        try:
            logging.info("Buscando top produtos por valor (com estoque e mínimo)")
            cursor.execute(
                f"""
                SELECT FIRST 10 
                    PRODUTO.PRO_CODIGO,
                    PRODUTO.PRO_DESCRICAO,
                    COALESCE(SUM(ITVENDA.PRO_QUANTIDADE * ITVENDA.PRO_VENDA), 0) AS TOTAL,
                    COALESCE(PRODUTO.PRO_QUANTIDADE, 0) AS ESTOQUE,
                    COALESCE(PRODUTO.PRO_MINIMA, 0) AS EST_MINIMO
                FROM ITVENDA
                JOIN VENDAS ON VENDAS.ECF_NUMERO = ITVENDA.ECF_NUMERO
                     AND VENDAS.ECF_CANCELADA = 'N'
                     AND VENDAS.ECF_CONCLUIDA = 'S'
                JOIN PRODUTO ON PRODUTO.PRO_CODIGO = ITVENDA.PRO_CODIGO
                WHERE VENDAS.ECF_DATA BETWEEN ? AND ?
                GROUP BY PRODUTO.PRO_CODIGO, PRODUTO.PRO_DESCRICAO, PRODUTO.PRO_QUANTIDADE, PRODUTO.PRO_MINIMA
                ORDER BY TOTAL DESC
                """,
                (data_inicial, data_final),
            )
            produtos = cursor.fetchall() or []
            
            # Converter para lista de dicionários
            resultado = []
            for produto in produtos:
                resultado.append({
                    'PRO_CODIGO': produto[0],
                    'PRO_DESCRICAO': produto[1],
                    'TOTAL': float(produto[2] or 0),
                    'ESTOQUE': float(produto[3] or 0),
                    'EST_MINIMO': float(produto[4] or 0)
                })
            
            return resultado
            
        except Exception as e:
            logging.error(f"Erro ao buscar top produtos por valor: {e}")
            return JSONResponse({'error': str(e)}), 500
        finally:
            cursor.close()
            conn.close()

    except Exception as e:
        logging.error(f"Erro ao buscar top produtos: {e}")
        return JSONResponse({'error': str(e)}), 500
