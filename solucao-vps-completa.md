# 🚨 Solução Completa - Erro Network na VPS

## Problema Identificado:
- Frontend HTTPS (https://meuapp.mendessolucao.site) 
- API sem HTTPS configurado
- CORS bloqueando requisições externas
- Erro 500: usuário "anonimo@teste.com" não existe

## Solução Rápida (SSH na VPS):

### 1. Conectar na VPS:
```bash
ssh root@189.107.150.129
```

### 2. Configurar CORS temporariamente:
```bash
cd /root/AppMendes/backend
nano main.py
```

Procure por `CORSMiddleware` e mude para:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite todas as origens
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3. Reiniciar API:
```bash
pkill python
python3 main.py --port 8000 &
```

## Solução Definitiva - HTTPS com Nginx:

### 1. Instalar Nginx e Certbot:
```bash
apt update
apt install nginx certbot python3-certbot-nginx -y
```

### 2. Criar configuração Nginx:
```bash
cat > /etc/nginx/sites-available/api.mendessolucao.site << 'EOF'
server {
    listen 80;
    server_name api.mendessolucao.site;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Headers CORS
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, x-empresa-codigo' always;
        
        # Handle preflight
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, x-empresa-codigo';
            add_header 'Access-Control-Max-Age' 86400;
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}
EOF
```

### 3. Habilitar site:
```bash
ln -s /etc/nginx/sites-available/api.mendessolucao.site /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### 4. Obter certificado SSL:
```bash
certbot --nginx -d api.mendessolucao.site --non-interactive --agree-tos --email seu@email.com
```

### 5. Criar serviço systemd:
```bash
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
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable api-mendes
systemctl start api-mendes
```

### 6. Verificar se está funcionando:
```bash
# Testar localmente
curl http://localhost:8000/

# Testar via HTTPS
curl https://api.mendessolucao.site/

# Ver logs
journalctl -u api-mendes -f
```

## Para Testar no Celular:

1. Abra o navegador no celular
2. Acesse: https://meuapp.mendessolucao.site
3. Faça login com um usuário válido do sistema (não use anonimo@teste.com)

## Comandos Úteis:

- **Ver logs da API**: `journalctl -u api-mendes -f`
- **Reiniciar API**: `systemctl restart api-mendes`
- **Ver status**: `systemctl status api-mendes`
- **Ver logs Nginx**: `tail -f /var/log/nginx/error.log`
- **Testar API**: `curl -I https://api.mendessolucao.site/health`

## Se ainda der erro:

1. Verifique se o domínio api.mendessolucao.site aponta para o IP da VPS
2. Verifique se a porta 443 está aberta no firewall
3. Verifique os logs para mais detalhes 