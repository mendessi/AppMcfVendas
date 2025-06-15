#!/usr/bin/env python3
"""
Teste específico para verificar se o FILTRO DE VENDEDOR na LISTAGEM DE VENDAS está funcionando.
"""

import requests
import json
from datetime import date

# Configurações
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/auth/login"
VENDAS_URL = f"{BASE_URL}/relatorios/vendas"
EMPRESA_CODIGO = "1"

def fazer_login(email, senha):
    """Faz login e retorna o token"""
    login_data = {'username': email, 'password': senha}
    
    try:
        print(f'🔐 Fazendo login com {email}...')
        response = requests.post(LOGIN_URL, json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token')
            user = data.get('user', {})
            print(f'✅ Login bem-sucedido!')
            print(f'   👤 Usuário: {user.get("email")}')
            print(f'   🏷️ Nível: {user.get("nivel")}')
            print(f'   🔢 Código: {user.get("codigo_vendedor", "N/A")}')
            return token, user
        else:
            print(f'❌ Erro no login: {response.status_code} - {response.text}')
            return None, None
            
    except Exception as e:
        print(f'❌ Erro na requisição de login: {e}')
        return None, None

def testar_listagem_vendas(token, nome_usuario, vendedor_codigo=None):
    """Testa o endpoint de listagem de vendas"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-empresa-codigo": EMPRESA_CODIGO
    }
    
    # Montar URL com filtros
    params = []
    
    # Adicionar período (últimos 30 dias)
    hoje = date.today()
    data_inicial = date(hoje.year, hoje.month, 1).isoformat()  # Primeiro dia do mês
    data_final = hoje.isoformat()  # Hoje
    
    params.append(f"data_inicial={data_inicial}")
    params.append(f"data_final={data_final}")
    
    # Adicionar filtro de vendedor se especificado
    if vendedor_codigo:
        params.append(f"vendedor_codigo={vendedor_codigo}")
    
    url = f"{VENDAS_URL}?{'&'.join(params)}"
    
    try:
        print(f'\n🔍 Testando LISTAGEM DE VENDAS para {nome_usuario}...')
        print(f'   📅 Período: {data_inicial} a {data_final}')
        print(f'   🎯 Vendedor: {vendedor_codigo or "TODOS"}')
        print(f'   🌐 URL: {url}')
        
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f'✅ LISTAGEM DE VENDAS - Resposta recebida!')
            
            # Verificar se é resposta nova (objeto) ou antiga (array)
            if isinstance(data, dict) and 'vendas' in data:
                # Resposta nova
                vendas = data['vendas']
                filtro_aplicado = data.get('filtro_vendedor_aplicado', False)
                codigo_vendedor = data.get('codigo_vendedor', '')
                vendedor_selecionado = data.get('vendedor_selecionado', '')
                total_registros = data.get('total_registros', len(vendas))
                
                print(f'   📊 Total de vendas: {total_registros}')
                print(f'   🎯 Filtro vendedor aplicado: {filtro_aplicado}')
                print(f'   👤 Código vendedor: {codigo_vendedor}')
                print(f'   🔍 Vendedor selecionado: {vendedor_selecionado}')
            else:
                # Resposta antiga (array direto)
                vendas = data if isinstance(data, list) else []
                filtro_aplicado = None
                print(f'   📊 Total de vendas: {len(vendas)} (resposta formato antigo)')
            
            if vendas:
                print(f'\n📋 Primeiras 5 vendas:')
                for i, venda in enumerate(vendas[:5], 1):
                    numero = venda.get('ecf_numero', 'N/A')
                    cliente = venda.get('nome', 'N/A')
                    valor = venda.get('ecf_total', 0)
                    vendedor_nome = venda.get('ven_nome', 'N/A')
                    vendedor_cod = venda.get('ven_codigo', 'N/A')
                    data_venda = venda.get('ecf_data', 'N/A')
                    
                    print(f'   {i:2d}. Venda #{numero} - {cliente}')
                    print(f'       💰 R$ {valor:,.2f} - Vendedor: {vendedor_nome} (#{vendedor_cod})')
                    print(f'       📅 Data: {data_venda}')
                
                # Verificar se todas as vendas são do mesmo vendedor (se filtro aplicado)
                vendedores_unicos = set()
                for venda in vendas:
                    cod = venda.get('ven_codigo')
                    if cod:
                        vendedores_unicos.add(str(cod))
                
                print(f'\n🎯 ANÁLISE:')
                print(f'   👥 Vendedores únicos na lista: {len(vendedores_unicos)}')
                print(f'   📝 Códigos: {", ".join(sorted(vendedores_unicos)) if vendedores_unicos else "Nenhum"}')
                
                if len(vendedores_unicos) == 1:
                    vendedor_unico = list(vendedores_unicos)[0]
                    print(f'   ✅ FILTRO FUNCIONANDO: Apenas vendedor {vendedor_unico} nas vendas')
                elif len(vendedores_unicos) > 1:
                    print(f'   ⚠️  MÚLTIPLOS VENDEDORES: Pode indicar que filtro não está ativo')
                else:
                    print(f'   ❓ Nenhum código de vendedor encontrado nas vendas')
            else:
                print(f'   ⚠️  Nenhuma venda encontrada no período!')
                
            return len(vendas), vendas
        else:
            print(f'❌ Erro: {response.status_code}')
            print(f'   📄 Resposta: {response.text[:300]}...')
            return 0, []
            
    except Exception as e:
        print(f'❌ Exceção: {e}')
        return 0, []

def main():
    """Função principal de teste"""
    print("🎯 TESTE DO FILTRO DE VENDEDOR - LISTAGEM DE VENDAS")
    print("=" * 60)
    
    # 1. Teste com VENDEDOR
    print("\n🔸 TESTE 1: LOGIN COMO VENDEDOR")
    print("-" * 40)
    token_vendedor, user_vendedor = fazer_login('vendedor1@solucao.com', '123')
    
    if token_vendedor:
        qtde_vendedor, vendas_vendedor = testar_listagem_vendas(token_vendedor, "VENDEDOR")
    else:
        print("❌ Não foi possível fazer login como vendedor")
        qtde_vendedor, vendas_vendedor = 0, []
    
    # 2. Teste com ADMIN sem filtro
    print("\n🔸 TESTE 2: LOGIN COMO ADMIN (TODOS OS VENDEDORES)")
    print("-" * 40)
    token_admin, user_admin = fazer_login('admin@solucao.com', '123')
    
    if token_admin:
        qtde_admin_todos, vendas_admin_todos = testar_listagem_vendas(token_admin, "ADMIN - TODOS")
    else:
        print("⚠️  Login como admin não disponível ou falhou")
        qtde_admin_todos, vendas_admin_todos = 0, []
    
    # 3. Teste com ADMIN filtrando por vendedor específico
    print("\n🔸 TESTE 3: LOGIN COMO ADMIN (FILTRO VENDEDOR 08)")
    print("-" * 40)
    
    if token_admin:
        qtde_admin_filtrado, vendas_admin_filtrado = testar_listagem_vendas(
            token_admin, "ADMIN - VENDEDOR 08", vendedor_codigo="08"
        )
    else:
        qtde_admin_filtrado, vendas_admin_filtrado = 0, []
    
    # 4. Análise comparativa
    print("\n🔍 ANÁLISE COMPARATIVA")
    print("=" * 30)
    print(f"👤 VENDEDOR (filtro automático): {qtde_vendedor} vendas")
    print(f"👔 ADMIN - TODOS: {qtde_admin_todos} vendas")
    print(f"👔 ADMIN - VENDEDOR 08: {qtde_admin_filtrado} vendas")
    
    # 5. Verificações
    print(f"\n💡 VERIFICAÇÕES:")
    
    if qtde_vendedor > 0 and qtde_admin_filtrado > 0:
        if qtde_vendedor == qtde_admin_filtrado:
            print("✅ FILTRO CONSISTENTE: Vendedor e Admin com filtro têm mesma quantidade")
        else:
            print(f"⚠️  DIFERENÇA: Vendedor ({qtde_vendedor}) vs Admin filtrado ({qtde_admin_filtrado})")
    
    if qtde_admin_todos > 0 and qtde_admin_filtrado > 0:
        if qtde_admin_todos > qtde_admin_filtrado:
            print("✅ FILTRO FUNCIONANDO: Admin vê mais vendas sem filtro que com filtro")
        elif qtde_admin_todos == qtde_admin_filtrado:
            print("⚠️  FILTRO SUSPEITO: Admin vê mesma quantidade com e sem filtro")
    
    if qtde_vendedor == 0:
        print("⚠️  Vendedor não tem vendas no período ou filtro não está funcionando")
    
    # 6. Recomendações
    print(f"\n🛠️  PRÓXIMOS PASSOS:")
    print("   1. Verificar logs do backend durante os testes")
    print("   2. Testar interface frontend em http://localhost:3001/pedidos")
    print("   3. Verificar se dropdown de vendedores aparece para ADMIN")
    print("   4. Verificar se dropdown fica bloqueado para VENDEDOR")

if __name__ == "__main__":
    main() 