# 🔧 Como Conectar e Corrigir o Erro de Network na VPS

## 1. Conectar via SSH à VPS

### Windows (PowerShell/Terminal):
```bash
ssh root@SEU_IP_VPS
```

### Exemplo:
```bash
ssh root@189.107.150.129
```

## 2. Verificar se a API está rodando:

```bash
# Ver se o processo Python está rodando
ps aux | grep python

# Testar a API localmente
curl http://localhost:8000/health

# Ver logs da API
journalctl -u api-mendes -n 50
```

## 3. Problema Principal: CORS e HTTPS

O erro acontece porque:
- Frontend: https://meuapp.mendessolucao.site (HTTPS)
- API tentando conectar: http://api.mendessolucao.site (HTTP misto)

### Solução Rápida - Testar a API diretamente:

```bash
# Na VPS, editar o arquivo main.py
cd /root/AppMendes/backend
nano main.py
```

Procure a parte do CORS e adicione:

```python
# Configurar CORS mais permissivo temporariamente
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todas as origens temporariamente
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 4. Configurar Nginx para HTTPS (Solução Definitiva):

```bash
# Criar arquivo de configuração
nano /etc/nginx/sites-available/api.mendessolucao.site
```

Adicionar:

```nginx
server {
    listen 80;
    server_name api.mendessolucao.site;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name api.mendessolucao.site;
    
    # Certificado SSL (gerar com certbot)
    ssl_certificate /etc/letsencrypt/live/api.mendessolucao.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.mendessolucao.site/privkey.pem;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
    }
}
```

## 5. Gerar Certificado SSL:

```bash
# Instalar certbot se não tiver
apt install certbot python3-certbot-nginx -y

# Gerar certificado
certbot --nginx -d api.mendessolucao.site
```

## 6. Habilitar site e reiniciar:

```bash
# Habilitar site
ln -s /etc/nginx/sites-available/api.mendessolucao.site /etc/nginx/sites-enabled/

# Testar configuração
nginx -t

# Reiniciar nginx
systemctl restart nginx
```

## 7. Rodar a API como serviço:

```bash
# Criar arquivo de serviço
nano /etc/systemd/system/api-mendes.service
```

Adicionar:

```ini
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
```

Depois:

```bash
# Recarregar systemd
systemctl daemon-reload

# Iniciar serviço
systemctl start api-mendes

# Habilitar para iniciar no boot
systemctl enable api-mendes

# Ver status
systemctl status api-mendes
```

## 8. Teste Rápido do Frontend:

Crie um arquivo teste.html local:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Teste API</title>
</head>
<body>
    <h1>Teste de Conexão</h1>
    <button onclick="testarAPI()">Testar API</button>
    <div id="resultado"></div>
    
    <script>
        async function testarAPI() {
            try {
                const response = await fetch('https://api.mendessolucao.site/health');
                const data = await response.json();
                document.getElementById('resultado').innerHTML = 'API OK: ' + JSON.stringify(data);
            } catch (error) {
                document.getElementById('resultado').innerHTML = 'ERRO: ' + error.message;
            }
        }
    </script>
</body>
</html>
```

## 9. Debug Completo:

```bash
# Script de debug
cat > debug-api.sh << 'EOF'
#!/bin/bash
echo "=== Debug API ==="
echo "1. Processo Python:"
ps aux | grep python | grep -v grep

echo -e "\n2. Porta 8000:"
netstat -tlnp | grep 8000

echo -e "\n3. Teste local:"
curl -I http://localhost:8000/health

echo -e "\n4. Teste HTTPS:"
curl -I https://api.mendessolucao.site/health

echo -e "\n5. Logs recentes:"
journalctl -u api-mendes -n 20 --no-pager
EOF

chmod +x debug-api.sh
./debug-api.sh
```

## Comandos Úteis:

- **Ver logs em tempo real**: `journalctl -u api-mendes -f`
- **Reiniciar API**: `systemctl restart api-mendes`
- **Parar API**: `systemctl stop api-mendes`
- **Ver logs do Nginx**: `tail -f /var/log/nginx/error.log` 