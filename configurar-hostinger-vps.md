# 🚀 Guia Completo - Hostinger VPS

## 1️⃣ Criar VPS na Hostinger

1. Acesse seu painel Hostinger
2. Vá em **VPS** → **Criar novo VPS**
3. Escolha:
   - **Sistema**: Ubuntu 22.04 LTS
   - **Plano**: O mais básico já serve (1 vCPU, 1GB RAM)
   - **Localização**: Brasil (menor latência)

## 2️⃣ Acessar sua VPS

No painel da Hostinger, pegue:
- **IP**: xxx.xxx.xxx.xxx
- **Senha root**: (está no email ou painel)

### Windows (PowerShell/Terminal):
```bash
ssh root@SEU_IP_HOSTINGER
```

### Ou use o Terminal Web da Hostinger:
- No painel VPS → **Terminal Browser**

## 3️⃣ Copiar e Colar Este Script Completo:

```bash
#!/bin/bash
# Script automático para Hostinger VPS

echo "=== Configurando API na Hostinger VPS ==="

# 1. Atualizar sistema
apt update && apt upgrade -y

# 2. Instalar tudo necessário
apt install -y python3 python3-pip nginx certbot python3-certbot-nginx git curl unzip

# 3. Criar diretório e baixar arquivos
mkdir -p /root/AppMendes/backend
cd /root/AppMendes

# IMPORTANTE: Você precisa fazer upload dos arquivos!
echo "=== ATENÇÃO ==="
echo "Faça upload dos arquivos usando:"
echo "1. FileZilla (SFTP)"
echo "2. Ou painel Hostinger File Manager"
echo "Para: /root/AppMendes/"
echo "Pressione ENTER quando terminar o upload..."
read

# 4. Instalar dependências Python
cd /root/AppMendes/backend
pip3 install fastapi uvicorn python-jose passlib python-multipart
pip3 install firebird-driver fdb

# 5. Configurar CORS para permitir tudo
sed -i 's/allow_origins=\[.*\]/allow_origins=["*"]/' main.py 2>/dev/null || echo "CORS já configurado"

# 6. Criar serviço
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

# 7. Iniciar serviço
systemctl daemon-reload
systemctl enable api-mendes
systemctl start api-mendes

# 8. Configurar Nginx
cat > /etc/nginx/sites-available/api << 'EOF'
server {
    listen 80;
    server_name _;  # Aceita qualquer domínio
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, x-empresa-codigo' always;
        
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, x-empresa-codigo';
            return 204;
        }
    }
}
EOF

# 9. Ativar Nginx
ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 10. Abrir firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
echo "y" | ufw enable

# 11. Mostrar status
echo "=== Status da Instalação ==="
systemctl status api-mendes --no-pager
echo ""
echo "=== Teste Local ==="
curl http://localhost:8000/ || echo "API ainda iniciando..."
echo ""
echo "==================================="
echo "✅ INSTALAÇÃO CONCLUÍDA!"
echo "==================================="
echo ""
echo "Sua API está acessível em:"
echo "http://$( curl -s ifconfig.me ):80"
echo ""
echo "Para usar no frontend, edite api.js:"
echo "return 'http://$( curl -s ifconfig.me )';"
echo ""
echo "Comandos úteis:"
echo "- Ver logs: journalctl -u api-mendes -f"
echo "- Reiniciar: systemctl restart api-mendes"
echo "==================================="
```

## 4️⃣ Upload dos Arquivos

### Opção 1 - FileZilla (Recomendado):
1. Baixe FileZilla: https://filezilla-project.org/
2. Nova conexão:
   - **Host**: IP da VPS
   - **Usuário**: root
   - **Senha**: sua senha
   - **Porta**: 22
3. Upload da pasta `backend` para `/root/AppMendes/`

### Opção 2 - Painel Hostinger:
1. No painel VPS → **File Manager**
2. Navegue até `/root/AppMendes/`
3. Upload dos arquivos

## 5️⃣ Configurar Frontend

No arquivo `frontend/src/services/api.js`:

```javascript
const getApiUrl = () => {
  // Substitua pelo IP da sua VPS Hostinger
  return 'http://IP_DA_SUA_VPS_HOSTINGER';
};
```

## 6️⃣ Domínio Próprio (Opcional)

Se tiver domínio na Hostinger:

1. **DNS**: Aponte para o IP da VPS
2. Execute para SSL:
```bash
certbot --nginx -d api.seudominio.com --non-interactive --agree-tos --email seu@email.com
```

## 📱 Pronto para Celular!

Agora funciona em qualquer dispositivo porque:
- ✅ Tem IP público
- ✅ Aceita requisições externas
- ✅ CORS configurado
- ✅ Firewall aberto

## Problemas Comuns:

### API não inicia:
```bash
# Ver erros
journalctl -u api-mendes -n 50

# Testar manualmente
cd /root/AppMendes/backend
python3 main.py --port 8000
```

### Firebird não conecta:
```bash
# Instalar cliente
apt install firebird3.0-utils libfbclient2 -y
``` 