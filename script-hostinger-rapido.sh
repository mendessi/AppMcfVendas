#!/bin/bash
# Script rápido Hostinger - Copie e cole tudo!

# Atualizar
apt update -y

# Instalar
apt install -y python3 python3-pip nginx git curl

# Criar pasta
mkdir -p /root/app/backend
cd /root/app

echo "===================================="
echo "FAÇA UPLOAD dos arquivos para:"
echo "/root/app/backend/"
echo "Use FileZilla ou Painel Hostinger"
echo "Pressione ENTER quando terminar..."
echo "===================================="
read

# Instalar Python deps
cd backend
pip3 install fastapi uvicorn python-jose passlib python-multipart firebird-driver

# Permitir CORS
sed -i 's/allow_origins=\[.*\]/allow_origins=["*"]/' main.py

# Criar serviço
cat > /etc/systemd/system/api.service << 'EOF'
[Unit]
Description=API
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/app/backend
ExecStart=/usr/bin/python3 main.py --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Iniciar API
systemctl daemon-reload
systemctl enable api
systemctl start api

# Configurar Nginx
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # CORS
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' '*' always;
        add_header 'Access-Control-Allow-Headers' '*' always;
    }
}
EOF

# Reiniciar Nginx
systemctl restart nginx

# Abrir firewall
ufw allow 80/tcp
ufw allow 22/tcp
echo "y" | ufw enable

# Mostrar IP
IP=$(curl -s ifconfig.me)
echo ""
echo "===================================="
echo "✅ PRONTO!"
echo "===================================="
echo "API acessível em: http://$IP"
echo ""
echo "No frontend, use:"
echo "return 'http://$IP';"
echo "====================================" 