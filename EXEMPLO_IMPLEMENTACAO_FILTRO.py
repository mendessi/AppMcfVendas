#!/usr/bin/env python3
"""
EXEMPLO PRÁTICO: Como implementar filtro de vendedor em novos endpoints

Este arquivo mostra exemplos práticos de como usar a função helper
obter_filtro_vendedor() em diferentes tipos de endpoints.
"""

from fastapi import APIRouter, Request, HTTPException
from typing import Optional
from datetime import date, timedelta

# Importar a função helper (já implementada em relatorios.py)
# from backend.relatorios import obter_filtro_vendedor

router = APIRouter()

# ===============================================================================
# EXEMPLO 1: Endpoint simples com filtro de vendedor
# ===============================================================================

@router.get("/exemplo-vendas-simples")
async def exemplo_vendas_simples(request: Request, data_inicial: Optional[str] = None):
    """
    EXEMPLO: Endpoint simples que lista vendas com filtro automático de vendedor
    """
    try:
        # 1. OBTER FILTRO AUTOMÁTICO (1 linha!)
        filtro_vendedor, filtro_aplicado, codigo_vendedor = await obter_filtro_vendedor(request)
        
        # 2. Definir datas padrão
        if not data_inicial:
            data_inicial = date.today().isoformat()
            
        # 3. USAR O FILTRO NA SQL
        sql = f"""
            SELECT 
                ECF_NUMERO,
                ECF_DATA,
                ECF_TOTAL,
                VEN_CODIGO
            FROM VENDAS
            WHERE ECF_CANCELADA = 'N'
            AND ECF_CONCLUIDA = 'S'
            AND CAST(ECF_DATA AS DATE) >= CAST(? AS DATE)
            {filtro_vendedor}  -- 🎯 FILTRO AUTOMÁTICO APLICADO AQUI!
            ORDER BY ECF_DATA DESC
        """
        
        # 4. Executar consulta
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        cursor.execute(sql, (data_inicial,))
        rows = cursor.fetchall()
        
        # 5. Processar resultados
        vendas = []
        for row in rows:
            vendas.append({
                "numero": row[0],
                "data": row[1].isoformat() if row[1] else None,
                "total": float(row[2] or 0),
                "vendedor": row[3]
            })
        
        # 6. Log do resultado
        if filtro_aplicado:
            print(f"✅ VENDAS FILTRADAS PARA VENDEDOR {codigo_vendedor}: {len(vendas)} registros")
        else:
            print(f"📊 VENDAS GERAIS (sem filtro): {len(vendas)} registros")
        
        conn.close()
        return {
            "vendas": vendas,
            "total_registros": len(vendas),
            "filtro_aplicado": filtro_aplicado,
            "vendedor_codigo": codigo_vendedor if filtro_aplicado else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")


# ===============================================================================
# EXEMPLO 2: Endpoint com aggregações (soma, count, etc.)
# ===============================================================================

@router.get("/exemplo-estatisticas-vendedor")
async def exemplo_estatisticas_vendedor(request: Request, 
                                      data_inicial: Optional[str] = None, 
                                      data_final: Optional[str] = None):
    """
    EXEMPLO: Endpoint com estatísticas agregadas respeitando filtro de vendedor
    """
    try:
        # 1. OBTER FILTRO AUTOMÁTICO
        filtro_vendedor, filtro_aplicado, codigo_vendedor = await obter_filtro_vendedor(request)
        
        # 2. Definir período padrão (mês atual)
        hoje = date.today()
        if not data_inicial:
            data_inicial = date(hoje.year, hoje.month, 1).isoformat()
        if not data_final:
            data_final = hoje.isoformat()
            
        # 3. MÚLTIPLAS CONSULTAS COM FILTRO
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        # Estatística 1: Total de vendas
        sql_total = f"""
            SELECT 
                COUNT(*) as QTDE_VENDAS,
                COALESCE(SUM(ECF_TOTAL), 0) as VALOR_TOTAL
            FROM VENDAS
            WHERE ECF_CANCELADA = 'N'
            AND ECF_CONCLUIDA = 'S'
            AND CAST(ECF_DATA AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
            {filtro_vendedor}  -- 🎯 FILTRO APLICADO
        """
        cursor.execute(sql_total, (data_inicial, data_final))
        row_total = cursor.fetchone()
        
        # Estatística 2: Ticket médio
        sql_ticket = f"""
            SELECT 
                AVG(ECF_TOTAL) as TICKET_MEDIO
            FROM VENDAS
            WHERE ECF_CANCELADA = 'N'
            AND ECF_CONCLUIDA = 'S'
            AND CAST(ECF_DATA AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
            {filtro_vendedor}  -- 🎯 FILTRO APLICADO
        """
        cursor.execute(sql_ticket, (data_inicial, data_final))
        row_ticket = cursor.fetchone()
        
        # Estatística 3: Clientes únicos atendidos
        sql_clientes = f"""
            SELECT 
                COUNT(DISTINCT CLI_CODIGO) as CLIENTES_UNICOS
            FROM VENDAS
            WHERE ECF_CANCELADA = 'N'
            AND ECF_CONCLUIDA = 'S'
            AND CAST(ECF_DATA AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
            {filtro_vendedor}  -- 🎯 FILTRO APLICADO
        """
        cursor.execute(sql_clientes, (data_inicial, data_final))
        row_clientes = cursor.fetchone()
        
        conn.close()
        
        # 4. Montar resposta
        estatisticas = {
            "periodo": {
                "data_inicial": data_inicial,
                "data_final": data_final
            },
            "vendas": {
                "quantidade": int(row_total[0] or 0),
                "valor_total": float(row_total[1] or 0),
                "ticket_medio": float(row_ticket[0] or 0),
                "clientes_unicos": int(row_clientes[0] or 0)
            },
            "filtro": {
                "aplicado": filtro_aplicado,
                "vendedor_codigo": codigo_vendedor if filtro_aplicado else None,
                "tipo": "vendedor_especifico" if filtro_aplicado else "todos_vendedores"
            }
        }
        
        # 5. Log detalhado
        if filtro_aplicado:
            print(f"✅ ESTATÍSTICAS DO VENDEDOR {codigo_vendedor}:")
            print(f"   📦 Vendas: {estatisticas['vendas']['quantidade']}")
            print(f"   💰 Valor: R$ {estatisticas['vendas']['valor_total']:.2f}")
            print(f"   🎯 Ticket médio: R$ {estatisticas['vendas']['ticket_medio']:.2f}")
        
        return estatisticas
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")


# ===============================================================================
# EXEMPLO 3: Endpoint que pode precisar desabilitar o filtro
# ===============================================================================

@router.get("/exemplo-relatorio-geral")
async def exemplo_relatorio_geral(request: Request, 
                                forcar_todos_vendedores: bool = False):
    """
    EXEMPLO: Endpoint que pode opcionalmente ignorar o filtro de vendedor
    (útil para relatórios gerenciais)
    """
    try:
        # 1. OBTER FILTRO, MAS PERMITIR OVERRIDE
        if forcar_todos_vendedores:
            # Administrador quer ver todos os vendedores
            filtro_vendedor = ""
            filtro_aplicado = False
            codigo_vendedor = "TODOS"
            print("🔓 FILTRO DESABILITADO - Visualizando todos os vendedores")
        else:
            # Comportamento normal
            filtro_vendedor, filtro_aplicado, codigo_vendedor = await obter_filtro_vendedor(request)
        
        # 2. CONSULTA ADAPTATIVA
        sql = f"""
            SELECT 
                V.VEN_CODIGO,
                VEN.VEN_NOME,
                COUNT(*) as QTDE_VENDAS,
                COALESCE(SUM(V.ECF_TOTAL), 0) as TOTAL_VENDAS
            FROM VENDAS V
            LEFT JOIN VENDEDOR VEN ON V.VEN_CODIGO = VEN.VEN_CODIGO
            WHERE V.ECF_CANCELADA = 'N'
            AND V.ECF_CONCLUIDA = 'S'
            AND CAST(V.ECF_DATA AS DATE) >= CAST(? AS DATE)
            {filtro_vendedor}  -- 🎯 PODE OU NÃO TER FILTRO
            GROUP BY V.VEN_CODIGO, VEN.VEN_NOME
            ORDER BY TOTAL_VENDAS DESC
        """
        
        # 3. Executar e processar
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        cursor.execute(sql, (date.today().replace(day=1).isoformat(),))
        rows = cursor.fetchall()
        
        vendedores = []
        for row in rows:
            vendedores.append({
                "codigo": row[0],
                "nome": row[1] or f"Vendedor {row[0]}",
                "quantidade_vendas": int(row[2]),
                "total_vendas": float(row[3])
            })
        
        conn.close()
        
        return {
            "vendedores": vendedores,
            "modo_visualizacao": "todos" if forcar_todos_vendedores else ("filtrado" if filtro_aplicado else "geral"),
            "vendedor_logado": codigo_vendedor if filtro_aplicado else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")


# ===============================================================================
# EXEMPLO 4: Template para novos endpoints
# ===============================================================================

@router.get("/template-novo-endpoint")
async def template_novo_endpoint(request: Request, 
                               data_inicial: Optional[str] = None,
                               data_final: Optional[str] = None):
    """
    TEMPLATE: Use este modelo para criar novos endpoints com filtro de vendedor
    
    PASSOS:
    1. Copie este template
    2. Modifique a SQL conforme sua necessidade
    3. Ajuste o processamento dos dados
    4. Teste com vendedor e administrador
    """
    try:
        # PASSO 1: SEMPRE começar com isso ⬇️
        filtro_vendedor, filtro_aplicado, codigo_vendedor = await obter_filtro_vendedor(request)
        
        # PASSO 2: Configurar parâmetros do endpoint
        hoje = date.today()
        if not data_inicial:
            data_inicial = hoje.replace(day=1).isoformat()
        if not data_final:
            data_final = hoje.isoformat()
        
        # PASSO 3: Construir SQL com filtro ⬇️
        sql = f"""
            SELECT 
                -- Seus campos aqui
                ECF_NUMERO,
                ECF_DATA,
                ECF_TOTAL
            FROM VENDAS
            WHERE ECF_CANCELADA = 'N'
            AND ECF_CONCLUIDA = 'S'
            -- Suas condições aqui
            AND CAST(ECF_DATA AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
            {filtro_vendedor}  -- 🎯 SEMPRE incluir esta linha!
            -- Sua ordenação aqui
            ORDER BY ECF_DATA DESC
        """
        
        # PASSO 4: Executar consulta
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        cursor.execute(sql, (data_inicial, data_final))
        rows = cursor.fetchall()
        
        # PASSO 5: Processar dados conforme necessário
        dados = []
        for row in rows:
            dados.append({
                "numero": row[0],
                "data": row[1].isoformat() if row[1] else None,
                "total": float(row[2] or 0)
                # Adicione seus campos aqui
            })
        
        conn.close()
        
        # PASSO 6: SEMPRE incluir logs ⬇️
        if filtro_aplicado:
            print(f"✅ DADOS FILTRADOS PARA VENDEDOR {codigo_vendedor}: {len(dados)} registros")
        else:
            print(f"📊 DADOS GERAIS (sem filtro): {len(dados)} registros")
        
        # PASSO 7: Retornar dados com informações do filtro
        return {
            "dados": dados,
            "periodo": {"data_inicial": data_inicial, "data_final": data_final},
            "filtro_info": {
                "aplicado": filtro_aplicado,
                "vendedor_codigo": codigo_vendedor if filtro_aplicado else None,
                "total_registros": len(dados)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")


# ===============================================================================
# CHECKLIST PARA IMPLEMENTAÇÃO
# ===============================================================================

"""
📋 CHECKLIST PARA NOVOS ENDPOINTS COM FILTRO DE VENDEDOR:

✅ 1. Importar: from backend.relatorios import obter_filtro_vendedor
✅ 2. Adicionar: filtro_vendedor, filtro_aplicado, codigo_vendedor = await obter_filtro_vendedor(request)
✅ 3. Incluir na SQL: {filtro_vendedor}
✅ 4. Adicionar logs: if filtro_aplicado: log.info(...)
✅ 5. Testar com vendedor e administrador
✅ 6. Verificar se valores estão corretos
✅ 7. Documentar o endpoint

🚫 NÃO FAZER:
❌ Não implementar filtro próprio
❌ Não hardcodar códigos de vendedor  
❌ Não expor dados de outros vendedores
❌ Não esquecer de testar
""" 