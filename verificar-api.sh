#!/bin/bash

echo "=== Verificando Conectividade da API ==="
echo

# Testar API localmente
echo "1. Testando API localmente (HTTP):"
curl -I http://localhost:8000/health
echo

# Testar API via domínio
echo "2. Testando API via domínio (HTTPS):"
curl -I https://api.mendessolucao.site/health
echo

# Verificar se o processo está rodando
echo "3. Verificando processos Python:"
ps aux | grep python
echo

# Verificar portas abertas
echo "4. Verificando portas abertas:"
netstat -tlnp | grep :8000
echo

# Verificar logs do nginx
echo "5. Últimas linhas do log do Nginx:"
tail -n 20 /var/log/nginx/error.log
echo

echo "=== Fim da Verificação ===" 