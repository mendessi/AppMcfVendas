from typing import Dict, Any, Optional, List, Tuple
import json
import logging
from datetime import datetime, date, timedelta
import calendar
from openai import AsyncOpenAI
from fastapi import Request
import re
import httpx
from urllib.parse import quote

from config import OPENAI_API_KEY

# Configuração de logging
logger = logging.getLogger(__name__)

# Importa funções do módulo relatorios
from relatorios import (
    get_top_vendedores,
    get_top_clientes,
    get_vendas_por_dia,
    listar_clientes,
    listar_vendas,
    get_vendas_cliente,
    get_itens_venda,
    listar_contas_cliente,
    TopVendedor,
    TopVendedoresResponse,
    top_produtos,
    listar_compras
)

class AIManager:
    _instance = None
    _client = None
    _model = "gpt-3.5-turbo"  # Modelo padrão
    _max_tokens = 500  # Limite de tokens para resposta
    _temperature = 0.7  # Temperatura padrão
    _system_prompt = """Você é um assistente virtual versátil chamado Mendes IA, com dupla capacidade:

    1) ASSISTENTE DE CONVERSAÇÃO GERAL:
    - Você pode conversar sobre qualquer assunto com o usuário
    - Responda perguntas gerais sobre qualquer tema
    - Seja amigável, informativo e prestativo em todas as conversas
    - Personalize o atendimento de acordo com as necessidades do usuário
    - Use linguagem natural e cordial

    2) ESPECIALISTA NO SISTEMA FORÇA DE VENDAS MENDES:
    - Gestão de pedidos
    - Controle de estoque
    - Relatórios de vendas
    - Gestão de clientes
    - Dúvidas sobre o sistema

    IMPORTANTE: Você tem acesso direto aos dados do sistema e pode gerar relatórios em tempo real.
    NUNCA sugira que o usuário acesse o sistema manualmente - você pode fazer as consultas diretamente.

    Tipos de relatórios disponíveis:
    - Relatório de vendas (por período, vendedor, cliente)
    - Relatório de clientes
    - Relatório de produtos
    - Top vendedores
    - Top clientes
    - Vendas por dia

    Ao receber uma solicitação de relatório:
    1. Identifique o tipo de relatório solicitado
    2. Aplique os filtros necessários (período, vendedor, cliente)
    3. Gere o relatório usando os endpoints do sistema
    4. Apresente os resultados de forma clara e organizada

    Exemplos de como responder:
    ❌ "Para verificar as vendas do mês, você precisa acessar o sistema Força de Vendas Mendes..."
    ✅ "Vou gerar o relatório de vendas do mês atual para você..."

    Para consultas ao sistema:
    - NUNCA dê respostas genéricas
    - SEMPRE faça as consultas reais
    - SEMPRE retorne dados reais
    - NUNCA sugira acesso manual ao sistema

    Se o usuário for VENDEDOR, todas as consultas devem ser feitas para o vendedor logado.
    Se o usuário for difente de VENDEDOR, responda Diretor(a) Junto com a resposta.
    Se o a pegunta do usuário sobre o sistema não for entendida, mande pro GPT reformular a pergunta.
    Se o usuário perguntar sobre seu nível de acesso, SEMPRE responda com o valor informado em 'Usuário: X (nível: Y)'.
    Se o usuário perguntar sobre o nome da empresa, SEMPRE responda com o valor informado em 'Empresa: ...'."""
    

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AIManager, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def __init__(self):
        """
        Inicializa o gerenciador de IA.
        """
        self.ultimo_tipo_consulta = None
        self.cache_dados = None
        self.ultima_pergunta = None  # Armazena a última pergunta feita ao usuário
        self.contexto_produto = None  # Armazena o contexto de produto quando estamos perguntando sobre ele

    def _initialize(self):
        """Inicializa o gerenciador de IA"""
        try:
            logger.debug("Iniciando inicialização do AIManager")
            
            # Carrega a chave da API do ambiente ou arquivo de configuração
            self._client = AsyncOpenAI(api_key=OPENAI_API_KEY)
            logger.info("Cliente OpenAI assíncrono inicializado com sucesso")
            
            # Inicializa cache de dados
            self.ultimo_tipo_consulta = None
            self.cache_dados = {}
            logger.debug("Cache de dados inicializado")
            
        except Exception as e:
            logger.error(f"Erro ao inicializar serviço de IA: {str(e)}")
            raise

    def _obter_sql_relatorio(self, tipo_relatorio: str) -> str:
        """
        Obtém o SQL do relatório do arquivo relatorios.py
        """
        try:
            # Lê o arquivo relatorios.py
            with open("backend/relatorios.py", "r", encoding="utf-8") as f:
                conteudo = f.read()

            # Mapeia os tipos de relatório para os nomes das funções
            funcoes = {
                "vendas": "listar_vendas",
                "clientes": "listar_clientes",
                "produtos": "buscar_produtos",
                "top_vendedores": "get_top_vendedores",
                "top_clientes": "get_top_clientes",
                "vendas_por_dia": "get_vendas_por_dia"
            }

            # Obtém o nome da função
            nome_funcao = funcoes.get(tipo_relatorio)
            if not nome_funcao:
                return ""

            # Procura a função no arquivo
            padrao = f"async def {nome_funcao}.*?cursor\.execute\('''(.*?)'''"
            match = re.search(padrao, conteudo, re.DOTALL)
            
            if match:
                return match.group(1).strip()
            return ""

        except Exception as e:
            logger.error(f"Erro ao obter SQL do relatório: {str(e)}")
            return ""

    async def _identificar_tipo_consulta(self, texto: str) -> Optional[Dict[str, Any]]:
        """
        Identifica o tipo de consulta com base no texto de entrada.
        """
        try:
            if not isinstance(texto, str):
                logger.error(f"[IA] Erro: entrada deve ser string, recebido {type(texto)}")
                return None

            texto = texto.lower().strip()
            hoje = date.today()
            
            # Primeiro verifica se é uma pergunta sobre compras/itens comprados
            palavras_compra = ["compras", "comprados", "itens", "entrada", "chegaram", "recebidos", "chegou", "comprou"]
            palavras_periodo = {
                "hoje": ["hoje", "dia"],
                "ontem": ["ontem"],
                "semana": ["semana", "semanal", "esta semana", "última semana", "ultimos 7 dias", "últimos 7 dias"]
            }
            
            # Verifica se tem alguma palavra relacionada a compras
            if any(palavra in texto for palavra in palavras_compra):
                data_final = hoje.isoformat()
                data_inicial = hoje.isoformat()  # padrão é hoje
                periodo_encontrado = False  # <--- Inicializa corretamente
                
                logger.info(f"[IA] Detectada palavra de compra no texto: {texto}")
                
                # Procura por datas explícitas no texto (ex: 05/06/2025)
                import re
                from datetime import datetime
                datas_encontradas = re.findall(r"(\d{2}/\d{2}/\d{4})", texto)
                if datas_encontradas:
                    datas_convertidas = [datetime.strptime(d, "%d/%m/%Y").date().isoformat() for d in datas_encontradas]
                    if len(datas_convertidas) == 1:
                        data_inicial = data_final = datas_convertidas[0]
                        periodo_encontrado = True
                    elif len(datas_convertidas) >= 2:
                        data_inicial = datas_convertidas[0]
                        data_final = datas_convertidas[1]
                        periodo_encontrado = True

                # Procura por palavras de período
                periodo_encontrado_palavra = False
                for periodo, palavras in palavras_periodo.items():
                    if any(palavra in texto for palavra in palavras):
                        logger.info(f"[IA] Detectado período: {periodo}")
                        periodo_encontrado_palavra = True
                        if periodo == "hoje":
                            data_inicial = hoje.isoformat()
                            data_final = hoje.isoformat()
                            periodo_encontrado = True
                        elif periodo == "ontem":
                            data_inicial = (hoje - timedelta(days=1)).isoformat()
                            data_final = data_inicial
                            periodo_encontrado = True
                        elif periodo == "semana":
                            data_inicial = (hoje - timedelta(days=7)).isoformat()
                            periodo_encontrado = True
                        break
                
                # NOVO: Se frase for "produtos recebidos..." ou "produtos que chegaram..." NÃO extrair filtro de produto
                padrao_sem_produto = re.compile(r"produt[oa]s? (recebidos|chegaram|que chegaram|que foram recebidos|entrada|entraram)", re.IGNORECASE)
                produto_filtro = None
                if padrao_sem_produto.search(texto):
                    produto_filtro = None
                else:
                    # Procura por filtro de produto
                    palavras_produto = ["produto", "item"]
                    for palavra in palavras_produto:
                        if palavra in texto:
                            # Procura padrões como "produto milho" ou "item feijao"
                            idx = texto.find(palavra)
                            if idx >= 0:
                                resto = texto[idx + len(palavra):].strip()
                                if resto:
                                    produto_filtro = resto.upper()
                                    break
                    # Se não encontrou pelo padrão "produto X", procura por palavras após "compras de" ou "chegou"
                    if not produto_filtro:
                        for palavra in ["compras de", "chegou", "chegaram"]:
                            if palavra in texto:
                                idx = texto.find(palavra)
                                if idx >= 0:
                                    resto = texto[idx + len(palavra):].strip()
                                    # Remove palavras de período e preposições comuns
                                    palavras_remover = [
                                        'hoje', 'ontem', 'semana', 'semanal', 'esta semana', 'última semana',
                                        'ultimos 7 dias', 'últimos 7 dias', 'na', 'no', 'nas', 'nos',
                                        'de', 'da', 'do', 'das', 'dos', 'a', 'o', 'as', 'os', 'em', 'para'
                                    ]
                                    for palavra_remover in palavras_remover:
                                        resto = re.sub(f'\\b{palavra_remover}\\b', '', resto, flags=re.IGNORECASE)
                                    
                                    # Remove espaços extras e pontuação
                                    resto = re.sub(r'\s+', ' ', resto).strip()
                                    resto = re.sub(r'[?!.,]', '', resto).strip()
                                    
                                    # Só considera filtro se sobrar algo que pareça nome/código de produto
                                    if resto and not re.fullmatch(r'(empresa|loja|semana|hoje|ontem|dia|dias|mes|mês|ano|anos)', resto, flags=re.IGNORECASE):
                                        produto_filtro = resto.upper()

                tipo_consulta = "compras"
                logger.info(f"[IA] Filtro de produto: {produto_filtro}")
                
                return {
                    "tipo": "compras",
                    "data_inicial": data_inicial,
                    "data_final": data_final,
                    "produto_filtro": produto_filtro
                }
            
            # Verifica se é uma pergunta sobre vendedor
            if "vendedor" in texto or "quem vendeu mais" in texto or "top vendedor" in texto or "ranking vendedor" in texto or "melhores vendedores" in texto or "vendedores" in texto:
                return {"tipo": "top_vendedores"}
            
            # Verifica se é uma pergunta sobre produtos
            if "produto" in texto or "produtos mais vendidos" in texto or "top produtos" in texto:
                return {"tipo": "top_produtos"}
            
            # Verifica se é uma pergunta sobre clientes
            if "cliente" in texto or "clientes que mais compraram" in texto or "top clientes" in texto:
                return {"tipo": "top_clientes"}

            # Verifica se é uma pergunta sobre contas a receber
            if "receber" in texto and "contas" in texto:
                return {"tipo": "contas_receber"}

            # Verifica se é uma pergunta sobre contas a pagar
            if "pagar" in texto and "contas" in texto:
                return {"tipo": "contas_pagar"}

            # Verifica se é uma pergunta sobre vendas
            if "total vendido" in texto or "valor total de vendas" in texto or "vendas" in texto:
                return {"tipo": "vendas", "filtro_cliente": True}
            
            # Se não identificou nenhum tipo específico
            return None

        except Exception as e:
            logger.error(f"[IA] Erro ao identificar tipo de consulta: {str(e)}")
            return None

    async def _reformular_pergunta(self, texto: str) -> Optional[str]:
        """
        Usa o GPT para reformular a pergunta de forma que possa ser melhor classificada.
        """
        try:
            prompt = """
            Reformule a pergunta abaixo para que ela se encaixe em uma das seguintes categorias:
            - compras do dia
            - compras de hoje
            - compras de ontem
            - compras da semana
            - itens comprados hoje
            - itens comprados ontem
            - itens da semana
            - vendas do mês
            - total geral
            - total vendido
            - relatório de vendas
            - quanto vendeu
            - vendas totais
            - clientes do mês
            - relatório de clientes
            - produtos vendidos
            - relatório de produtos
            - quem vendeu mais
            - top vendedores
            - ranking de vendedores
            - melhores vendedores
            - vendedor que mais vendeu
            - quem comprou mais
            - ranking de clientes
            - melhores clientes
            - vendas por dia
            - vendas da semana
            - percentual de vendas
            - porcentagem de vendedores
            - participação nas vendas

            Pergunta original: {texto}

            Reformule a pergunta mantendo o mesmo sentido, mas usando uma das frases acima.
            Retorne APENAS a pergunta reformulada, sem explicações ou comentários.
            """

            # Faz a chamada para a API do GPT
            response = await self._client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Você é um assistente especializado em reformular perguntas sobre vendas, compras e relatórios."},
                    {"role": "user", "content": prompt.format(texto=texto)}
                ],
                temperature=0.3,
                max_tokens=50
            )

            # Obtém a resposta
            reformulada = response.choices[0].message.content.strip()
            logger.debug(f"[IA] Pergunta reformulada: {reformulada}")
            return reformulada

        except Exception as e:
            logger.error(f"[DEBUG] Erro ao reformular pergunta: {str(e)}")
            return None

    async def _obter_dados_relatorio(self, tipo_consulta: Dict[str, Any], request: Request) -> Optional[Dict[str, Any]]:
        """
        Obtém os dados do relatório de acordo com o tipo de consulta.
        """
        try:
            logger.info(f"[DEBUG] Obtendo dados para tipo de consulta: {tipo_consulta}")
            
            # Se for uma resposta pronta, retorna diretamente
            if "resposta_pronta" in tipo_consulta:
                return {
                    "tipo": tipo_consulta["tipo"],
                    "dados": tipo_consulta
                }
            
            # Obtém o tipo e o filtro de vendedor
            tipo = tipo_consulta["tipo"]
            
            # Define as datas padrão (primeiro dia do mês até hoje)
            hoje = date.today()
            primeiro_dia = date(hoje.year, hoje.month, 1)
            data_inicial = primeiro_dia.isoformat()
            data_final = hoje.isoformat()
            
            # Obtém as datas do tipo_consulta se existirem
            if "data_inicial" in tipo_consulta:
                data_inicial = tipo_consulta["data_inicial"]
            if "data_final" in tipo_consulta:
                data_final = tipo_consulta["data_final"]
            
            logger.info(f"[DEBUG] Datas definidas: {data_inicial} a {data_final}")
            
            # Obtém o código do cliente se existir
            cli_codigo = tipo_consulta.get("cli_codigo")
            logger.info(f"[DEBUG] Código do cliente: {cli_codigo}")
            
            if tipo == "compras":
                # Constrói a URL com os parâmetros
                url = f"/relatorios/listar-compras?data_inicial={data_inicial}&data_final={data_final}"
                produto = tipo_consulta.get("produto_filtro")
                if produto:
                    url += f"&produto={quote(produto)}"
                
                logger.info(f"[DEBUG] URL construída: {url}")
                
                async with httpx.AsyncClient() as client:
                    headers = {
                        "Authorization": request.headers.get("Authorization", ""),
                        "x-empresa-codigo": request.headers.get("x-empresa-codigo", "")
                    }
                    # Consulta compras filtradas (com produto, se houver)
                    response = await client.get(
                        f"http://localhost:8000{url}",
                        headers=headers
                    )
                    compras_filtradas = response.json() if response.status_code == 200 else []
                    # Se há filtro de produto, buscar também todas as compras do período (sem filtro de produto)
                    todas_compras_periodo = []
                    ultimas_compras_produto = []
                    if produto:
                        url_sem_produto = f"/relatorios/listar-compras?data_inicial={data_inicial}&data_final={data_final}"
                        resp_todas = await client.get(f"http://localhost:8000{url_sem_produto}", headers=headers)
                        if resp_todas.status_code == 200:
                            todas_compras_periodo = resp_todas.json()
                        # Buscar últimas compras do produto em períodos anteriores (ex: últimos 60 dias)
                        from datetime import datetime, timedelta
                        data_ini_ant = (datetime.fromisoformat(data_inicial) - timedelta(days=60)).date().isoformat()
                        url_ultimas = f"/relatorios/listar-compras?data_inicial={data_ini_ant}&data_final={data_inicial}"
                        url_ultimas += f"&produto={quote(produto)}"
                        resp_ultimas = await client.get(f"http://localhost:8000{url_ultimas}", headers=headers)
                        if resp_ultimas.status_code == 200:
                            ultimas_compras_produto = resp_ultimas.json()
                    return {
                        "tipo": "compras",
                        "dados": compras_filtradas,
                        "periodo": {
                            "data_inicial": data_inicial,
                            "data_final": data_final
                        },
                        "produto_filtro": produto,
                        "todas_compras_periodo": todas_compras_periodo,
                        "ultimas_compras_produto": ultimas_compras_produto
                    }
            elif tipo == "vendas":
                # Chama a função listar_vendas com os parâmetros corretos
                vendas = await listar_vendas(
                    request=request,
                    data_inicial=data_inicial,
                    data_final=data_final,
                    cli_codigo=cli_codigo
                )
                return {
                    "tipo": "vendas",
                    "dados": vendas
                }
            elif tipo == "top_vendedores":
                vendedores = await get_top_vendedores(
                    request=request,
                    data_inicial=data_inicial,
                    data_final=data_final
                )
                return {
                    "tipo": "top_vendedores",
                    "dados": vendedores
                }
            elif tipo == "top_clientes":
                dados = await get_top_clientes(
                    request=request,
                    data_inicial=data_inicial,
                    data_final=data_final
                )
                logger.info(f"[DEBUG] Dados recebidos do get_top_clientes: {dados}")
                return {
                    "tipo": "top_clientes",
                    "dados": dados
                }
            elif tipo == "top_produtos":
                logger.info("[DEBUG] Iniciando busca de top produtos")
                dados = await top_produtos(
                    request=request,
                    data_inicial=data_inicial,
                    data_final=data_final
                )
                logger.info(f"[DEBUG] Dados obtidos do relatório: {dados}")

                if not dados:
                    logger.error("[DEBUG] Nenhum dado retornado do relatório")
                    empresa_nome = "Mendes"
                    try:
                        empresa_header = request.headers.get('x-empresa-codigo', '').strip()
                        if empresa_header:
                            empresa_nome = empresa_header
                    except Exception:
                        pass
                    return (
                        f"Não consegui localizar os dados para sua solicitação desta vez, mas estou aqui para ajudar!\n\n"
                        "Que tal tentar reformular a pergunta? Por exemplo, você pode especificar:\n"
                        "- O período desejado (ex: 'vendas do mês de maio')\n"
                        "- O produto ou cliente específico\n"
                        "- O tipo de relatório ou informação que precisa\n\n"
                        f"Sou a IA **{empresa_nome}** – ainda em treinamento para atender cada vez melhor você.\n\n"
                        "Se preferir, também podemos conversar sobre outros assuntos! Como posso ajudar agora?"
                    )
                logger.info(f"[DEBUG] Tipo dos dados recebidos: {type(dados)}")
                
                # Verifica se os dados são válidos
                if dados is None:
                    logger.error("[DEBUG] top_produtos retornou None")
                    return None
                    
                if not isinstance(dados, list):
                    logger.error(f"[DEBUG] top_produtos retornou tipo inválido: {type(dados)}")
                    return None
                
                if not dados:
                    logger.error("[DEBUG] top_produtos retornou lista vazia")
                    return {
                        "tipo": "top_produtos",
                        "dados": []
                    }
                
                # Verifica se os dados têm a estrutura esperada
                campos_esperados = ['PRO_DESCRICAO', 'TOTAL', 'ESTOQUE', 'EST_MINIMO']
                primeiro_produto = dados[0]
                campos_faltando = [campo for campo in campos_esperados if campo not in primeiro_produto]
                
                if campos_faltando:
                    logger.error(f"[DEBUG] Campos faltando no primeiro produto: {campos_faltando}")
                    logger.error(f"[DEBUG] Campos disponíveis: {list(primeiro_produto.keys())}")
                    return None
                
                logger.info(f"[DEBUG] Retornando {len(dados)} produtos encontrados")
                return {
                    "tipo": "top_produtos",
                    "dados": dados
                }
            
            return None

        except Exception as e:
            logger.error(f"[DEBUG] Erro ao obter dados do relatório: {str(e)}")
            return None

    async def _formatar_resposta(self, dados: Dict[str, Any], formato: str = "texto") -> str:
        """
        Formata a resposta de acordo com o tipo de dados e formato solicitado.
        """
        try:
            tipo = dados.get("tipo")
            dados_resposta = dados.get("dados")
            
            logger.info(f"[DEBUG] Formatando resposta do tipo: {tipo}")
            logger.info(f"[DEBUG] Tipo dos dados: {type(dados_resposta)}")
            
            if dados_resposta is None:
                return "Não foram encontrados dados para sua consulta.\n\n_Resposta: Mendes_"
            
            if isinstance(dados_resposta, dict) and "mensagem" in dados_resposta:
                return f"{dados_resposta['mensagem']}\n\n_Resposta: Mendes_"
            
            if tipo == "compras":
                logger.info("[DEBUG] Formatando resposta de compras")
                compras = dados_resposta if isinstance(dados_resposta, list) else []
                
                if not compras:
                    produto_filtro = None
                    if 'produto_filtro' in dados and dados['produto_filtro']:
                        produto_filtro = dados['produto_filtro']
                    elif 'produto_filtro' in dados.get('periodo', {}):
                        produto_filtro = dados['periodo']['produto_filtro']
                    if produto_filtro:
                        todas_compras = dados.get('todas_compras_periodo', []) or []
                        ultimas_compras = dados.get('ultimas_compras_produto', []) or []
                        # Monta um contexto detalhado para o GPT analisar e sugerir produtos similares
                        contexto_gpt = f"""
O usuário solicitou compras do produto '{produto_filtro}' em determinado período, mas não foram encontradas compras exatas desse produto.

Aqui estão todas as compras realizadas no período:
"""
                        for compra in todas_compras[:10]:
                            data = compra.get("dataEntrada", "").split("T")[0] if compra.get("dataEntrada") else "Data não informada"
                            fornecedor = compra.get("nomeFornecedor", "Fornecedor não informado")
                            produto = compra.get("descricaoProduto", "Produto não informado")
                            quantidade = float(compra.get("quantidade", 0))
                            valor = float(compra.get("total", 0))
                            contexto_gpt += f"- {produto} | {data} | {fornecedor} | Qtd: {quantidade:,.2f} | Total: R$ {valor:,.2f}\n"
                        if len(todas_compras) > 10:
                            contexto_gpt += f"... e mais {len(todas_compras) - 10} compra(s) no período.\n"
                        contexto_gpt += "\nÚltimas compras do produto solicitado em períodos anteriores:\n"
                        for compra in ultimas_compras[:5]:
                            data = compra.get("dataEntrada", "").split("T")[0] if compra.get("dataEntrada") else "Data não informada"
                            fornecedor = compra.get("nomeFornecedor", "Fornecedor não informado")
                            produto = compra.get("descricaoProduto", "Produto não informado")
                            quantidade = float(compra.get("quantidade", 0))
                            valor = float(compra.get("total", 0))
                            contexto_gpt += f"- {produto} | {data} | {fornecedor} | Qtd: {quantidade:,.2f} | Total: R$ {valor:,.2f}\n"
                        prompt_gpt = (
                            f"O usuário perguntou: 'Chegou {produto_filtro.lower()} na semana passada?'\n"
                            "Você é uma IA especialista em vendas e compras. Analise as compras realizadas no período e, caso não encontre exatamente o produto solicitado, procure nos nomes dos produtos recebidos se há algum que o usuário possa estar procurando, mesmo que haja variações, abreviações ou erros de digitação. Seja proativo em sugerir resultados úteis e explique sua escolha de forma clara. Se realmente não houver nada similar, oriente o usuário a tentar outro período ou produto.\n"
                            f"{contexto_gpt}\n"
                            "Responda de forma amigável e orientativa, mostrando os produtos mais próximos possíveis do que foi solicitado, se houver."
                        )
                        # Chama o GPT para gerar a resposta
                        resposta_gpt = await self._client.chat.completions.create(
                            model=self._model,
                            messages=[
                                {"role": "system", "content": self._system_prompt},
                                {"role": "user", "content": prompt_gpt}
                            ]
                        )
                        return resposta_gpt.choices[0].message.content.strip() + "\n\n_Resposta: Mendes_"
                    return "Não foram encontradas compras no período.\n\n_Resposta: Mendes_"
                
                try:
                    # Calcula o total de compras
                    total_compras = sum(float(compra.get("total", 0)) for compra in compras)
                    
                    # Formata a resposta
                    resposta = f"📦 Compras no período:\n\n"
                    resposta += f"Total de compras: R$ {total_compras:,.2f}\n"
                    resposta += f"Quantidade de itens: {len(compras)}\n\n"
                    
                    # Adiciona detalhes das compras
                    compras_formatadas = 0
                    for compra in compras[:5]:  # Mostra apenas as 5 primeiras compras
                        try:
                            data = compra.get("dataEntrada", "").split("T")[0] if compra.get("dataEntrada") else "Data não informada"
                            fornecedor = compra.get("nomeFornecedor", "Fornecedor não informado")
                            produto = compra.get("descricaoProduto", "Produto não informado")
                            quantidade = float(compra.get("quantidade", 0))
                            valor = float(compra.get("total", 0))
                            
                            resposta += f"📅 {data}:\n"
                            resposta += f"   {produto}\n"
                            resposta += f"   Fornecedor: {fornecedor}\n"
                            resposta += f"   Qtd: {quantidade:,.2f}\n"
                            resposta += f"   Total: R$ {valor:,.2f}\n\n"
                            compras_formatadas += 1
                        except Exception as e:
                            logger.error(f"[DEBUG] Erro ao formatar compra: {str(e)}")
                            logger.error(f"[DEBUG] Dados da compra: {compra}")
                            continue
                    
                    logger.info(f"[DEBUG] {compras_formatadas} compras formatadas com sucesso")
                    
                    if len(compras) > 5:
                        resposta += f"\n... e mais {len(compras) - 5} compra(s).\n"
                    
                    resposta += "\n_Resposta: Mendes_"
                    return resposta
                except Exception as e:
                    logger.error(f"[DEBUG] Erro ao calcular totais: {str(e)}")
                    return "Erro ao processar os dados das compras.\n\n_Resposta: Mendes_"
            
            elif tipo == "vendas":
                logger.info("[DEBUG] Formatando resposta de vendas")
                # Verifica se é um dicionário com a chave 'vendas' ou uma lista direta
                vendas = dados_resposta.get("vendas", []) if isinstance(dados_resposta, dict) else dados_resposta
                
                if not vendas:
                    logger.info("[DEBUG] Nenhuma venda encontrada")
                    return "Não foram encontradas vendas no período.\n\n_Resposta: Mendes_"
                
                try:
                    # Calcula o total de vendas
                    total_vendas = sum(float(venda.get("ecf_total", 0)) for venda in vendas)
                    
                    # Formata a resposta
                    resposta = f"Total vendido: R$ {total_vendas:,.2f}\n"
                    resposta += f"Quantidade de vendas: {len(vendas)}\n\n"
                    
                    # Adiciona detalhes das vendas
                    vendas_formatadas = 0
                    for venda in vendas[:5]:  # Mostra apenas as 5 primeiras vendas
                        try:
                            data = venda.get("ecf_data", "").split("T")[0] if venda.get("ecf_data") else "Data não informada"
                            valor = float(venda.get("ecf_total", 0))
                            cliente = venda.get("nome", "Cliente não informado")
                            resposta += f"- {data}: R$ {valor:,.2f} ({cliente})\n"
                            vendas_formatadas += 1
                        except Exception as e:
                            logger.error(f"[DEBUG] Erro ao formatar venda: {str(e)}")
                            logger.error(f"[DEBUG] Dados da venda: {venda}")
                            continue
                    
                    logger.info(f"[DEBUG] {vendas_formatadas} vendas formatadas com sucesso")
                    
                    if len(vendas) > 5:
                        resposta += f"\n... e mais {len(vendas) - 5} venda(s).\n"
                    
                    resposta += "\n_Resposta: Mendes_"
                    return resposta
                except Exception as e:
                    logger.error(f"[DEBUG] Erro ao calcular totais: {str(e)}")
                    return "Erro ao processar os dados das vendas.\n\n_Resposta: Mendes_"
            
            elif tipo == "top_vendedores":
                logger.info("[DEBUG] Formatando resposta de top vendedores")
                # Trata o objeto TopVendedoresResponse
                if hasattr(dados_resposta, "top_vendedores"):
                    vendedores = dados_resposta.top_vendedores
                    logger.info(f"[DEBUG] Vendedores extraídos do objeto TopVendedoresResponse: {len(vendedores)} vendedores")
                else:
                    vendedores = dados_resposta if isinstance(dados_resposta, list) else []
                    logger.info(f"[DEBUG] Vendedores da lista direta: {len(vendedores)} vendedores")
                
                if not vendedores:
                    logger.info("[DEBUG] Nenhum vendedor encontrado")
                    return "Não foram encontrados vendedores no período.\n\n_Resposta: Mendes_"
                
                logger.info(f"[DEBUG] Primeiro vendedor para referência: {vendedores[0]}")
                
                resposta = "📊 Top Vendedores:\n\n"
                vendedores_formatados = 0
                
                for i, vendedor in enumerate(vendedores[:5], 1):
                    try:
                        logger.info(f"[DEBUG] Formatando vendedor {i}: {vendedor}")
                        nome = vendedor.nome if hasattr(vendedor, "nome") else vendedor.get("nome", "Nome não informado")
                        total = float(vendedor.total if hasattr(vendedor, "total") else vendedor.get("total", 0))
                        qtde = int(vendedor.qtde_vendas if hasattr(vendedor, "qtde_vendas") else vendedor.get("qtde_vendas", 0))
                        meta = float(vendedor.meta if hasattr(vendedor, "meta") else vendedor.get("meta", 50000.00))
                        
                        resposta += f"{i}. {nome}:\n"
                        resposta += f"   💰 Total: R$ {total:,.2f}\n"
                        resposta += f"   📊 Vendas: {qtde}\n"
                        resposta += f"   🎯 Meta: R$ {meta:,.2f}\n\n"
                        vendedores_formatados += 1
                    except ValueError as e:
                        logger.error(f"[DEBUG] Erro ao converter valor no vendedor {i}: {e}")
                        continue
                    except Exception as e:
                        logger.error(f"[DEBUG] Erro ao formatar vendedor {i}: {str(e)}")
                        logger.error(f"[DEBUG] Dados do vendedor: {vendedor}")
                        continue
                
                logger.info(f"[DEBUG] {vendedores_formatados} vendedores formatados com sucesso")
                
                if len(vendedores) > 5:
                    resposta += f"\n... e mais {len(vendedores) - 5} vendedor(es).\n"
                
                resposta += "\n_Resposta: Mendes_"
                return resposta
            
            elif tipo == "top_clientes":
                logger.info("[DEBUG] Formatando resposta de top clientes")
                # Trata o objeto TopClientesResponse
                if hasattr(dados_resposta, "top_clientes"):
                    clientes = dados_resposta.top_clientes
                    logger.info(f"[DEBUG] Clientes extraídos do objeto TopClientesResponse: {len(clientes)} clientes")
                else:
                    clientes = dados_resposta if isinstance(dados_resposta, list) else []
                    logger.info(f"[DEBUG] Clientes da lista direta: {len(clientes)} clientes")
                
                if not clientes:
                    logger.info("[DEBUG] Nenhum cliente encontrado")
                    return "Não foram encontrados clientes no período.\n\n_Resposta: Mendes_"
                
                logger.info(f"[DEBUG] Primeiro cliente para referência: {clientes[0]}")
                
                resposta = "📊 Top Clientes:\n\n"
                clientes_formatados = 0
                
                for i, cliente in enumerate(clientes[:5], 1):
                    try:
                        logger.info(f"[DEBUG] Formatando cliente {i}: {cliente}")
                        nome = cliente.nome if hasattr(cliente, "nome") else cliente.get("nome", "Nome não informado")
                        total = float(cliente.total if hasattr(cliente, "total") else cliente.get("total", 0))
                        qtde = int(cliente.qtde_compras if hasattr(cliente, "qtde_compras") else cliente.get("qtde_compras", 0))
                        cidade = cliente.cidade if hasattr(cliente, "cidade") else cliente.get("cidade", "")
                        uf = cliente.uf if hasattr(cliente, "uf") else cliente.get("uf", "")
                        
                        local = f" ({cidade}/{uf})" if cidade and uf else ""
                        resposta += f"{i}. {nome}{local}:\n"
                        resposta += f"   💰 R$ {total:,.2f} em {qtde} compra(s)\n\n"
                        clientes_formatados += 1
                    except ValueError as e:
                        logger.error(f"[DEBUG] Erro ao converter valor no cliente {i}: {e}")
                        continue
                    except Exception as e:
                        logger.error(f"[DEBUG] Erro ao formatar cliente {i}: {str(e)}")
                        logger.error(f"[DEBUG] Dados do cliente: {cliente}")
                        continue
                
                logger.info(f"[DEBUG] {clientes_formatados} clientes formatados com sucesso")
                
                if len(clientes) > 5:
                    resposta += f"\n... e mais {len(clientes) - 5} cliente(s).\n"
                
                resposta += "\n_Resposta: Mendes_"
                return resposta
            
            elif tipo == "top_produtos":
                logger.info("[DEBUG] Formatando resposta de top produtos")
                produtos = dados_resposta if isinstance(dados_resposta, list) else []
                if not produtos:
                    logger.info("[DEBUG] Nenhum produto encontrado")
                    return "Não foram encontrados produtos no período.\n\n_Resposta: Mendes_"
                logger.info(f"[DEBUG] {len(produtos)} produtos encontrados")
                resposta = "📊 Top Produtos Mais Vendidos:\n\n"
                produtos_formatados = 0
                for i, produto in enumerate(produtos[:5], 1):
                    try:
                        codigo = produto.get('PRO_CODIGO', produto.get('codigo', ''))
                        descricao = produto.get('PRO_DESCRICAO', produto.get('descricao', 'Descrição não informada'))
                        total = float(produto.get('TOTAL', produto.get('total', 0)))
                        estoque = float(produto.get('ESTOQUE', produto.get('estoque', 0)))
                        resposta += f"{i}. {descricao} (Cód: {codigo}):\n"
                        resposta += f"   💰 Total vendido: R$ {total:,.2f}\n"
                        resposta += f"   📦 Estoque atual: {estoque}\n\n"
                        produtos_formatados += 1
                    except Exception as e:
                        logger.error(f"[DEBUG] Erro ao formatar produto {i}: {str(e)}")
                        logger.error(f"[DEBUG] Dados do produto: {produto}")
                        continue
                logger.info(f"[DEBUG] {produtos_formatados} produtos formatados com sucesso")
                if len(produtos) > 5:
                    resposta += f"\n... e mais {len(produtos) - 5} produto(s).\n"
                resposta += "\n_Resposta: Mendes_"
                return resposta
            return (
                "Não entendi sua pergunta. Pode reformular?\n"
                "Exemplos de perguntas válidas:\n"
                "- Produtos que chegaram na empresa hoje\n"
                "- Produtos recebidos entre 01/06/2025 e 07/06/2025\n"
                "- Compras do produto X no mês passado\n"
                "Se precisar de ajuda, digite sua dúvida de outra forma!\n\n_Resposta: Mendes_"
            )

        except Exception as e:
            logger.error(f"[DEBUG] Erro ao formatar resposta: {str(e)}")
            return (
                "Desculpe, ocorreu um erro ao processar sua resposta. "
                "Verifique se o filtro digitado está correto.\n"
                "Exemplos de perguntas válidas:\n"
                "- Produtos que chegaram na empresa hoje\n"
                "- Produtos recebidos entre 01/06/2025 e 07/06/2025\n"
                "- Compras do produto X no mês passado\n"
                "Se precisar de ajuda, digite sua dúvida de outra forma!\n\n_Resposta: Mendes_"
            )

    async def generate_response(self, user_input: str, request: Request) -> str:
        # Resposta institucional para agradecimentos
        agradecimentos = ["obrigado", "obrigada", "valeu", "agradeço", "thanks", "thank you", "grato", "gratidao", "gratidão", "show", "obg"]
        if isinstance(user_input, str) and any(p in user_input.lower() for p in agradecimentos):
            return ("De nada! A IA Mendes está sempre sendo treinada para melhor atender seus desejos.\n"
                    "Se gostou da experiência, recomende à diretoria contratar a Mendes para soluções inteligentes!")

        """
        Gera uma resposta para a entrada do usuário.
        """
        try:
            logger.info(f"[DEBUG] Última pergunta: {self.ultima_pergunta}, Contexto produto: {self.contexto_produto}")

            # Limpar contexto se a nova pergunta não for continuação esperada
            tipo_consulta_temp = await self._identificar_tipo_consulta(user_input)
            if self.ultima_pergunta or self.contexto_produto:
                # Só mantém contexto se for confirmação de produto
                if not (self.ultima_pergunta == "produto" and tipo_consulta_temp and tipo_consulta_temp.get("tipo") == "compras"):
                    self.ultima_pergunta = None
                    self.contexto_produto = None

            # Agora segue normalmente
            tipo_consulta = tipo_consulta_temp
            
            # Identifica o tipo de consulta antes de qualquer lógica
            tipo_consulta = await self._identificar_tipo_consulta(user_input)

            # Se estávamos esperando confirmação de produto
            if self.ultima_pergunta == "produto" and self.contexto_produto:
                logger.info(f"[DEBUG] Recebida resposta para confirmação de produto: {user_input}")
                # Lista de possíveis respostas afirmativas
                respostas_afirmativas = ["sim", "yes", "s", "y", "ok", "correto", "isso", "exato"]
                resposta_lower = user_input.strip().lower()
                
                if resposta_lower in respostas_afirmativas:
                    logger.info(f"[DEBUG] Resposta afirmativa detectada, usando produto original: {self.contexto_produto}")
                    produto_final = self.contexto_produto
                else:
                    logger.info(f"[DEBUG] Usando nova resposta como produto: {user_input}")
                    produto_final = user_input.strip().upper()
                
                hoje = date.today()
                tipo_consulta = {
                    "tipo": "compras",
                    "data_inicial": (hoje - timedelta(days=7)).isoformat(),
                    "data_final": hoje.isoformat(),
                    "produto_filtro": produto_final
                }
                
                # Limpa o contexto ANTES de consultar, para evitar loop
                self.ultima_pergunta = None
                self.contexto_produto = None
                
                logger.info(f"[DEBUG] Consultando com tipo_consulta: {tipo_consulta}")
                dados = await self._obter_dados_relatorio(tipo_consulta, request)
                # Se ainda assim não houver dados, só retorna resposta padrão, sem pedir confirmação de novo
                if not dados:
                    return (
                        f"Não encontrei compras para o produto '{produto_final}'. "
                        "Verifique se o nome está correto ou tente outro produto."
                    )
                return await self._formatar_resposta(dados)

                # Novo bloco: tratamento para top_produtos
                if tipo_consulta.get("tipo") == "top_produtos":
                    logger.info(f"[DEBUG] Consulta identificada como top_produtos: {tipo_consulta}")
                    dados = await self._obter_dados_relatorio(tipo_consulta, request)
                    return await self._formatar_resposta(dados)
            else:
                # Se identificou algum tipo de consulta, trata aqui
                if tipo_consulta:
                    logger.info(f"[DEBUG] Tipo de consulta identificado: {tipo_consulta}")
                    dados = await self._obter_dados_relatorio(tipo_consulta, request)
                    return await self._formatar_resposta(dados)
                # Se não conseguiu identificar o tipo, considera como uma conversa geral
                # Aqui enviamos a pergunta diretamente para a OpenAI para obter uma resposta conversacional
                logger.info(f"[DEBUG] Tratando como conversação geral: '{user_input}'")
                
                nivel_usuario = "desconhecido"
                empresa = "desconhecida"
                usuario_nome = "desconhecido"
                usuario_email = "desconhecido"
                
                try:
                    auth_token = request.headers.get('Authorization', '')
                    if auth_token and auth_token.startswith('Bearer '):
                        token = auth_token.replace('Bearer ', '')
                        try:
                            from auth import SECRET_KEY, ALGORITHM
                            from jose import jwt
                            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                            nivel_usuario = payload.get('nivel', 'desconhecido')
                            usuario_nome = payload.get('nome', payload.get('email', 'desconhecido'))
                            usuario_email = payload.get('email', 'desconhecido')
                        except Exception as jwt_err:
                            logger.error(f"[IA] Erro ao decodificar JWT: {str(jwt_err)}")
                    empresa_codigo = request.headers.get('x-empresa-codigo', '')
                    if empresa_codigo:
                        # Buscar nome da empresa no banco se possível
                        try:
                            # Função dummy, substitua pela real se necessário
                            # from database import get_empresa_nome_by_codigo
                            # empresa_nome = await get_empresa_nome_by_codigo(empresa_codigo)
                            # if empresa_nome:
                            #     empresa = empresa_nome
                            # else:
                            #     empresa = empresa_codigo
                            empresa = empresa_codigo  # Fallback: só exibe o código
                        except Exception as emp_err:
                            logger.error(f"[IA] Erro ao buscar nome da empresa: {str(emp_err)}")
                            empresa = empresa_codigo
                except Exception as e:
                    logger.error(f"[DEBUG] Erro ao obter informações do usuário: {str(e)}")
                
                # Montar o contexto para a IA
                contexto = (
                    f"Usuário: {usuario_nome} (email: {usuario_email}, nível: {nivel_usuario})\n"
                    f"Empresa: {empresa}\n\nPergunta: {user_input}"
                )
                response = await self._client.chat.completions.create(
                    model=self._model,
                    messages=[
                        {"role": "system", "content": self._system_prompt},
                        {"role": "user", "content": contexto}
                    ]
                )
                return response.choices[0].message.content.strip()

        except Exception as e:
            logger.error(f"[DEBUG] Erro ao gerar resposta: {str(e)}")
            sugestoes = [
                "Produtos que chegaram na empresa hoje",
                "Produtos recebidos entre 01/06/2025 e 07/06/2025",
                "Compras do produto arroz no mês passado",
                "Top produtos do mês",
                "Top clientes da semana",
                "Vendas realizadas ontem"
            ]
            exemplos = '\n'.join(f'- {s}' for s in sugestoes)
            return (
                "Desculpe, não consegui entender sua pergunta ou não encontrei dados para sua solicitação.\n"
                "Veja alguns exemplos de perguntas que você pode fazer:\n"
                f"{exemplos}\n\n"
                "Ou, se preferir, posso mostrar um dos relatórios disponíveis. Qual deles você gostaria de ver?"
            )