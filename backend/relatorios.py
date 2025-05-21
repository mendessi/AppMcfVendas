from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from typing import List, Optional
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
            GROUP BY VENDAS.CLI_CODIGO, VENDAS.NOME, CLIENTES.CIDADE, CLIENTES.UF, CLIENTES.TEL_WHATSAPP
            ORDER BY TOTAL_COMPRAS DESC
            """
            
            log.info(f"Executando consulta: {consulta_sql}")
            log.info(f"Parâmetros: {data_inicial}, {data_final}")
            
            cur.execute(consulta_sql, (data_inicial, data_final,))
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
    Retorna dados de exemplo para demonstração quando não há conexão com o banco.
    NOTA: Esta função está desativada na versão atual. Mantida apenas para referência.
    """
    log.warning("ATENÇÃO: A função de dados de exemplo foi chamada, mas está desativada. Isto não deveria acontecer.")
    
    # Dados de exemplo para testes
    clientes_exemplo = [
        TopCliente(
            codigo=1,
            nome="ABC Supermercados",
            cidade="São Paulo",
            uf="SP",
            whatsapp="(11) 99123-4567",
            qtde_compras=12,
            total=42589.75,
            ecf_data="2025-05-18",
            ven_nome="Carlos Silva",
            ecf_cx_data="2025-05-18"
        ),
        TopCliente(
            codigo=2,
            nome="Distribuidora XYZ",
            cidade="Rio de Janeiro",
            uf="RJ",
            whatsapp="(21) 98765-4321",
            qtde_compras=8,
            total=35420.50,
            ecf_data="2025-05-15",
            ven_nome="Ana Oliveira",
            ecf_cx_data="2025-05-15"
        ),
        TopCliente(
            codigo=3,
            nome="Mercado Central",
            cidade="Belo Horizonte",
            uf="MG",
            whatsapp="(31) 97777-8888",
            qtde_compras=10,
            total=28760.25,
            ecf_data="2025-05-20",
            ven_nome="Paulo Santos",
            ecf_cx_data="2025-05-20"
        ),
        TopCliente(
            codigo=4,
            nome="Comercial Júnior",
            cidade="Porto Alegre",
            uf="RS",
            whatsapp="(51) 96666-5555",
            qtde_compras=6,
            total=18950.00,
            ecf_data="2025-05-10",
            ven_nome="Márcia Lima",
            ecf_cx_data="2025-05-10"
        ),
        TopCliente(
            codigo=5,
            nome="Atacado Express",
            cidade="Recife",
            uf="PE",
            whatsapp="(81) 94444-3333",
            qtde_compras=5,
            total=15600.80,
            ecf_data="2025-05-05",
            ven_nome="Roberto Alves",
            ecf_cx_data="2025-05-05"
        )
    ]
    
    return TopClientesResponse(
        data_inicial=data_inicial,
        data_final=data_final,
        top_clientes=clientes_exemplo
    )
