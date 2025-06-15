#!/bin/bash
# Script SUPER SIMPLES para VPS Linux

echo "=== Configuração Completa em 5 minutos! ==="

# 1. Atualizar sistema
apt update -y

# 2. Instalar dependências
apt install -y python3 python3-pip nginx certbot python3-certbot-nginx git

# 3. Clonar repositório (ajuste a URL)
cd /root
git clone https://github.com/seu-usuario/AppMendes.git
cd AppMendes/backend

# 4. Instalar dependências Python
pip3 install -r requirements.txt

# 5. Configurar Nginx
cat > /etc/nginx/sites-available/api << 'EOF'
server {
    listen 80;
    server_name api.mendessolucao.site;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# 6. Ativar site
ln -s /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

# 7. Certificado SSL automático
certbot --nginx -d api.mendessolucao.site --non-interactive --agree-tos --email seu@email.com

# 8. Criar serviço
cat > /etc/systemd/system/api.service << 'EOF'
[Unit]
Description=API Mendes
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/AppMendes/backend
ExecStart=/usr/bin/python3 main.py --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# 9. Iniciar serviço
systemctl daemon-reload
systemctl enable api
systemctl start api

echo "=== PRONTO! API rodando com HTTPS! ==="
echo "Acesse: https://api.mendessolucao.site" 