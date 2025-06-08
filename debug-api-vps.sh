#!/bin/bash

echo "=== Debug Rápido da API na VPS ==="
echo

# 1. Verificar se a API está rodando
echo "1. Processos Python rodando:"
ps aux | grep python | grep -v grep
echo

# 2. Verificar portas abertas
echo "2. Portas abertas:"
netstat -tlnp | grep -E "(8000|80|443)"
echo

# 3. Testar API localmente
echo "3. Teste local da API:"
curl -s http://localhost:8000/ || echo "API não responde localmente"
echo

# 4. Verificar logs recentes
echo "4. Últimos erros da API:"
if [ -f "/var/log/api-mendes-error.log" ]; then
    tail -n 10 /var/log/api-mendes-error.log
else
    journalctl -u api-mendes.service --no-pager -n 20
fi
echo

# 5. Verificar configuração do Nginx
echo "5. Sites habilitados no Nginx:"
ls -la /etc/nginx/sites-enabled/
echo

# 6. Testar via domínio
echo "6. Teste via domínio:"
curl -I https://api.mendessolucao.site/health || echo "Falha ao acessar via domínio"
echo

# 7. Verificar DNS
echo "7. Resolução DNS:"
nslookup api.mendessolucao.site
echo

echo "=== Solução Rápida ==="
echo
echo "Se a API não está rodando, execute:"
echo "cd /root/AppMendes/backend && python3 main.py --port 8000"
echo
echo "Ou como serviço:"
echo "systemctl start api-mendes.service"
echo 