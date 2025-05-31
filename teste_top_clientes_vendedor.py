#!/usr/bin/env python3
"""
Teste específico para verificar se TOP CLIENTES está filtrando por vendedor.
"""

import requests
import json
from datetime import date

# Configurações
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/auth/login"
TOP_CLIENTES_URL = f"{BASE_URL}/relatorios/top-clientes"
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

def testar_top_clientes(token, nome_usuario):
    """Testa o endpoint top-clientes"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-empresa-codigo": EMPRESA_CODIGO
    }
    
    try:
        print(f'\n🔍 Testando TOP CLIENTES para {nome_usuario}...')
        response = requests.get(TOP_CLIENTES_URL, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            clientes = data.get("top_clientes", [])
            
            print(f'✅ TOP CLIENTES - Resposta recebida!')
            print(f'   📊 Total de clientes: {len(clientes)}')
            print(f'   📅 Período: {data.get("data_inicial")} a {data.get("data_final")}')
            
            if clientes:
                print(f'\n📋 Lista de clientes:')
                total_geral = 0
                for i, cliente in enumerate(clientes, 1):
                    nome = cliente.get("nome", "N/A")
                    codigo = cliente.get("codigo", "N/A")
                    total = cliente.get("total", 0)
                    qtde = cliente.get("qtde_compras", 0)
                    cidade = cliente.get("cidade", "N/A")
                    total_geral += total
                    
                    print(f'   {i:2d}. {nome} (#{codigo}) - {cidade}')
                    print(f'       💰 R$ {total:,.2f} ({qtde} compras)')
                
                print(f'\n💰 Total geral dos clientes: R$ {total_geral:,.2f}')
            else:
                print(f'   ⚠️  Nenhum cliente encontrado!')
                
            return len(clientes), clientes
        else:
            print(f'❌ Erro: {response.status_code}')
            print(f'   📄 Resposta: {response.text[:300]}...')
            return 0, []
            
    except Exception as e:
        print(f'❌ Exceção: {e}')
        return 0, []

def main():
    """Função principal de teste"""
    print("🎯 TESTE ESPECÍFICO - TOP CLIENTES COM FILTRO DE VENDEDOR")
    print("=" * 60)
    
    # 1. Teste com VENDEDOR
    print("\n🔸 TESTE 1: LOGIN COMO VENDEDOR")
    print("-" * 40)
    token_vendedor, user_vendedor = fazer_login('vendedor1@solucao.com', '123')
    
    if token_vendedor:
        qtde_vendedor, clientes_vendedor = testar_top_clientes(token_vendedor, "VENDEDOR")
    else:
        print("❌ Não foi possível fazer login como vendedor")
        qtde_vendedor, clientes_vendedor = 0, []
    
    # 2. Teste com ADMIN (se possível)
    print("\n🔸 TESTE 2: LOGIN COMO ADMIN")
    print("-" * 40)
    token_admin, user_admin = fazer_login('admin@solucao.com', '123')
    
    if token_admin:
        qtde_admin, clientes_admin = testar_top_clientes(token_admin, "ADMIN")
    else:
        print("⚠️  Login como admin não disponível ou falhou")
        qtde_admin, clientes_admin = 0, []
    
    # 3. Análise comparativa
    print("\n🔍 ANÁLISE COMPARATIVA")
    print("=" * 30)
    print(f"👤 VENDEDOR: {qtde_vendedor} clientes")
    print(f"👔 ADMIN: {qtde_admin} clientes")
    
    if qtde_vendedor > 0 and qtde_admin > 0:
        if qtde_vendedor < qtde_admin:
            print("✅ FILTRO FUNCIONANDO! Vendedor vê menos clientes que admin.")
        elif qtde_vendedor == qtde_admin:
            print("⚠️  SUSPEITO: Vendedor vê a mesma quantidade que admin.")
            print("   🔧 Possível problema no filtro!")
        else:
            print("❌ ERRO: Vendedor vê mais clientes que admin (impossível).")
    elif qtde_vendedor > 0:
        print("✅ VENDEDOR tem clientes (admin indisponível para comparação)")
    elif qtde_admin > 0:
        print("⚠️  ADMIN tem clientes, mas vendedor não (verificar filtro)")
    else:
        print("❌ Nenhum resultado em ambos os testes")
    
    # 4. Recomendações
    print(f"\n💡 RECOMENDAÇÕES:")
    if qtde_vendedor == 0:
        print("   🔧 Verificar se o vendedor tem vendas no período")
        print("   🔧 Verificar logs do backend para debug")
        print("   🔧 Verificar se o filtro SQL está sendo aplicado")
    elif qtde_vendedor == qtde_admin and qtde_admin > 0:
        print("   🔧 Filtro pode não estar sendo aplicado corretamente")
        print("   🔧 Verificar função obter_filtro_vendedor()")
        print("   🔧 Verificar logs do backend")

if __name__ == "__main__":
    main() 