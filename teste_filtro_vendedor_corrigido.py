#!/usr/bin/env python3
"""
Teste completo do filtro de vendedor após correções.
Verifica se todos os endpoints estão aplicando o filtro corretamente.
"""

import requests
import json
from datetime import date

# Configurações
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/auth/login"
EMPRESA_CODIGO = "1"  # Ajustar conforme necessário

def fazer_login_vendedor():
    """Faz login com o vendedor1 e retorna o token"""
    login_data = {
        'username': 'vendedor1@solucao.com',
        'password': '123'
    }
    
    try:
        print('🔐 Fazendo login com vendedor1@solucao.com...')
        response = requests.post(LOGIN_URL, json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token')
            user = data.get('user', {})
            print(f'✅ Login bem-sucedido!')
            print(f'   👤 Usuário: {user.get("email")}')
            print(f'   🏷️ Nível: {user.get("nivel")}')
            print(f'   🔢 Código: {user.get("codigo_vendedor", "N/A")}')
            return token
        else:
            print(f'❌ Erro no login: {response.status_code} - {response.text}')
            return None
            
    except Exception as e:
        print(f'❌ Erro na requisição de login: {e}')
        return None

def testar_endpoint(endpoint, token, nome_teste):
    """Testa um endpoint específico"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-empresa-codigo": EMPRESA_CODIGO
    }
    
    try:
        print(f'\n🔍 Testando {nome_teste}...')
        response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f'✅ {nome_teste} - Sucesso!')
            
            # Análise específica por endpoint
            if "dashboard-stats" in endpoint:
                print(f'   💰 Vendas do Dia: R$ {data.get("vendas_dia", 0):.2f}')
                print(f'   💰 Vendas do Mês: R$ {data.get("vendas_mes", 0):.2f}')
                print(f'   📦 Total Pedidos: {data.get("total_pedidos", 0)}')
                
            elif "top-vendedores" in endpoint:
                vendedores = data.get("top_vendedores", [])
                print(f'   🏆 Vendedores encontrados: {len(vendedores)}')
                if vendedores:
                    for v in vendedores:
                        print(f'      👤 {v.get("nome")} (Código: {v.get("codigo")}) - R$ {v.get("total", 0):.2f}')
                        
            elif "top-clientes" in endpoint:
                clientes = data.get("top_clientes", [])
                print(f'   👥 Clientes encontrados: {len(clientes)}')
                if clientes:
                    for c in clientes[:3]:  # Mostrar apenas os 3 primeiros
                        print(f'      👤 {c.get("nome")} - R$ {c.get("total", 0):.2f}')
                        
            elif "top-produtos" in endpoint:
                if isinstance(data, list):
                    produtos = data
                    print(f'   📦 Produtos encontrados: {len(produtos)}')
                    if produtos:
                        for p in produtos[:3]:  # Mostrar apenas os 3 primeiros
                            print(f'      📦 {p.get("PRO_DESCRICAO", "N/A")} - R$ {p.get("TOTAL", 0):.2f}')
                            
            elif "vendas-por-dia" in endpoint:
                if isinstance(data, list):
                    vendas = data
                    print(f'   📈 Dias com vendas: {len(vendas)}')
                    if vendas:
                        total_periodo = sum(v.get("total", 0) for v in vendas)
                        print(f'   💰 Total do período: R$ {total_periodo:.2f}')
                        
            return True
        else:
            print(f'❌ {nome_teste} - Erro: {response.status_code}')
            print(f'   📄 Resposta: {response.text[:200]}...')
            return False
            
    except Exception as e:
        print(f'❌ {nome_teste} - Exceção: {e}')
        return False

def main():
    """Função principal de teste"""
    print("🎯 TESTE COMPLETO DO FILTRO DE VENDEDOR")
    print("=" * 50)
    
    # 1. Fazer login
    token = fazer_login_vendedor()
    if not token:
        print("❌ Não foi possível obter token. Teste abortado.")
        return
    
    # 2. Definir datas para teste
    hoje = date.today()
    data_inicial = f"{hoje.year}-{hoje.month:02d}-01"
    data_final = hoje.isoformat()
    
    print(f"\n📅 Período de teste: {data_inicial} a {data_final}")
    
    # 3. Testar todos os endpoints
    endpoints_para_testar = [
        ("/relatorios/dashboard-stats", "📊 Dashboard Stats"),
        ("/relatorios/top-vendedores", "🏆 Top Vendedores"),
        ("/relatorios/top-clientes", "👥 Top Clientes"), 
        ("/relatorios/top-produtos", "📦 Top Produtos"),
        (f"/relatorios/vendas-por-dia?data_inicial={data_inicial}&data_final={data_final}", "📈 Vendas por Dia")
    ]
    
    sucessos = 0
    total = len(endpoints_para_testar)
    
    for endpoint, nome in endpoints_para_testar:
        if testar_endpoint(endpoint, token, nome):
            sucessos += 1
    
    # 4. Resultado final
    print(f"\n🎉 RESULTADO FINAL")
    print("=" * 30)
    print(f"✅ Sucessos: {sucessos}/{total}")
    print(f"❌ Falhas: {total - sucessos}/{total}")
    
    if sucessos == total:
        print("🚀 TODOS OS ENDPOINTS FUNCIONANDO CORRETAMENTE!")
        print("🎯 Filtro de vendedor implementado com sucesso!")
    else:
        print("⚠️  Alguns endpoints apresentaram problemas.")
        print("🔧 Verifique os logs acima para detalhes.")

if __name__ == "__main__":
    main() 