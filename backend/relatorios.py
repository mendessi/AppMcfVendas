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

class TabelaPreco(BaseModel):
    """Modelo para tabela de preço"""
    TAB_COD: int
    TAB_NOME: str

class Vendedor(BaseModel):
    """Modelo para vendedor"""
    VEN_CODIGO: int
    VEN_NOME: str

class FormaPagamento(BaseModel):
    """Modelo para forma de pagamento"""
    FPG_COD: int

# ===== FUNÇÃO HELPER GLOBAL PARA FILTRO DE VENDEDOR =====
async def obter_filtro_vendedor(request: Request, alias_tabela: str = "VENDAS") -> tuple[str, bool, str]:
    """
    Função helper global para obter filtro de vendedor automaticamente.
    
    Args:
        request: Requisição HTTP
        alias_tabela: Alias da tabela VENDAS na consulta SQL (ex: "VENDAS", "VD", "V")
    
    Returns:
        tuple: (filtro_sql, filtro_aplicado, codigo_vendedor)
    """
    try:
        # Obter o token da requisição
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return "", False, ""
        
        token = auth_header.replace("Bearer ", "")
        
        # Decodificar o token
        from auth import SECRET_KEY, ALGORITHM
        from jose import jwt
        
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            usuario_email = payload.get("sub")
            usuario_nivel = payload.get("nivel")
            
            # Se não for vendedor, não aplica filtro
            if not usuario_nivel or usuario_nivel.lower() != 'vendedor':
                log.info(f"🔄 SEM FILTRO - Usuário não é vendedor (nível: {usuario_nivel})")
                return "", False, ""
                
        except Exception as jwt_err:
            log.error(f"Erro ao decodificar token JWT: {str(jwt_err)}")
            return "", False, ""
        
        # Obter código da empresa
        empresa_codigo = request.headers.get("x-empresa-codigo")
        if not empresa_codigo:
            log.warning("🔄 SEM FILTRO - Código da empresa não fornecido")
            return "", False, ""
        
        # Buscar código do vendedor na base da empresa
        try:
            from conexao_firebird import obter_conexao_controladora, obter_conexao_cliente
            
            # Buscar dados da empresa
            conn_ctrl = obter_conexao_controladora()
            cursor_ctrl = conn_ctrl.cursor()
            
            cursor_ctrl.execute("""
                SELECT CLI_CODIGO, CLI_NOME, CLI_CAMINHO_BASE, CLI_IP_SERVIDOR, 
                       CLI_NOME_BASE, CLI_PORTA 
                FROM CLIENTES 
                WHERE CLI_CODIGO = ?
            """, (int(empresa_codigo),))
            
            empresa_dados = cursor_ctrl.fetchone()
            conn_ctrl.close()
            
            if not empresa_dados:
                log.warning(f"🔄 SEM FILTRO - Empresa {empresa_codigo} não encontrada")
                return "", False, ""
            
            # Montar dados da empresa
            empresa_dict = {
                'cli_codigo': empresa_dados[0],
                'cli_nome': empresa_dados[1],
                'cli_caminho_base': empresa_dados[2],
                'cli_ip_servidor': empresa_dados[3],
                'cli_nome_base': empresa_dados[4],
                'cli_porta': empresa_dados[5] or '3050'
            }
            
            # Conectar na base da empresa e buscar vendedor
            conn = obter_conexao_cliente(empresa_dict)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT VEN_CODIGO, VEN_NOME FROM VENDEDOR 
                WHERE VEN_EMAIL = ?
            """, (usuario_email,))
            
            vendedor = cursor.fetchone()
            conn.close()
            
            if vendedor:
                codigo_vendedor = str(vendedor[0]).strip()
                nome_vendedor = vendedor[1].strip() if vendedor[1] else ""
                filtro_sql = f" AND {alias_tabela}.VEN_CODIGO = '{codigo_vendedor}'"
                
                log.info(f"🎯 FILTRO APLICADO: Vendedor {codigo_vendedor} ({nome_vendedor}) - Alias: {alias_tabela}")
                return filtro_sql, True, codigo_vendedor
            else:
                log.warning(f"🔄 SEM FILTRO - Vendedor não encontrado para email {usuario_email}")
                return "", False, ""
                
        except Exception as e:
            log.error(f"Erro ao buscar código do vendedor: {str(e)}")
            return "", False, ""
    
    except Exception as e:
        log.error(f"Erro geral na função obter_filtro_vendedor: {str(e)}")
        return "", False, ""

@router.get("/vendas")
async def listar_vendas(request: Request):
    """
    Lista todas as vendas, com filtros opcionais por cliente, vendedor, data_inicial e data_final.
    Parâmetros query:
      - cli_codigo: filtra por cliente
      - vendedor_codigo: filtra por vendedor
      - data_inicial, data_final: período (padrão: mês atual)
      
    Se o usuário logado for VENDEDOR, aplica filtro automático pelo seu código.
    Se for ADMIN/GERENTE, pode usar vendedor_codigo=null para "todos" ou especificar um código.
    """
    from datetime import date, timedelta
    log.info(f"[VENDAS] Listando vendas. Headers: {dict(request.headers)}")
    
    try:
        # ===== OBTER FILTRO DE VENDEDOR =====
        filtro_vendedor, filtro_aplicado, codigo_vendedor = await obter_filtro_vendedor(request, "VENDAS")
        
        # ===== PARÂMETRO VENDEDOR_CODIGO DA QUERY =====
        vendedor_codigo_query = request.query_params.get('vendedor_codigo')
        
        # Se o usuário é VENDEDOR, ignora o parâmetro da query e usa o código dele
        if filtro_aplicado:
            vendedor_codigo_final = codigo_vendedor
            log.info(f"🎯 VENDAS - Usuário VENDEDOR {codigo_vendedor}: filtro automático aplicado")
        else:
            # Se é ADMIN/GERENTE, usa o parâmetro da query se fornecido
            vendedor_codigo_final = vendedor_codigo_query
            if vendedor_codigo_final:
                log.info(f"🎯 VENDAS - Usuário ADMIN/GERENTE: filtro por vendedor {vendedor_codigo_final}")
            else:
                log.info(f"🎯 VENDAS - Usuário ADMIN/GERENTE: exibindo todas as vendas")
        
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
        log.info(f"Filtro de data: {date_column} entre {data_inicial} e {data_final}. Cliente: {cli_codigo}. Vendedor: {vendedor_codigo_final}")
        
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
              VENDAS.ECF_DESCONTO,       -- Valor do Desconto
              VENDAS.VEN_CODIGO          -- Código do Vendedor
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
        
        # ===== APLICAR FILTRO DE CLIENTE =====
        if cli_codigo:
            sql += " AND VENDAS.CLI_CODIGO = ?"
            params.append(cli_codigo)
        
        # ===== APLICAR FILTRO DE VENDEDOR =====
        if vendedor_codigo_final:
            sql += " AND VENDAS.VEN_CODIGO = ?"
            params.append(vendedor_codigo_final)
            
        sql += " ORDER BY VENDAS.ECF_NUMERO DESC"
        
        cursor.execute(sql, tuple(params))
        columns = [col[0].lower() for col in cursor.description]
        vendas = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        log.info(f"🎯 VENDAS LISTADAS: {len(vendas)} resultado(s) para vendedor {vendedor_codigo_final or 'TODOS'}")
        
        return {
            "vendas": vendas,
            "filtro_vendedor_aplicado": filtro_aplicado,
            "codigo_vendedor": codigo_vendedor,
            "vendedor_selecionado": vendedor_codigo_final,
            "total_registros": len(vendas),
            "periodo": {"data_inicial": data_inicial, "data_final": data_final}
        }
        
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
    Aplica filtro por vendedor automaticamente se o usuário logado for um vendedor.
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
        
        # ===== USAR FUNÇÃO HELPER GLOBAL =====
        filtro_vendedor, filtro_aplicado, codigo_vendedor = await obter_filtro_vendedor(request, "VD")

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
            sql_vendas_dia = f"""
                SELECT COALESCE(SUM(ECF_TOTAL), 0)
                FROM VENDAS
                WHERE VENDAS.ecf_cancelada = 'N'
                AND VENDAS.ecf_concluida = 'S'
                AND CAST(VENDAS.ecf_data AS DATE) = CAST(? AS DATE)
                {filtro_vendedor}
            """
            cursor.execute(sql_vendas_dia, (data_hoje,))
            row = cursor.fetchone()
            if row and row[0] is not None:
                stats.vendas_dia = float(row[0])
            
            # Consulta para vendas do mês
            sql_vendas_mes = f"""
                SELECT COALESCE(SUM(ECF_TOTAL), 0)
                FROM VENDAS
                WHERE VENDAS.ecf_cancelada = 'N'
                AND VENDAS.ecf_concluida = 'S'
                AND CAST(VENDAS.ecf_data AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
                {filtro_vendedor}
            """
            cursor.execute(sql_vendas_mes, (data_inicial, data_final))
            row = cursor.fetchone()
            if row and row[0] is not None:
                stats.vendas_mes = float(row[0])
            
            # Consulta para vendas autenticadas e não autenticadas
            sql_vendas_auth = f"""
                SELECT 
                    COALESCE(SUM(CASE WHEN ECF_CX_DATA IS NOT NULL THEN ECF_TOTAL ELSE 0 END), 0) as VENDAS_AUTH,
                    COALESCE(SUM(CASE WHEN ECF_CX_DATA IS NULL THEN ECF_TOTAL ELSE 0 END), 0) as VENDAS_NAO_AUTH
                FROM VENDAS
                WHERE VENDAS.ecf_cancelada = 'N'
                AND VENDAS.ecf_concluida = 'S'
                AND CAST(VENDAS.ecf_data AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
                {filtro_vendedor}
            """
            cursor.execute(sql_vendas_auth, (data_inicial, data_final))
            row = cursor.fetchone()
            if row:
                stats.vendas_autenticadas = float(row[0] or 0)
                stats.vendas_nao_autenticadas = float(row[1] or 0)
            
            # Consulta para total de clientes (sem filtro de vendedor)
            sql_total_clientes = "SELECT COUNT(*) FROM CLIENTES"
            cursor.execute(sql_total_clientes)
            row = cursor.fetchone()
            if row and row[0] is not None:
                stats.total_clientes = int(row[0])
            
            # Consulta para total de produtos (sem filtro de vendedor)
            sql_total_produtos = "SELECT COUNT(*) FROM PRODUTO"
            cursor.execute(sql_total_produtos)
            row = cursor.fetchone()
            if row and row[0] is not None:
                stats.total_produtos = int(row[0])
            
            # Consulta para total de pedidos no período
            sql_total_pedidos = f"""
                SELECT COUNT(*), COALESCE(SUM(ECF_TOTAL), 0)
                FROM VENDAS
                WHERE VENDAS.ecf_cancelada = 'N'
                AND VENDAS.ecf_concluida = 'S'
                AND CAST(VENDAS.ecf_data AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
                {filtro_vendedor}
            """
            cursor.execute(sql_total_pedidos, (data_inicial, data_final))
            row = cursor.fetchone()
            if row:
                stats.total_pedidos = int(row[0] or 0)
                stats.valor_total_pedidos = float(row[1] or 0)
            
            # Log do resultado
            if filtro_aplicado:
                log.info(f"✅ ESTATÍSTICAS FILTRADAS PARA VENDEDOR {codigo_vendedor}:")
                log.info(f"   💰 Vendas do dia: R$ {stats.vendas_dia:.2f}")
                log.info(f"   💰 Vendas do mês: R$ {stats.vendas_mes:.2f}")
                log.info(f"   📦 Total de pedidos: {stats.total_pedidos}")
            else:
                log.info(f"📊 ESTATÍSTICAS GERAIS (sem filtro):")
                log.info(f"   💰 Vendas do mês: R$ {stats.vendas_mes:.2f}")
            
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
    Se o usuário logado for um vendedor, retorna apenas os dados dele.
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
            
        # ===== APLICAR FILTRO DE VENDEDOR =====
        filtro_vendedor, filtro_aplicado, codigo_vendedor = await obter_filtro_vendedor(request, "VD")
            
        # Obter a conexão com o banco da empresa selecionada
        empresa = get_empresa_atual(request)
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
            
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        try:
            # Consulta para top vendedores COM FILTRO
            sql = f"""
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
                {filtro_vendedor}
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
            
            # Log para debug
            if filtro_aplicado:
                log.info(f"🎯 TOP VENDEDORES FILTRADO: Vendedor {codigo_vendedor} - {len(top_vendedores)} resultado(s)")
            else:
                log.info(f"📊 TOP VENDEDORES GERAL: {len(top_vendedores)} vendedores encontrados")
            
            return TopVendedoresResponse(
                data_inicial=data_inicial,
                data_final=data_final,
                top_vendedores=top_vendedores,
                filtro_vendedor_aplicado=filtro_aplicado
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
    Se o usuário logado for um vendedor, filtra apenas os clientes dele.
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
            
        # ===== APLICAR FILTRO DE VENDEDOR =====
        filtro_vendedor, filtro_aplicado, codigo_vendedor = await obter_filtro_vendedor(request, "V")
        
        # Log detalhado do filtro
        log.info(f"🔍 TOP CLIENTES - Debug do filtro:")
        log.info(f"   📄 Filtro SQL: '{filtro_vendedor}'")
        log.info(f"   ✅ Filtro aplicado: {filtro_aplicado}")
        log.info(f"   🔢 Código vendedor: '{codigo_vendedor}'")
            
        # Obter a conexão com o banco da empresa selecionada
        empresa = get_empresa_atual(request)
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
            
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        try:
            # Consulta para top clientes COM FILTRO DE VENDEDOR
            sql = f"""
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
                {filtro_vendedor}
                GROUP BY C.CLI_NOME, C.CLI_CODIGO, C.CIDADE, C.UF
                ORDER BY TOTAL DESC
            """
            
            # Log da SQL final que será executada
            log.info(f"🔍 TOP CLIENTES - SQL Final:")
            log.info(f"   Query: {sql}")
            log.info(f"   Parâmetros: data_inicial='{data_inicial}', data_final='{data_final}'")
            
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
            
            # Log para debug
            if filtro_aplicado:
                log.info(f"🎯 TOP CLIENTES FILTRADO: Vendedor {codigo_vendedor} - {len(top_clientes)} cliente(s)")
            else:
                log.info(f"📊 TOP CLIENTES GERAL: {len(top_clientes)} clientes encontrados")
            
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
    Aplica filtro por vendedor automaticamente se o usuário logado for um vendedor.
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
            
        # ===== USAR FUNÇÃO HELPER GLOBAL =====
        filtro_vendedor, filtro_aplicado, codigo_vendedor = await obter_filtro_vendedor(request, "VENDAS")
            
        # Obter a conexão com o banco da empresa selecionada
        empresa = get_empresa_atual(request)
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
            
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        try:
            # Consulta para vendas por dia COM FILTRO DE VENDEDOR
            sql = f"""
                SELECT 
                    CAST(ECF_DATA AS DATE) as DATA,
                    COUNT(*) as QUANTIDADE,
                    COALESCE(SUM(ECF_TOTAL), 0) as TOTAL
                FROM VENDAS
                WHERE ECF_CANCELADA = 'N'
                AND ECF_CONCLUIDA = 'S'
                AND CAST(ECF_DATA AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
                {filtro_vendedor}
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
            
            # Log do resultado
            if filtro_aplicado:
                log.info(f"✅ VENDAS POR DIA FILTRADAS PARA VENDEDOR {codigo_vendedor}: {len(vendas_por_dia)} registros")
            else:
                log.info(f"📊 VENDAS POR DIA GERAIS (sem filtro): {len(vendas_por_dia)} registros")
            
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
            # Consulta para itens da venda com dados do produto
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
                ORDER BY I.PRO_CODIGO
            """
            
            log.info(f"[ITENS_VENDA] Executando consulta SQL: {sql}")
            log.info(f"[ITENS_VENDA] Parâmetro ECF_NUMERO: {ecf_numero}")
            
            try:
                cursor.execute(sql, (ecf_numero,))
                rows = cursor.fetchall()
                log.info(f"[ITENS_VENDA] Encontrados {len(rows)} itens")
            except Exception as sql_error:
                log.error(f"[ITENS_VENDA] Erro na execução da query SQL: {str(sql_error)}")
                raise HTTPException(status_code=500, detail=f"Erro na consulta SQL: {str(sql_error)}")
            
            if not rows:
                log.info(f"[ITENS_VENDA] Nenhum item encontrado para venda {ecf_numero}")
                return []
            
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
    try:
        # Obter conexão com o banco da empresa
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        # Buscar tabelas de preço
        cursor.execute("SELECT TAB_COD, TAB_NOME FROM TABPRECO ORDER BY TAB_COD")
        tabelas = [
            {"codigo": row[0], "nome": row[1]} for row in cursor.fetchall()
        ]
        cursor.close()
        conn.close()
        return JSONResponse(content=tabelas)
    except Exception as e:
        return JSONResponse(content=[], status_code=200)

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
    Endpoint para listar todos os vendedores ATIVOS.
    Retorna apenas vendedores onde ven_ativo = 0 (ativo)
    """
    try:
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        # Verificar se a coluna ven_ativo existe
        cursor.execute("SELECT FIRST 1 * FROM VENDEDOR")
        colunas = [col[0].lower() for col in cursor.description]
        tem_ven_ativo = "ven_ativo" in colunas
        
        if tem_ven_ativo:
            sql = """
                SELECT 
                    VEN_CODIGO,
                    VEN_NOME
                FROM VENDEDOR
                WHERE VEN_ATIVO = 0
                ORDER BY VEN_NOME
            """
            log.info("🎯 VENDEDORES - Buscando apenas vendedores ATIVOS (ven_ativo = 0)")
        else:
            sql = """
                SELECT 
                    VEN_CODIGO,
                    VEN_NOME
                FROM VENDEDOR
                ORDER BY VEN_NOME
            """
            log.info("⚠️ VENDEDORES - Campo ven_ativo não existe, buscando todos")
        
        cursor.execute(sql)
        rows = cursor.fetchall()
        
        vendedores = []
        for row in rows:
            vendedor = {
                "VEN_CODIGO": row[0],
                "VEN_NOME": row[1] or ""
            }
            vendedores.append(vendedor)
        
        log.info(f"🎯 VENDEDORES ENCONTRADOS: {len(vendedores)} vendedor(es) ativo(s)")
        
        # Log dos primeiros vendedores para debug
        for i, v in enumerate(vendedores[:3]):
            log.info(f"   {i+1}. {v['VEN_CODIGO']} - {v['VEN_NOME']}")
            
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
                    "PRO_MARCA": row[5] if row[5] is not None else "",
                    "UNI_CODIGO": row[6] if row[6] is not None else "",
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
    """
    Endpoint para obter os top produtos com maior volume de vendas no período.
    Se o usuário logado for um vendedor, filtra apenas os produtos vendidos por ele.
    """
    log.info(f"Recebendo requisição para top-produtos com data_inicial={data_inicial} e data_final={data_final}")
    
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
            
        # ===== APLICAR FILTRO DE VENDEDOR =====
        filtro_vendedor, filtro_aplicado, codigo_vendedor = await obter_filtro_vendedor(request, "VENDAS")

        # Obter a conexão com o banco da empresa selecionada
        empresa = get_empresa_atual(request)
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")

        conn = await get_empresa_connection(request)
        cursor = conn.cursor()

        try:
            # Consulta para top produtos COM FILTRO DE VENDEDOR
            sql = f"""
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
                WHERE CAST(VENDAS.ECF_DATA AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
                {filtro_vendedor}
                GROUP BY PRODUTO.PRO_CODIGO, PRODUTO.PRO_DESCRICAO, PRODUTO.PRO_QUANTIDADE, PRODUTO.PRO_MINIMA
                ORDER BY TOTAL DESC
            """
            
            cursor.execute(sql, (data_inicial, data_final))
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
            
            # Log para debug
            if filtro_aplicado:
                log.info(f"🎯 TOP PRODUTOS FILTRADO: Vendedor {codigo_vendedor} - {len(resultado)} produto(s)")
            else:
                log.info(f"📊 TOP PRODUTOS GERAL: {len(resultado)} produtos encontrados")
            
            return resultado
            
        except Exception as e:
            log.error(f"Erro ao buscar top produtos: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erro ao buscar top produtos: {str(e)}")
        finally:
            try:
                conn.close()
            except:
                pass
            
    except Exception as e:
        log.error(f"Erro geral ao buscar top produtos: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro geral: {str(e)}")

@router.get("/tabelas-preco")
async def get_tabelas_preco(request: Request, search: str = "", empresa: str = None):
    """Endpoint para listar tabelas de preço"""
    try:
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        cursor.execute("SELECT TAB_COD, TAB_NOME FROM TABPRECO ORDER BY TAB_COD")
        tabelas = [
            {"codigo": row[0], "nome": row[1]} for row in cursor.fetchall()
        ]
        cursor.close()
        conn.close()
        return JSONResponse(content=tabelas)
    except Exception as e:
        return JSONResponse(content=[], status_code=200)

@router.get("/vendedores-ativos")
async def get_vendedores_ativos(request: Request, search: str = "", empresa: str = None):
    """Endpoint para listar vendedores ativos"""
    try:
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        cursor.execute("SELECT VEN_CODIGO, VEN_NOME FROM VENDEDOR WHERE VEN_ATIVO = 'S' ORDER BY VEN_NOME")
        vendedores = [
            {"codigo": row[0], "nome": row[1]} for row in cursor.fetchall()
        ]
        cursor.close()
        conn.close()
        return JSONResponse(content=vendedores)
    except Exception as e:
        return JSONResponse(content=[], status_code=200)

@router.get("/formas-pagamento")
async def get_formas_pagamento(request: Request, search: str = "", empresa: str = None):
    """Endpoint para listar formas de pagamento"""
    try:
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        cursor.execute("SELECT FPG_COD, FPG_NOME FROM FORMAPAG ORDER BY FPG_NOME")
        formas = [
            {"codigo": row[0], "nome": row[1]} for row in cursor.fetchall()
        ]
        cursor.close()
        conn.close()
        return JSONResponse(content=formas)
    except Exception as e:
        return JSONResponse(content=[], status_code=200)
