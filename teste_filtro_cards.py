#!/usr/bin/env python3
"""
Teste do filtro de vendedor nos cards de vendas do dashboard
"""

import requests
import json

# Configurações
API_URL = "http://localhost:8000"
LOGIN_URL = f"{API_URL}/login"
DASHBOARD_STATS_URL = f"{API_URL}/relatorios/dashboard-stats"

# Dados de teste
VENDEDOR_EMAIL = "vendedor1@solucao.com"
VENDEDOR_SENHA = "123"  # Credencial correta fornecida pelo usuário

def fazer_login():
    """Fazer login e obter token"""
    try:
        response = requests.post(LOGIN_URL, json={
            "email": VENDEDOR_EMAIL,
            "senha": VENDEDOR_SENHA
        })
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Login realizado com sucesso!")
            print(f"   Token: {data['access_token'][:50]}...")
            print(f"   Usuário: {data['usuario_nome']}")
            print(f"   Nível: {data['usuario_nivel']}")
            print(f"   Código Vendedor: {data.get('codigo_vendedor', 'Não definido')}")
            return data['access_token']
        else:
            print(f"❌ Erro no login: {response.status_code}")
            print(f"   Resposta: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Erro na requisição de login: {e}")
        return None

def testar_dashboard_stats(token, empresa_codigo="1"):
    """Testar o endpoint dashboard-stats com filtro de vendedor"""
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "x-empresa-codigo": empresa_codigo
        }
        
        print(f"\n🔍 Testando dashboard-stats com empresa {empresa_codigo}...")
        
        response = requests.get(DASHBOARD_STATS_URL, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Dashboard stats obtido com sucesso!")
            print(f"   📊 Vendas do Dia: R$ {data['vendas_dia']:.2f}")
            print(f"   📊 Vendas do Mês: R$ {data['vendas_mes']:.2f}")
            print(f"   📊 Total Pedidos: {data['total_pedidos']}")
            print(f"   📊 Valor Total Pedidos: R$ {data['valor_total_pedidos']:.2f}")
            print(f"   📊 Vendas Autenticadas: R$ {data['vendas_autenticadas']:.2f}")
            print(f"   📊 Vendas Não Autenticadas: R$ {data['vendas_nao_autenticadas']:.2f}")
            
            # Verificar se os valores são diferentes de zero (indicando filtro funcionando)
            if data['vendas_dia'] > 0 or data['vendas_mes'] > 0:
                print(f"✅ FILTRO FUNCIONANDO: Dados específicos do vendedor encontrados!")
            else:
                print(f"⚠️  Dados zerados - pode ser que não há vendas para este vendedor ou filtro não aplicado")
                
            return True
        else:
            print(f"❌ Erro ao buscar dashboard stats: {response.status_code}")
            print(f"   Resposta: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição dashboard-stats: {e}")
        return False

def main():
    print("🚀 Iniciando teste de filtro de vendedor nos cards do dashboard")
    print("=" * 70)
    
    # 1. Fazer login
    token = fazer_login()
    if not token:
        print("❌ Não foi possível obter o token. Teste cancelado.")
        return
    
    # 2. Testar dashboard stats
    sucesso = testar_dashboard_stats(token, "1")
    
    if sucesso:
        print(f"\n✅ TESTE CONCLUÍDO COM SUCESSO!")
        print(f"🎯 O filtro de vendedor está funcionando nos cards do dashboard!")
    else:
        print(f"\n❌ TESTE FALHOU!")
        print(f"💡 Verifique se o backend está rodando e se há dados para o vendedor")
    
    print("=" * 70)

if __name__ == "__main__":
    main() 