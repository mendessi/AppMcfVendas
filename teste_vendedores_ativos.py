#!/usr/bin/env python3
"""
Teste para verificar se os vendedores ativos estão sendo listados corretamente.
"""

import requests
import json

# Configurações
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/auth/login"
VENDEDORES_URL = f"{BASE_URL}/relatorios/listar_vendedores"
EMPRESA_CODIGO = "1"

def fazer_login():
    """Faz login e retorna o token"""
    login_data = {'username': 'admin@solucao.com', 'password': '123'}
    
    try:
        print(f'🔐 Fazendo login...')
        response = requests.post(LOGIN_URL, json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token')
            print(f'✅ Login bem-sucedido!')
            return token
        else:
            print(f'❌ Erro no login: {response.status_code} - {response.text}')
            return None
            
    except Exception as e:
        print(f'❌ Erro na requisição de login: {e}')
        return None

def testar_vendedores(token):
    """Testa o endpoint de vendedores"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-empresa-codigo": EMPRESA_CODIGO
    }
    
    try:
        print(f'\n🔍 Testando LISTAGEM DE VENDEDORES...')
        print(f'   🌐 URL: {VENDEDORES_URL}')
        
        response = requests.get(VENDEDORES_URL, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f'✅ VENDEDORES - Resposta recebida!')
            print(f'   📊 Total de vendedores: {len(data)}')
            
            if data:
                print(f'\n📋 Lista de vendedores:')
                for i, vendedor in enumerate(data, 1):
                    codigo = vendedor.get('VEN_CODIGO', 'N/A')
                    nome = vendedor.get('VEN_NOME', 'N/A')
                    print(f'   {i:2d}. #{codigo} - {nome}')
                    
                # Verificar formato da resposta
                if data and isinstance(data[0], dict):
                    primeiro = data[0]
                    print(f'\n🔍 FORMATO DA RESPOSTA:')
                    print(f'   🔑 Chaves disponíveis: {list(primeiro.keys())}')
                    print(f'   📝 Primeiro vendedor: {primeiro}')
                    
                    # Verificar se tem as chaves corretas
                    if 'VEN_CODIGO' in primeiro and 'VEN_NOME' in primeiro:
                        print(f'   ✅ Formato correto: VEN_CODIGO e VEN_NOME presentes')
                    else:
                        print(f'   ❌ Formato incorreto: Chaves esperadas não encontradas')
                        
            else:
                print(f'   ⚠️  Nenhum vendedor encontrado!')
                
            return len(data), data
        else:
            print(f'❌ Erro: {response.status_code}')
            print(f'   📄 Resposta: {response.text[:300]}...')
            return 0, []
            
    except Exception as e:
        print(f'❌ Exceção: {e}')
        return 0, []

def main():
    """Função principal de teste"""
    print("🎯 TESTE DOS VENDEDORES ATIVOS")
    print("=" * 40)
    
    # 1. Fazer login
    token = fazer_login()
    
    if token:
        qtde, vendedores = testar_vendedores(token)
        
        print(f"\n💡 RESUMO:")
        print(f"   📊 Total de vendedores ativos: {qtde}")
        
        if qtde == 0:
            print(f"   ⚠️  Nenhum vendedor ativo encontrado")
            print(f"   🔧 Verifique se há vendedores com ven_ativo = 0 na base")
        elif qtde > 0:
            print(f"   ✅ Vendedores encontrados e disponíveis para filtro")
            
        print(f"\n🛠️  PRÓXIMOS PASSOS:")
        print("   1. Se lista vazia: verificar campo ven_ativo na tabela VENDEDOR")
        print("   2. Se formato incorreto: verificar se chaves VEN_CODIGO/VEN_NOME estão corretas")
        print("   3. Testar no frontend: dropdown deve mostrar esses vendedores")
        
    else:
        print("❌ Não foi possível fazer login - backend pode não estar rodando")

if __name__ == "__main__":
    main() 