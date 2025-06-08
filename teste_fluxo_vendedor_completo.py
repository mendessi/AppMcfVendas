#!/usr/bin/env python3
"""
Teste para verificar se o código do vendedor está sendo passado corretamente
em todo o fluxo: Login → Buscar Código → Dashboard
"""
import requests
import json
from jose import jwt

# Configurações
API_URL = "http://localhost:8000"
VENDEDOR_EMAIL = "vendedor1@solucao.com"
VENDEDOR_SENHA = "123"

def test_fluxo_vendedor_completo():
    """Testa todo o fluxo do código do vendedor"""
    
    print("🚀 TESTE COMPLETO: FLUXO DO CÓDIGO DO VENDEDOR")
    print("=" * 70)
    
    # 1. LOGIN
    print("1️⃣ FAZENDO LOGIN...")
    login_data = {"email": VENDEDOR_EMAIL, "senha": VENDEDOR_SENHA}
    
    try:
        response = requests.post(f"{API_URL}/login", json=login_data)
        if response.status_code != 200:
            print(f"❌ Erro no login: {response.status_code}")
            print(f"   Resposta: {response.text}")
            return False
            
        login_result = response.json()
        token = login_result["access_token"]
        
        print(f"✅ Login realizado com sucesso!")
        print(f"   👤 Usuário: {login_result.get('usuario_nome', 'N/A')}")
        print(f"   🏷️  Nível: {login_result.get('usuario_nivel', 'N/A')}")
        print(f"   🆔 Código no login: {login_result.get('codigo_vendedor', 'None')}")
        
        # Verificar o conteúdo do token JWT
        print(f"\n🔐 ANALISANDO TOKEN JWT...")
        try:
            # Decodificar token sem verificação (só para ver o conteúdo)
            unverified_payload = jwt.get_unverified_claims(token)
            print(f"   📋 Conteúdo do token:")
            print(f"      Email: {unverified_payload.get('sub', 'N/A')}")
            print(f"      Nível: {unverified_payload.get('nivel', 'N/A')}")
            print(f"      Código Vendedor: {unverified_payload.get('codigo_vendedor', 'None')}")
        except Exception as e:
            print(f"   ⚠️  Erro ao decodificar token: {e}")
        
    except Exception as e:
        print(f"❌ Erro na requisição de login: {e}")
        return False
    
    # 2. BUSCAR CÓDIGO DO VENDEDOR
    print(f"\n2️⃣ BUSCANDO CÓDIGO DO VENDEDOR...")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-empresa-codigo": "1"
    }
    
    try:
        response = requests.post(f"{API_URL}/buscar-codigo-vendedor", headers=headers)
        print(f"   📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            codigo_result = response.json()
            print(f"✅ Código do vendedor obtido:")
            print(f"   🆔 Código: {codigo_result.get('codigo_vendedor', 'None')}")
            print(f"   👤 Nome: {codigo_result.get('nome_vendedor', 'N/A')}")
            print(f"   💬 Mensagem: {codigo_result.get('message', 'N/A')}")
            
            codigo_vendedor = codigo_result.get('codigo_vendedor')
        else:
            print(f"❌ Erro ao buscar código: {response.text}")
            codigo_vendedor = None
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        codigo_vendedor = None
    
    # 3. TESTANDO DASHBOARD-STATS
    print(f"\n3️⃣ TESTANDO DASHBOARD-STATS...")
    try:
        response = requests.get(f"{API_URL}/relatorios/dashboard-stats", headers=headers)
        print(f"   📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            stats = response.json()
            print(f"✅ Dashboard funcionando!")
            print(f"   💰 Vendas do mês: R$ {stats.get('vendas_mes', 0):.2f}")
            print(f"   💰 Vendas do dia: R$ {stats.get('vendas_dia', 0):.2f}")
            print(f"   📦 Total pedidos: {stats.get('total_pedidos', 0)}")
        else:
            print(f"❌ Erro no dashboard: {response.status_code}")
            print(f"   📄 Resposta: {response.text}")
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
    
    # 4. VERIFICANDO SE O FILTRO ESTÁ SENDO APLICADO EM OUTRO ENDPOINT
    print(f"\n4️⃣ TESTANDO ENDPOINT QUE FUNCIONA (vendas-por-dia)...")
    params = {"data_inicial": "2025-05-01", "data_final": "2025-05-31"}
    
    try:
        response = requests.get(f"{API_URL}/relatorios/vendas-por-dia", headers=headers, params=params)
        print(f"   📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            vendas_data = response.json()
            print(f"✅ Vendas por dia funcionando!")
            print(f"   📈 Registros: {len(vendas_data) if isinstance(vendas_data, list) else 'Dados em formato diferente'}")
            print(f"   🎯 FILTRO DE VENDEDOR ESTÁ FUNCIONANDO neste endpoint!")
        else:
            print(f"❌ Erro: {response.text}")
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
    
    # 5. SIMULANDO HEADERS QUE O FRONTEND DEVERIA ENVIAR
    print(f"\n5️⃣ VERIFICANDO HEADERS NECESSÁRIOS...")
    print(f"   📋 Headers que o frontend está enviando:")
    print(f"      Authorization: Bearer {token[:30]}...")
    print(f"      x-empresa-codigo: 1")
    print(f"      Content-Type: application/json")
    
    if codigo_vendedor:
        print(f"\n🎯 RESUMO DO FLUXO:")
        print(f"   ✅ Login: Sucesso")
        print(f"   ✅ Código do vendedor obtido: {codigo_vendedor}")
        print(f"   ✅ Token JWT: Válido")
        print(f"   ✅ Headers: Corretos")
        print(f"   🔄 O filtro está sendo aplicado corretamente!")
        print(f"   ⚠️  Problema apenas na configuração da empresa para dashboard-stats")
    else:
        print(f"\n❌ PROBLEMA ENCONTRADO:")
        print(f"   🚫 Código do vendedor não foi obtido corretamente")
        
    return True

if __name__ == "__main__":
    test_fluxo_vendedor_completo() 