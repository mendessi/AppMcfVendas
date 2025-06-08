# 🚀 Guia Completo - VPS Linux em 10 minutos

## 1️⃣ Conectar na VPS Linux
```bash
ssh root@IP_DA_VPS
```

## 2️⃣ Copiar e Colar TUDO isso:
```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar tudo necessário
apt install -y python3 python3-pip nginx certbot python3-certbot-nginx git curl

# Baixar seu código (ajuste o método)
cd /root
# Opção 1: Git
git clone https://github.com/seu-usuario/AppMendes.git

# Opção 2: Upload manual via SCP/SFTP
# Use FileZilla ou WinSCP para enviar os arquivos

# Entrar na pasta
cd AppMendes/backend || cd AppMendes

# Instalar dependências Python
pip3 install fastapi uvicorn firebird-driver python-jose passlib python-multipart

# Editar CORS para permitir tudo temporariamente
sed -i 's/allow_origins=\[.*\]/allow_origins=["*"]/' main.py

# Criar serviço systemd
cat > /etc/systemd/system/api-mendes.service << 'EOF'
[Unit]
Description=API Mendes
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/AppMendes/backend
ExecStart=/usr/bin/python3 main.py --port 8000
Restart=always
Environment="PATH=/usr/bin:/usr/local/bin"

[Install]
WantedBy=multi-user.target
EOF

# Iniciar serviço
systemctl daemon-reload
systemctl enable api-mendes
systemctl start api-mendes

# Configurar Nginx
cat > /etc/nginx/sites-available/api.mendessolucao.site << 'EOF'
server {
    listen 80;
    server_name api.mendessolucao.site;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/api.mendessolucao.site /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Abrir firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
echo "y" | ufw enable

# Certificado SSL (ajuste o email)
certbot --nginx -d api.mendessolucao.site --non-interactive --agree-tos --email seu@email.com

# Verificar se está funcionando
systemctl status api-mendes --no-pager
curl http://localhost:8000/
```

## 3️⃣ Testar
```bash
# Ver logs em tempo real
journalctl -u api-mendes -f

# Testar API
curl https://api.mendessolucao.site/
```

## 4️⃣ Comandos Úteis
```bash
# Reiniciar API
systemctl restart api-mendes

# Ver logs
journalctl -u api-mendes -n 100

# Editar código
nano /root/AppMendes/backend/main.py

# Ver status
systemctl status api-mendes
```

## 🎯 Pronto!
Sua API está rodando com HTTPS em https://api.mendessolucao.site

## Troubleshooting

### Se der erro de módulos Python:
```bash
pip3 install fdb firebird-driver
pip3 install -r requirements.txt
```

### Se o Firebird não conectar:
```bash
# Instalar cliente Firebird
apt install firebird3.0-utils libfbclient2 -y
```

### Se precisar debug:
```bash
# Parar serviço
systemctl stop api-mendes

# Rodar manualmente para ver erros
cd /root/AppMendes/backend
python3 main.py --port 8000
``` 