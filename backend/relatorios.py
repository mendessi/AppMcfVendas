from fastapi import APIRouter, Depends, HTTPException, status, Request
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

class TopCliente(BaseModel):
    codigo: int
    nome: str
    cidade: Optional[str] = None
    uf: Optional[str] = None
    whatsapp: Optional[str] = None
    qtde_compras: int
    total: float
    ecf_data: Optional[str] = None
    ven_nome: Optional[str] = None
    ecf_cx_data: Optional[str] = None

class TopClientesResponse(BaseModel):
    data_inicial: str
    data_final: str
    top_clientes: List[TopCliente]

@router.get("/top-clientes")
async def get_top_clientes(request: Request, data_inicial: Optional[str] = None, data_final: Optional[str] = None):
    """
    Endpoint para obter os top 10 clientes com maior volume de compras no período.
    Se data_inicial e data_final não forem fornecidos, usa o mês atual.
    """
    log.info(f"Recebendo requisição para top-clientes com data_inicial={data_inicial} e data_final={data_final}")
    log.info(f"Cabeçalhos da requisição: {dict(request.headers)}")
    try:
        # Definir datas padrão se não fornecidas (primeiro e último dia do mês atual)
        hoje = date.today()
        log.info(f"Data atual: {hoje.isoformat()}")
        
        try:
            if not data_inicial:
                data_inicial = date(hoje.year, hoje.month, 1).isoformat()
            else:
                # Tentar validar o formato da data
                datetime.fromisoformat(data_inicial)
                
            if not data_final:
                # Último dia do mês
                if hoje.month == 12:
                    proximo_mes = date(hoje.year + 1, 1, 1)
                else:
                    proximo_mes = date(hoje.year, hoje.month + 1, 1)
                ultimo_dia = (proximo_mes - timedelta(days=1)).isoformat()
                data_final = ultimo_dia
            else:
                # Tentar validar o formato da data
                datetime.fromisoformat(data_final)
                
            log.info(f"Período de consulta: {data_inicial} a {data_final}")
        except ValueError as e:
            log.error(f"Erro de formato de data: {str(e)}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                               detail=f"Formato de data inválido. Use o formato ISO (YYYY-MM-DD): {str(e)}")

        log.info(f"Buscando top clientes entre {data_inicial} e {data_final}")
        
        # Verificar autorização no cabeçalho
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            log.warning("Token de autenticação não fornecido")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de autenticação não fornecido")
            
        # Aqui não precisamos verificar manualmente o cabeçalho da empresa
        # Nossa função get_empresa_atual já implementa a abordagem híbrida:
        # 1. Primeiro verifica o cabeçalho x-empresa-codigo
        # 2. Se não encontrar, busca na sessão
        log.info("Buscando empresa atual usando abordagem híbrida (cabeçalho -> sessão)...")
        
        # Apenas para fins de log, vamos verificar se o cabeçalho existe
        empresa_codigo = request.headers.get("x-empresa-codigo")
        if empresa_codigo:
            log.info(f"Cabeçalho x-empresa-codigo presente: {empresa_codigo}")
        else:
            log.info("Cabeçalho x-empresa-codigo não encontrado, recorrendo à sessão")

        # Extrair informações do usuário do token JWT
        usuario_nivel = None
        codigo_vendedor = None
        
        try:
            # Obter o token da requisição
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.replace("Bearer ", "")
                # Decodificar o token
                from auth import SECRET_KEY, ALGORITHM
                from jose import jwt
                
                try:
                    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                    usuario_nivel = payload.get("nivel")
                    
                    # NOVO: Agora buscamos o código do vendedor diretamente do token JWT
                    # O código é armazenado na tabela usuarios_app junto com o nível
                    codigo_vendedor = payload.get("codigo_vendedor")
                    
                    log.info(f"Usuário com nível: {usuario_nivel}, código vendedor do JWT: {codigo_vendedor}")
                except Exception as jwt_err:
                    log.error(f"Erro ao decodificar token JWT: {str(jwt_err)}")
        except Exception as auth_err:
            log.error(f"Erro ao processar informações de autenticação: {str(auth_err)}")
        
        # Obter dados da empresa atual apenas para referência (não precisamos mais do código de vendedor dela)
        from empresa_manager import get_empresa_atual
        empresa_atual = get_empresa_atual(request)
        
        # Logar todos os dados da empresa para depuração
        log.info(f"DADOS COMPLETOS DA EMPRESA: {empresa_atual}")
        
        # Verificar se temos código de vendedor quando o usuário é vendedor
        if usuario_nivel and usuario_nivel.lower() == 'vendedor':
            if codigo_vendedor:
                log.info(f"Código de vendedor obtido do token JWT: {codigo_vendedor}")
            else:
                log.warning(f"Usuário com nível VENDEDOR, mas código de vendedor não foi encontrado no token JWT! Detalhes: Nivel={usuario_nivel}, Empresa={empresa_atual.get('cli_nome')}, Código Empresa={empresa_atual.get('cli_codigo')}")

        try:
            # Obter informações da empresa atual
            log.info("Chamando get_empresa_atual...")
            empresa = get_empresa_atual(request)
            
            # Verificar se a empresa é a empresa vazia (caso em que nenhuma empresa foi selecionada)
            if empresa.get('empresa_nao_selecionada', False) or not empresa or empresa.get('cli_codigo', 0) == 0:
                log.warning("Nenhuma empresa real selecionada")
                return {
                    "sucesso": False,
                    "mensagem": "Selecione uma empresa primeiro antes de usar esta funcionalidade",
                    "data_inicial": data_inicial,
                    "data_final": data_final,
                    "top_clientes": []
                }
                
            log.info(f"Empresa encontrada: {empresa['cli_nome']} (ID: {empresa['cli_codigo']})")
            log.info(f"Detalhes de conexão: IP={empresa['cli_ip_servidor']}, Porta={empresa.get('cli_porta', '3050')}, Base={empresa.get('cli_nome_base', '')}")
            
            # Se o endereço IP não está definido ou é vazio, não podemos conectar
            if not empresa.get('cli_ip_servidor'):
                log.warning("Endereço IP da empresa não está definido")
                return {
                    "sucesso": False,
                    "mensagem": "Configuração incompleta da empresa. Endereço IP ausente.",
                    "data_inicial": data_inicial,
                    "data_final": data_final,
                    "top_clientes": []
                }
            
            # Agora obter a conexão
            log.info("Chamando get_empresa_connection...")
            try:
                conn = await get_empresa_connection(request)
                if not conn:
                    log.error("Não foi possível obter uma conexão válida para a empresa")
                    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
                                       detail="Falha ao conectar ao banco de dados. Verifique se o servidor está acessível e se as credenciais estão corretas.")
            except Exception as conn_err:
                log.error(f"Erro ao obter conexão: {str(conn_err)}")
                raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
                                  detail=f"Erro na conexão: {str(conn_err)}")
                
            cur = conn.cursor()
            log.info("Conexão com o banco de dados estabelecida com sucesso")
        except HTTPException as he:
            # Re-lançar HTTPExceptions para evitar que sejam convertidas em dados de exemplo
            raise
        except Exception as e:
            log.error(f"Erro ao conectar ao banco de dados: {str(e)}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro ao conectar: {str(e)}")

        # Primeiro verificar se as tabelas existem
        log.info("Verificando se as tabelas necessárias existem no banco de dados...")
        try:
            # Verificar se a tabela VENDAS existe
            log.info("Verificando tabela VENDAS...")
            cur.execute("""SELECT FIRST 1 1 FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = 'VENDAS'""")
            tabela_vendas_existe = cur.fetchone() is not None
            log.info(f"Tabela VENDAS existe: {tabela_vendas_existe}")
            
            # Verificar se a tabela CLIENTES existe
            log.info("Verificando tabela CLIENTES...")
            cur.execute("""SELECT FIRST 1 1 FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = 'CLIENTES'""")
            tabela_clientes_existe = cur.fetchone() is not None
            log.info(f"Tabela CLIENTES existe: {tabela_clientes_existe}")
            
            # Verificar se a tabela VENDEDOR existe
            log.info("Verificando tabela VENDEDOR...")
            cur.execute("""SELECT FIRST 1 1 FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = 'VENDEDOR'""")
            tabela_vendedor_existe = cur.fetchone() is not None
            log.info(f"Tabela VENDEDOR existe: {tabela_vendedor_existe}")
            
            if not tabela_vendas_existe or not tabela_clientes_existe:
                log.warning("As tabelas necessárias não existem no banco de dados")
                return {
                    "sucesso": False,
                    "mensagem": "As tabelas necessárias (VENDAS, CLIENTES) não existem no banco de dados da empresa selecionada.",
                    "data_inicial": data_inicial,
                    "data_final": data_final,
                    "estrutura_bd": {
                        "tabela_vendas": tabela_vendas_existe,
                        "tabela_clientes": tabela_clientes_existe,
                        "tabela_vendedor": tabela_vendedor_existe
                    },
                    "top_clientes": []
                }
            
            # Verificar os campos da tabela VENDAS
            log.info("Verificando campos da tabela VENDAS...")
            cur.execute("""SELECT FIRST 1 * FROM VENDAS""")
            colunas_vendas = [col[0].lower() for col in cur.description]
            log.info(f"Colunas da tabela VENDAS: {colunas_vendas}")
            
            # Verificar os campos da tabela CLIENTES
            log.info("Verificando campos da tabela CLIENTES...")
            cur.execute("""SELECT FIRST 1 * FROM CLIENTES""")
            colunas_clientes = [col[0].lower() for col in cur.description]
            log.info(f"Colunas da tabela CLIENTES: {colunas_clientes}")
            
            # Log das datas para debug
            log.info(f"Data inicial recebida: {data_inicial}, tipo: {type(data_inicial)}")
            log.info(f"Data final recebida: {data_final}, tipo: {type(data_final)}")
            
            # Definir uma consulta SQL adequada com base nas tabelas e campos existentes
            log.info("Executando consulta principal de top clientes...")
            
            # Verificar se precisa filtrar por vendedor
            filtro_vendedor = False
            parametros = [data_inicial, data_final]
            
            # Logs detalhados para depuração do filtro de vendedor
            log.info(f"DEPURANDO FILTRO: Nivel={usuario_nivel}, tipo={type(usuario_nivel)}")
            log.info(f"DEPURANDO FILTRO: Codigo Vendedor={codigo_vendedor}, tipo={type(codigo_vendedor)}")
            
            # CORREÇÃO: Verificar diretamente se o nível é 'VENDEDOR' (como na tabela)
            eh_vendedor = False
            if usuario_nivel:
                # Verificar tanto maiúsculo quanto minúsculo
                eh_vendedor = (usuario_nivel == 'VENDEDOR' or usuario_nivel.lower() == 'vendedor')
                log.info(f"DEPURANDO FILTRO: Nivel={usuario_nivel}, Comparando com 'VENDEDOR' = {usuario_nivel == 'VENDEDOR'}")
            log.info(f"DEPURANDO FILTRO: É vendedor? {eh_vendedor}")
            
            tem_codigo = codigo_vendedor is not None and codigo_vendedor != ''
            log.info(f"DEPURANDO FILTRO: Tem código? {tem_codigo}")
            
            if eh_vendedor and tem_codigo:
                filtro_vendedor = True
                # Certificar que o código seja tratado como número
                # Alguns bancos Firebird são sensíveis a tipo
                codigo_vendedor_num = int(codigo_vendedor) if str(codigo_vendedor).isdigit() else codigo_vendedor
                log.info(f"APLICANDO FILTRO POR VENDEDOR: {codigo_vendedor_num} (tipo: {type(codigo_vendedor_num)})")
                parametros.append(codigo_vendedor_num)
            
            # Consulta com CAST para garantir compatibilidade com Firebird
            consulta_sql = """
            SELECT FIRST 10
                VENDAS.CLI_CODIGO,
                VENDAS.NOME,
                CLIENTES.CIDADE,
                CLIENTES.UF,
                CLIENTES.TEL_WHATSAPP,
                COUNT(VENDAS.ECF_NUMERO) AS QTDE_COMPRAS,
                SUM(VENDAS.ECF_TOTAL) AS TOTAL_COMPRAS,
                MAX(VENDAS.ECF_DATA) AS ECF_DATA,
                MAX(VENDEDOR.VEN_NOME) AS VEN_NOME,
                MAX(VENDAS.ECF_CX_DATA) AS ECF_CX_DATA
            FROM VENDAS
            INNER JOIN CLIENTES ON VENDAS.CLI_CODIGO = CLIENTES.CLI_CODIGO
            LEFT JOIN VENDEDOR ON VENDAS.VEN_CODIGO = VENDEDOR.VEN_CODIGO
            WHERE VENDAS.ecf_cancelada = 'N'
              AND VENDAS.ecf_concluida = 'S'
              AND VENDAS.ECF_DATA BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
            """ 
            
            # Adicionar filtro por vendedor se necessário
            if filtro_vendedor:
                log.info("===== CONFIRMADO: ADICIONANDO FILTRO DE VENDEDOR NA CONSULTA SQL =====")
                log.info(f"TIPO DO CÓDIGO DE VENDEDOR NA CONSULTA: {type(codigo_vendedor_num)}")
                # Certifique-se de que a coluna na tabela coincide exatamente com este nome
                consulta_sql += "AND VENDAS.VEN_CODIGO = ? "
            else:
                log.warning("===== ALERTA: FILTRO DE VENDEDOR NÃO ESTÁ SENDO APLICADO! =====")
                log.warning(f"Detalhes: Nivel={usuario_nivel}, Eh_vendedor={eh_vendedor}, Tem_codigo={tem_codigo}, Codigo={codigo_vendedor}")
                
            # Finalizar a consulta
            consulta_sql += """
            GROUP BY VENDAS.CLI_CODIGO, VENDAS.NOME, CLIENTES.CIDADE, CLIENTES.UF, CLIENTES.TEL_WHATSAPP
            ORDER BY TOTAL_COMPRAS DESC
            """
            
            log.info(f"Executando consulta: {consulta_sql}")
            log.info(f"Parâmetros: {parametros}")
            
            cur.execute(consulta_sql, tuple(parametros))
            log.info("Consulta executada com sucesso")
            rows = cur.fetchall()
            
            # Processar resultados
            log.info(f"Consulta retornou {len(rows)} registros")
            
            if len(rows) == 0:
                # Se não encontrou clientes, fazer uma consulta mais simples para debug
                log.warning("Nenhum cliente encontrado com a consulta principal. Executando consulta mais simples para debug...")
                try:
                    # Consulta mais simples para verificar se há vendas no período
                    cur.execute(
                        "SELECT COUNT(*) FROM VENDAS WHERE ECF_DATA BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)",
                        (data_inicial, data_final,)
                    )
                    total_vendas = cur.fetchone()[0]
                    log.info(f"Total de vendas no período: {total_vendas}")
                    
                    if total_vendas > 0:
                        # Há vendas, mas a consulta principal não retornou resultados
                        # Pode ser um problema com os JOINs ou a condição WHERE
                        return {
                            "sucesso": False,
                            "mensagem": f"Há {total_vendas} vendas no período selecionado, mas a consulta principal não retornou resultados. Pode haver um problema com a estrutura do banco.",
                            "data_inicial": data_inicial,
                            "data_final": data_final,
                            "top_clientes": []
                        }
                except Exception as debug_err:
                    log.error(f"Erro na consulta de debug: {str(debug_err)}")
            
            # Processar os resultados normalmente
            top_clientes = []
            for row in rows:
                try:
                    # Usar valores padrão para os campos que são obrigatórios mas podem vir como None
                    top_cliente = TopCliente(
                        codigo=row[0] if row[0] is not None else 0,
                        nome=row[1] if row[1] is not None else "Nome não informado",
                        cidade=row[2],
                        uf=row[3],
                        whatsapp=row[4],
                        qtde_compras=int(row[5] or 0),
                        total=float(row[6] or 0),
                        ecf_data=row[7].isoformat() if row[7] else None,
                        ven_nome=row[8] if row[8] is not None else None,
                        ecf_cx_data=row[9].isoformat() if row[9] else None
                    )
                    top_clientes.append(top_cliente)
                    log.info(f"Cliente processado: {top_cliente.nome}")
                except Exception as row_err:
                    log.error(f"Erro ao processar linha: {row}: {str(row_err)}")
                    # Mostrar quais campos estão com problemas
                    for i, col in enumerate(row):
                        log.error(f"  Campo {i}: {col}, tipo: {type(col)}")
                    # Não adiciona este cliente à lista
            
            log.info(f"Processados {len(top_clientes)} clientes com sucesso")
            
            conn.close()
            
            # Criar vendedor_info para a resposta
            vendedor_info = {}
            if usuario_nivel and usuario_nivel.lower() == 'vendedor':
                if codigo_vendedor:
                    vendedor_info['codigo'] = codigo_vendedor
                    vendedor_info['nome'] = f"Vendedor {codigo_vendedor}"
                    log.info(f"Adicionando info de vendedor na resposta: {vendedor_info}")
            
            # Converter para dict para adicionar informações extras
            resposta = {
                "data_inicial": data_inicial,
                "data_final": data_final,
                "top_clientes": top_clientes,
                "filtro_aplicado": {
                    "nivel_usuario": usuario_nivel,
                    "vendedor": vendedor_info,
                    "filtro_vendedor_ativo": usuario_nivel and usuario_nivel.lower() == 'vendedor' and codigo_vendedor is not None
                }
            }
            
            log.info(f"Resposta completa (resumida): {resposta['filtro_aplicado']}")
            return resposta
        except Exception as e:
            log.error(f"Erro na execução da consulta SQL: {str(e)}")
            # Fechar a conexão em caso de erro
            try:
                conn.close()
            except:
                pass
                
            # Mensagem de erro mais amigável e detalhada baseada no tipo de erro
            erro_msg = str(e)
            if "relation" in erro_msg.lower() and "not found" in erro_msg.lower():
                # Erro de tabela não encontrada
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                   detail=f"Tabela não encontrada: {erro_msg}")
            elif "syntax error" in erro_msg.lower():
                # Erro de sintaxe SQL
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                                   detail=f"Erro de sintaxe SQL: {erro_msg}")
            else:
                # Outros erros de SQL
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                                   detail=f"Erro na consulta SQL: {erro_msg}")
        
    except HTTPException as he:
        # Re-lançar HTTPExceptions para manter o código de status correto
        raise
    except Exception as e:
        log.error(f"Erro ao buscar top clientes: {str(e)}")
        # Retornar erro em vez de dados de exemplo
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro geral: {str(e)}")


def usar_dados_exemplo(data_inicial, data_final):
    """
    Retorna uma lista vazia para evitar o uso de dados falsos.
    Esta função não deve mais retornar dados de exemplo falsos conforme solicitado.
    """
    log.warning("ATENÇÃO: A função de dados de exemplo foi chamada. Retornando lista vazia conforme solicitado.")
    
    # Retornar lista vazia em vez de dados falsos
    return TopClientesResponse(
        data_inicial=data_inicial,
        data_final=data_final,
        top_clientes=[]
    )


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


@router.get("/top-vendedores")
async def get_top_vendedores(request: Request, data_inicial: Optional[str] = None, data_final: Optional[str] = None):
    """
    Endpoint para obter os top 20 vendedores com maior volume de vendas no período.
    Se data_inicial e data_final não forem fornecidos, usa o mês atual.
    Para usuários com nível 'VENDEDOR', filtra apenas as vendas deste vendedor.
    """
    log.info(f"Recebendo requisição para top-vendedores com data_inicial={data_inicial} e data_final={data_final}")
    log.info(f"Cabeçalhos da requisição: {dict(request.headers)}")
    
    try:
        # Definir datas padrão se não fornecidas (primeiro e último dia do mês atual)
        hoje = date.today()
        log.info(f"Data atual: {hoje.isoformat()}")
        
        try:
            if not data_inicial:
                data_inicial = date(hoje.year, hoje.month, 1).isoformat()
            else:
                # Tentar validar o formato da data
                datetime.fromisoformat(data_inicial)
                
            if not data_final:
                # Último dia do mês
                if hoje.month == 12:
                    proximo_mes = date(hoje.year + 1, 1, 1)
                else:
                    proximo_mes = date(hoje.year, hoje.month + 1, 1)
                ultimo_dia = (proximo_mes - timedelta(days=1)).isoformat()
                data_final = ultimo_dia
            else:
                # Tentar validar o formato da data
                datetime.fromisoformat(data_final)
                
            log.info(f"Período de consulta: {data_inicial} a {data_final}")
        except ValueError as e:
            log.error(f"Erro de formato de data: {str(e)}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                               detail=f"Formato de data inválido. Use o formato ISO (YYYY-MM-DD): {str(e)}")

        # Verificar autorização no cabeçalho
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            log.warning("Token de autenticação não fornecido")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de autenticação não fornecido")

        # Extrair informações do usuário do token JWT
        usuario_nivel = None
        codigo_vendedor = None
        
        try:
            # Obter o token da requisição
            token = authorization.replace("Bearer ", "")
            # Decodificar o token
            from auth import SECRET_KEY, ALGORITHM
            from jose import jwt
            
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                usuario_nivel = payload.get("nivel")
                # Obter o código do vendedor do token JWT
                codigo_vendedor = payload.get("codigo_vendedor")
                log.info(f"Usuário com nível: {usuario_nivel}, código vendedor: {codigo_vendedor}")
            except Exception as jwt_err:
                log.error(f"Erro ao decodificar token JWT: {str(jwt_err)}")
        except Exception as auth_err:
            log.error(f"Erro ao processar informações de autenticação: {str(auth_err)}")
        
        # Obter dados da empresa atual
        empresa = get_empresa_atual(request)
        
        # Verificar se a empresa é a empresa vazia
        if empresa.get('empresa_nao_selecionada', False) or not empresa or empresa.get('cli_codigo', 0) == 0:
            log.warning("Nenhuma empresa real selecionada")
            return {
                "sucesso": False,
                "mensagem": "Selecione uma empresa primeiro antes de usar esta funcionalidade",
                "data_inicial": data_inicial,
                "data_final": data_final,
                "top_vendedores": [],
                "filtro_vendedor_aplicado": False
            }
        
        # Obter a conexão com o banco de dados
        try:
            conn = await get_empresa_connection(request)
            if not conn:
                log.error("Não foi possível obter uma conexão válida para a empresa")
                raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
                                  detail="Falha ao conectar ao banco de dados. Verifique se o servidor está acessível e se as credenciais estão corretas.")
        except Exception as conn_err:
            log.error(f"Erro ao obter conexão: {str(conn_err)}")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
                              detail=f"Erro na conexão: {str(conn_err)}")
        
        cur = conn.cursor()
        log.info("Conexão com o banco de dados estabelecida com sucesso")
        
        # Verificar se as tabelas necessárias existem
        log.info("Verificando se as tabelas necessárias existem no banco de dados...")
        try:
            # Verificar se a tabela VENDAS existe
            log.info("Verificando tabela VENDAS...")
            cur.execute("""SELECT FIRST 1 1 FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = 'VENDAS'""")
            tabela_vendas_existe = cur.fetchone() is not None
            log.info(f"Tabela VENDAS existe: {tabela_vendas_existe}")
            
            # Verificar se a tabela ITVENDA existe
            log.info("Verificando tabela ITVENDA...")
            cur.execute("""SELECT FIRST 1 1 FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = 'ITVENDA'""")
            tabela_itvenda_existe = cur.fetchone() is not None
            log.info(f"Tabela ITVENDA existe: {tabela_itvenda_existe}")
            
            # Verificar se a tabela VENDEDOR existe
            log.info("Verificando tabela VENDEDOR...")
            cur.execute("""SELECT FIRST 1 1 FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = 'VENDEDOR'""")
            tabela_vendedor_existe = cur.fetchone() is not None
            log.info(f"Tabela VENDEDOR existe: {tabela_vendedor_existe}")
            
            if not tabela_vendas_existe or not tabela_itvenda_existe or not tabela_vendedor_existe:
                log.warning("As tabelas necessárias não existem no banco de dados")
                return {
                    "sucesso": False,
                    "mensagem": "As tabelas necessárias (VENDAS, ITVENDA, VENDEDOR) não existem no banco de dados da empresa selecionada.",
                    "data_inicial": data_inicial,
                    "data_final": data_final,
                    "estrutura_bd": {
                        "tabela_vendas": tabela_vendas_existe,
                        "tabela_itvenda": tabela_itvenda_existe,
                        "tabela_vendedor": tabela_vendedor_existe
                    },
                    "top_vendedores": [],
                    "filtro_vendedor_aplicado": False
                }
            
            # Verificar os campos da tabela VENDAS
            log.info("Verificando campos da tabela VENDAS...")
            cur.execute("""SELECT FIRST 1 * FROM VENDAS""")
            colunas_vendas = [col[0].lower() for col in cur.description]
            log.info(f"Colunas da tabela VENDAS: {colunas_vendas}")
            
            # Determinar o nome da coluna de data
            date_column = "ecf_data"  # coluna padrão
            if "ecf_data" in colunas_vendas:
                date_column = "ecf_data"
            elif "ecf_cx_data" in colunas_vendas:
                date_column = "ecf_cx_data"
                
            # Definir o nome da tabela de vendas
            tabela_vendas = "VENDAS"
            
            # Verificar se precisa filtrar por vendedor
            filtro_vendedor = False
            parametros = [data_inicial, data_final]
            
            # Logs detalhados para depuração do filtro de vendedor
            log.info(f"DEPURANDO FILTRO: Nivel={usuario_nivel}, tipo={type(usuario_nivel)}")
            log.info(f"DEPURANDO FILTRO: Codigo Vendedor={codigo_vendedor}, tipo={type(codigo_vendedor)}")
            
            # Verificar se o usuário é vendedor e tem código
            eh_vendedor = False
            if usuario_nivel:
                # Verificar tanto maiúsculo quanto minúsculo
                eh_vendedor = (usuario_nivel.upper() == 'VENDEDOR')
                log.info(f"DEPURANDO FILTRO: É vendedor? {eh_vendedor}")
            
            tem_codigo = codigo_vendedor is not None and codigo_vendedor != ''
            log.info(f"DEPURANDO FILTRO: Tem código? {tem_codigo}")
            
            if eh_vendedor and tem_codigo:
                filtro_vendedor = True
                # Certificar que o código seja tratado como número se for numérico
                codigo_vendedor_num = int(codigo_vendedor) if str(codigo_vendedor).isdigit() else codigo_vendedor
                log.info(f"APLICANDO FILTRO POR VENDEDOR: {codigo_vendedor_num} (tipo: {type(codigo_vendedor_num)})")
                parametros.append(codigo_vendedor_num)
            
            # Consulta SQL base
            consulta_sql = f"""
            SELECT FIRST 20 
                VENDEDOR.VEN_NOME, 
                VENDEDOR.VEN_CODIGO,
                COUNT(DISTINCT {tabela_vendas}.ECF_NUMERO) AS QTD_VENDAS,
                SUM({tabela_vendas}.ECF_TOTAL) AS TOTAL, 
                COALESCE(VENDEDOR.VEN_META, 50000.00) AS VEN_META
            FROM {tabela_vendas}
            JOIN VENDEDOR ON VENDEDOR.VEN_CODIGO = {tabela_vendas}.VEN_CODIGO
            WHERE {tabela_vendas}.{date_column} BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
              AND {tabela_vendas}.ECF_CANCELADA = 'N'
              AND {tabela_vendas}.ECF_CONCLUIDA = 'S'
            """
            
            # Adicionar filtro por vendedor se necessário
            if filtro_vendedor:
                log.info("===== CONFIRMADO: ADICIONANDO FILTRO DE VENDEDOR NA CONSULTA SQL =====")
                log.info(f"TIPO DO CÓDIGO DE VENDEDOR NA CONSULTA: {type(codigo_vendedor_num)}")
                consulta_sql += f"AND {tabela_vendas}.VEN_CODIGO = ? "
            else:
                log.warning("===== ALERTA: FILTRO DE VENDEDOR NÃO ESTÁ SENDO APLICADO! =====")
                log.warning(f"Detalhes: Nivel={usuario_nivel}, Eh_vendedor={eh_vendedor}, Tem_codigo={tem_codigo}, Codigo={codigo_vendedor}")
            
            # Finalizar a consulta
            consulta_sql += """
            GROUP BY VENDEDOR.VEN_NOME, VENDEDOR.VEN_CODIGO, VENDEDOR.VEN_META
            ORDER BY TOTAL DESC
            """
            
            log.info(f"Executando consulta: {consulta_sql}")
            log.info(f"Parâmetros: {parametros}")
            
            cur.execute(consulta_sql, tuple(parametros))
            log.info("Consulta executada com sucesso")
            rows = cur.fetchall()
            
            # Processar resultados
            log.info(f"Consulta retornou {len(rows)} registros")
            
            if len(rows) == 0 and not filtro_vendedor:
                # Se não encontrou vendedores, fazer uma consulta mais simples para debug
                log.warning("Nenhum vendedor encontrado com a consulta principal. Executando consulta mais simples para debug...")
                try:
                    # Consulta mais simples para verificar se há vendas no período
                    cur.execute(
                        f"SELECT COUNT(*) FROM {tabela_vendas} WHERE {date_column} BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)",
                        (data_inicial, data_final,)
                    )
                    total_vendas = cur.fetchone()[0]
                    log.info(f"Total de vendas no período: {total_vendas}")
                    
                    if total_vendas > 0:
                        # Há vendas, mas a consulta principal não retornou resultados
                        return {
                            "sucesso": False,
                            "mensagem": f"Há {total_vendas} vendas no período selecionado, mas a consulta principal não retornou resultados. Pode haver um problema com a estrutura do banco.",
                            "data_inicial": data_inicial,
                            "data_final": data_final,
                            "top_vendedores": [],
                            "filtro_vendedor_aplicado": filtro_vendedor
                        }
                except Exception as debug_err:
                    log.error(f"Erro na consulta de debug: {str(debug_err)}")
            
            # Processar os resultados normalmente
            top_vendedores = []
            for row in rows:
                try:
                    # Nova ordem dos campos na consulta:
                    # 0: VEN_NOME, 1: VEN_CODIGO, 2: QTD_VENDAS, 3: TOTAL, 4: VEN_META
                    nome = row[0] if row[0] is not None else "Nome não informado"
                    codigo = row[1] if len(row) > 1 and row[1] is not None else None
                    qtde_vendas = int(row[2] or 0) if len(row) > 2 else 0
                    total = float(row[3] or 0) if len(row) > 3 else 0
                    meta = float(row[4] or 50000.00) if len(row) > 4 else 50000.00
                    
                    # Criar o objeto vendedor com os dados corretos
                    top_vendedor = TopVendedor(
                        nome=nome,
                        codigo=codigo,
                        qtde_vendas=qtde_vendas,
                        total=total,
                        meta=meta
                    )
                    top_vendedores.append(top_vendedor)
                    log.info(f"Vendedor processado: {top_vendedor.nome} (código: {codigo}, vendas: {qtde_vendas}, valor: {total})")
                except Exception as row_err:
                    log.error(f"Erro ao processar linha: {row}: {str(row_err)}")
                    for i, col in enumerate(row):
                        log.error(f"  Campo {i}: {col}, tipo: {type(col)}")
            
            log.info(f"Processados {len(top_vendedores)} vendedores com sucesso")
            
            conn.close()
            
            # Criar resposta
            resposta = TopVendedoresResponse(
                data_inicial=data_inicial,
                data_final=data_final,
                top_vendedores=top_vendedores,
                filtro_vendedor_aplicado=filtro_vendedor
            )
            
            log.info(f"Resposta completa de top vendedores: {len(top_vendedores)} registros")
            return resposta
        
        except Exception as e:
            log.error(f"Erro na execução da consulta SQL: {str(e)}")
            # Fechar a conexão em caso de erro
            try:
                conn.close()
            except:
                pass
                
            # Mensagem de erro mais amigável e detalhada baseada no tipo de erro
            erro_msg = str(e)
            if "relation" in erro_msg.lower() and "not found" in erro_msg.lower():
                # Erro de tabela não encontrada
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                   detail=f"Tabela não encontrada: {erro_msg}")
            elif "syntax error" in erro_msg.lower():
                # Erro de sintaxe SQL
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                                   detail=f"Erro de sintaxe SQL: {erro_msg}")
            else:
                # Outros erros de SQL
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                                   detail=f"Erro na consulta SQL: {erro_msg}")
                                   
    except HTTPException as he:
        # Re-lançar HTTPExceptions para manter o código de status correto
        raise
    except Exception as e:
        log.error(f"Erro ao buscar top vendedores: {str(e)}")
        # Retornar erro
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro geral: {str(e)}")


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
        
        # Nova lógica inspirada no endpoint de top-vendedores
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        stats = DashboardStats()
        # Inicializar usuario_nivel e codigo_vendedor antes de qualquer uso
        usuario_nivel = None
        codigo_vendedor = None
        # Extrair do token, se existir
        authorization = request.headers.get("Authorization")
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
            try:
                import jwt
                payload = jwt.decode(token, options={"verify_signature": False})
                usuario_nivel = payload.get("nivel")
                codigo_vendedor = payload.get("codigo_vendedor")
            except Exception as e:
                log.warning(f"Falha ao decodificar token JWT: {str(e)}")
        try:
            # Verificar se a tabela VENDAS existe
            log.info("Verificando tabela VENDAS...")
            cursor.execute("SELECT FIRST 1 1 FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = 'VENDAS'")
            tabela_vendas_existe = cursor.fetchone() is not None
            log.info(f"Tabela VENDAS existe: {tabela_vendas_existe}")
            if not tabela_vendas_existe:
                log.warning("Tabela VENDAS não existe no banco de dados!")
                conn.close()
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tabela VENDAS não existe no banco de dados da empresa selecionada.")
            # Descobrir dinamicamente o nome da coluna de data
            cursor.execute("SELECT FIRST 1 * FROM VENDAS")
            colunas_vendas = [col[0].lower() for col in cursor.description]
            log.info(f"Colunas da tabela VENDAS: {colunas_vendas}")
            date_column = "ecf_data" if "ecf_data" in colunas_vendas else ("ecf_cx_data" if "ecf_cx_data" in colunas_vendas else None)
            if not date_column:
                conn.close()
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nenhuma coluna de data encontrada na tabela VENDAS (esperado: ecf_data ou ecf_cx_data)")
            log.info(f"Coluna de data utilizada: {date_column}")
            # Consulta para vendas do dia
            try:
                sql_vendas_dia = f"""
                    SELECT COALESCE(SUM(ECF_TOTAL), 0)
                    FROM VENDAS
                    WHERE VENDAS.ecf_cancelada = 'N'
                    AND VENDAS.ecf_concluida = 'S'
                    AND CAST(VENDAS.{date_column} AS DATE) = CAST('{data_hoje}' AS DATE)
                """
                log.info(f"Executando SQL vendas do dia (apenas dia): {sql_vendas_dia}")
                cursor.execute(sql_vendas_dia)
                row = cursor.fetchone()
                log.info(f"Resultado consulta vendas do dia: {row}")
                if row and row[0] is not None:
                    stats.vendas_dia = float(row[0])
                    log.info(f"Vendas do dia convertidas para float: {stats.vendas_dia}")
                else:
                    log.info("Vendas do dia retornou nulo ou zero")
                    stats.vendas_dia = 0.0
            except Exception as e:
                log.error(f"Erro ao obter vendas do dia: {str(e)}")
            # Consulta para vendas do mês (parametrizada)
            try:
                sql_vendas_mes = f"""
                    SELECT COALESCE(SUM(ECF_TOTAL), 0)
                    FROM VENDAS
                    WHERE VENDAS.ecf_cancelada = 'N'
                    AND VENDAS.ecf_concluida = 'S'
                    AND CAST(VENDAS.{date_column} AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
                """
                log.info(f"Executando SQL vendas do mês: {sql_vendas_mes}")
                log.info(f"Parâmetros: {data_inicial}, {data_final}")
                cursor.execute(sql_vendas_mes, (data_inicial, data_final))
                row = cursor.fetchone()
                if row and row[0] is not None:
                    stats.vendas_mes = float(row[0])
                else:
                    stats.vendas_mes = 0.0
                log.info(f"Vendas do mês: {stats.vendas_mes}")
            except Exception as e:
                log.error(f"Erro ao obter vendas do mês: {str(e)}")

            # Consulta para vendas NÃO autenticadas (ecf_cx_data IS NULL)
            try:
                sql_vendas_nao_autenticadas = f"""
                    SELECT COALESCE(SUM(ECF_TOTAL), 0)
                    FROM VENDAS
                    WHERE VENDAS.ecf_cancelada = 'N'
                    AND VENDAS.ecf_concluida = 'S'
                    AND ECF_CX_DATA IS NULL
                    AND CAST(VENDAS.{date_column} AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
                """
                log.info(f"Executando SQL vendas NÃO autenticadas: {sql_vendas_nao_autenticadas}")
                cursor.execute(sql_vendas_nao_autenticadas, (data_inicial, data_final))
                row = cursor.fetchone()
                if row and row[0] is not None:
                    stats.vendas_nao_autenticadas = float(row[0])
                else:
                    stats.vendas_nao_autenticadas = 0.0
                log.info(f"Vendas NÃO autenticadas: {stats.vendas_nao_autenticadas}")
            except Exception as e:
                log.error(f"Erro ao obter vendas NÃO autenticadas: {str(e)}")

            # Consulta para vendas AUTENTICADAS (ecf_cx_data TEM DATA)
            try:
                # Filtro de vendedor, se aplicável
                filtro_vendedor = ""
                if usuario_nivel and usuario_nivel.lower() == "vendedor" and codigo_vendedor:
                    filtro_vendedor = f" AND USU_VEN_CODIGO = '{codigo_vendedor}' "
                sql_vendas_autenticadas = f"""
                    SELECT COALESCE(SUM(ECF_TOTAL), 0)
                    FROM VENDAS
                    WHERE VENDAS.ecf_cancelada = 'N'
                    AND VENDAS.ecf_concluida = 'S'
                    AND ECF_CX_DATA IS NOT NULL
                    AND CAST(VENDAS.ecf_data AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
                    {filtro_vendedor}
                """
                log.info(f"Executando SQL vendas AUTENTICADAS: {sql_vendas_autenticadas}")
                cursor.execute(sql_vendas_autenticadas, (data_inicial, data_final))
                row = cursor.fetchone()
                if row and row[0] is not None:
                    stats.vendas_autenticadas = float(row[0])
                else:
                    stats.vendas_autenticadas = 0.0
                log.info(f"Vendas AUTENTICADAS: {stats.vendas_autenticadas}")
            except Exception as e:
                log.error(f"Erro ao obter vendas AUTENTICADAS: {str(e)}")
        except Exception as e:
            log.error(f"Erro geral ao consultar estatísticas de vendas: {str(e)}")
            try:
                conn.close()
            except:
                pass
            raise
        # Continuação do restante das estatísticas (clientes, produtos, pedidos etc) permanece igual.
        
        # 3. Contagem de clientes (total cadastrado)
        try:
            sql_total_clientes = "SELECT COUNT(*) FROM CLIENTES"
            cursor.execute(sql_total_clientes)
            row = cursor.fetchone()
            if row and row[0] is not None:
                stats.total_clientes = int(row[0])
            log.info(f"Total de clientes: {stats.total_clientes}")
        except Exception as e:
            log.error(f"Erro ao obter total de clientes: {str(e)}")
            
        # 4. Contagem de produtos (total cadastrado)
        try:
            sql_total_produtos = "SELECT COUNT(*) FROM PRODUTOS"
            cursor.execute(sql_total_produtos)
            row = cursor.fetchone()
            if row and row[0] is not None:
                stats.total_produtos = int(row[0])
            log.info(f"Total de produtos: {stats.total_produtos}")
        except Exception as e:
            log.error(f"Erro ao obter total de produtos: {str(e)}")
            
        # 5. Total de pedidos no período
        try:
            # Verificar se é vendedor e aplicar filtro
            import jwt
            usuario_nivel = None
            codigo_vendedor = None
            authorization = request.headers.get("Authorization")
            if authorization and authorization.startswith("Bearer "):
                token = authorization.split(" ")[1]
                try:
                    payload = jwt.decode(token, options={"verify_signature": False})
                    usuario_nivel = payload.get("nivel")
                    codigo_vendedor = payload.get("codigo_vendedor")
                except Exception as e:
                    log.warning(f"Falha ao decodificar token JWT: {str(e)}")
            filtro_vendedor = ""
            if usuario_nivel and usuario_nivel.lower() == "vendedor" and codigo_vendedor:
                filtro_vendedor = f" AND USU_VEN_CODIGO = '{codigo_vendedor}' "
                log.info(f"Aplicando filtro de vendedor: USU_VEN_CODIGO = {codigo_vendedor}")
            sql_total_pedidos = f"""
                SELECT COUNT(*) 
                FROM {tabela_vendas} 
                WHERE {tabela_vendas}.ecf_cancelada = 'N'
                AND {tabela_vendas}.ecf_concluida = 'S' 
                AND CAST({tabela_vendas}.ecf_data AS DATE) BETWEEN '{data_inicial}' AND '{data_final}'
                {filtro_vendedor}
            """
            cursor.execute(sql_total_pedidos)
            row = cursor.fetchone()
            if row and row[0] is not None:
                stats.total_pedidos = int(row[0])
            log.info(f"Total de pedidos: {stats.total_pedidos}")
        except Exception as e:
            log.error(f"Erro ao obter total de pedidos: {str(e)}")
            
        # Fechar conexão
        conn.close()
        
        return stats
        
    except HTTPException as he:
        # Re-lançar HTTPExceptions para manter o código de status correto
        raise
    except Exception as e:
        log.error(f"Erro ao buscar estatísticas do dashboard: {str(e)}")
        # Retornar erro
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro geral: {str(e)}")


@router.get("/vendas-por-dia")
async def get_vendas_por_dia(request: Request, data_inicial: Optional[str] = None, data_final: Optional[str] = None):
    """
    Endpoint para retornar as vendas agrupadas por dia no período informado.
    Se o usuário for vendedor, filtra pelo código do vendedor.
    """
    from datetime import datetime, date, timedelta
    log.info(f"Recebendo requisição para vendas-por-dia com data_inicial={data_inicial} e data_final={data_final}")
    hoje = date.today()
    # Datas padrão: mês atual
    if not data_inicial:
        data_inicial = date(hoje.year, hoje.month, 1).isoformat()
    else:
        datetime.fromisoformat(data_inicial)
    if not data_final:
        if hoje.month == 12:
            proximo_mes = date(hoje.year + 1, 1, 1)
        else:
            proximo_mes = date(hoje.year, hoje.month + 1, 1)
        data_final = (proximo_mes - timedelta(days=1)).isoformat()
    else:
        datetime.fromisoformat(data_final)
    log.info(f"Período de consulta: {data_inicial} a {data_final}")
    empresa = get_empresa_atual(request)
    if not empresa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa não encontrada. Selecione uma empresa válida.")
    conn = await get_empresa_connection(request)
    cursor = conn.cursor()
    # Extrair vendedor do JWT
    usuario_nivel = None
    codigo_vendedor = None
    authorization = request.headers.get("Authorization")
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            import jwt
            payload = jwt.decode(token, options={"verify_signature": False})
            usuario_nivel = payload.get("nivel")
            codigo_vendedor = payload.get("codigo_vendedor")
        except Exception as e:
            log.warning(f"Falha ao decodificar token JWT: {str(e)}")
    # Descobrir coluna de data
    cursor.execute("SELECT FIRST 1 * FROM VENDAS")
    colunas_vendas = [col[0].lower() for col in cursor.description]
    date_column = "ecf_data" if "ecf_data" in colunas_vendas else ("ecf_cx_data" if "ecf_cx_data" in colunas_vendas else None)
    if not date_column:
        conn.close()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nenhuma coluna de data encontrada na tabela VENDAS (esperado: ecf_data ou ecf_cx_data)")
    filtro_vendedor = ""
    if usuario_nivel and usuario_nivel.lower() == "vendedor" and codigo_vendedor:
        filtro_vendedor = f" AND USU_VEN_CODIGO = '{codigo_vendedor}' "
    sql = f'''
        SELECT CAST({date_column} AS DATE) as dia, COALESCE(SUM(ECF_TOTAL),0) as total
        FROM VENDAS
        WHERE VENDAS.ecf_cancelada = 'N'
        AND VENDAS.ecf_concluida = 'S'
        AND {date_column} IS NOT NULL
        AND CAST({date_column} AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
        {filtro_vendedor}
        GROUP BY CAST({date_column} AS DATE)
        ORDER BY dia
    '''
    log.info(f"Executando SQL vendas por dia: {sql}")
    cursor.execute(sql, (data_inicial, data_final))
    rows = cursor.fetchall()
    resultado = []
    for row in rows:
        # row[0]: data, row[1]: total
        resultado.append({"data": row[0].isoformat() if hasattr(row[0], 'isoformat') else str(row[0]), "total": float(row[1])})
    conn.close()
    return resultado

