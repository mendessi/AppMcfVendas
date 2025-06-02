#!/bin/bash
# Comandos para copiar e colar direto na VPS

# 1. CONECTAR NA VPS (execute no seu terminal local):
echo "ssh root@189.107.150.129"

# 2. DEPOIS DE CONECTADO, EXECUTE ESTES COMANDOS:

# Parar API atual
pkill python

# Ir para o diretório
cd /root/AppMendes/backend

# Criar backup do main.py
cp main.py main.py.backup

# Editar CORS para permitir tudo temporariamente
sed -i 's/allow_origins=\[.*\]/allow_origins=["*"]/' main.py

# Iniciar API em background
nohup python3 main.py --port 8000 > api.log 2>&1 &

# Verificar se está rodando
sleep 2
ps aux | grep python

# Testar localmente
curl http://localhost:8000/

# Instalar Nginx se não tiver
apt update && apt install -y nginx

# Criar configuração básica do Nginx
cat > /etc/nginx/sites-available/api.mendessolucao.site << 'EOF'
server {
    listen 80;
    server_name api.mendessolucao.site;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' '*' always;
        add_header 'Access-Control-Allow-Headers' '*' always;
    }
}
EOF

# Habilitar site
ln -sf /etc/nginx/sites-available/api.mendessolucao.site /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar e reiniciar nginx
nginx -t && systemctl restart nginx

# Abrir portas no firewall
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp

echo "===================================="
echo "API deve estar acessível em:"
echo "http://api.mendessolucao.site"
echo "====================================" 