import requests
import json

# Teste de login com vendedor1
login_data = {
    'username': 'vendedor1@solucao.com',
    'password': '123'
}

try:
    print('🔐 Testando login do vendedor...')
    response = requests.post('http://localhost:8000/auth/login', json=login_data)
    print(f'Status do login: {response.status_code}')
    
    if response.status_code == 200:
        data = response.json()
        token = data.get('access_token')
        print(f'✅ Login bem-sucedido! Token obtido.')
        print(f'📊 Dados do usuário: {data.get("user", {})}')
        
        # Testar decodificação do token
        import jwt
        payload = jwt.decode(token, options={'verify_signature': False})
        print(f'🎯 Token decodificado: {payload}')
        
    else:
        print(f'❌ Erro no login: {response.text}')
        
except Exception as e:
    print(f'❌ Erro na requisição: {e}') 