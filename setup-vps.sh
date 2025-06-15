#!/bin/bash

echo "=== Setup Completo da API Mendes na VPS ==="
echo

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar comando
check_command() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1 concluído${NC}"
    else
        echo -e "${RED}✗ Erro em $1${NC}"
        exit 1
    fi
}

# 1. Atualizar o sistema
echo -e "${YELLOW}1. Atualizando sistema...${NC}"
apt update && apt upgrade -y
check_command "Atualização do sistema"

# 2. Instalar dependências
echo -e "${YELLOW}2. Instalando dependências...${NC}"
apt install -y python3 python3-pip nginx certbot python3-certbot-nginx git
check_command "Instalação de dependências"

# 3. Clonar o repositório (se ainda não existir)
if [ ! -d "/root/AppMendes" ]; then
    echo -e "${YELLOW}3. Clonando repositório...${NC}"
    cd /root
    git clone https://github.com/seu-usuario/AppMendes.git
    check_command "Clone do repositório"
else
    echo -e "${GREEN}3. Repositório já existe${NC}"
fi

# 4. Instalar dependências Python
echo -e "${YELLOW}4. Instalando dependências Python...${NC}"
cd /root/AppMendes/backend
pip3 install -r requirements.txt
check_command "Instalação de dependências Python"

# 5. Configurar o serviço systemd
echo -e "${YELLOW}5. Configurando serviço systemd...${NC}"
cp /root/AppMendes/api-mendes.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable api-mendes.service
systemctl restart api-mendes.service
check_command "Configuração do serviço"

# 6. Configurar Nginx
echo -e "${YELLOW}6. Configurando Nginx...${NC}"
cp /root/AppMendes/nginx-api-config.conf /etc/nginx/sites-available/api.mendessolucao.site
ln -sf /etc/nginx/sites-available/api.mendessolucao.site /etc/nginx/sites-enabled/
nginx -t
check_command "Teste de configuração Nginx"

# 7. Obter certificado SSL
echo -e "${YELLOW}7. Obtendo certificado SSL...${NC}"
certbot --nginx -d api.mendessolucao.site --non-interactive --agree-tos --email seu-email@exemplo.com
check_command "Certificado SSL"

# 8. Reiniciar Nginx
echo -e "${YELLOW}8. Reiniciando Nginx...${NC}"
systemctl restart nginx
check_command "Reinicialização do Nginx"

# 9. Configurar firewall
echo -e "${YELLOW}9. Configurando firewall...${NC}"
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
ufw allow 22/tcp
echo "y" | ufw enable
check_command "Configuração do firewall"

# 10. Verificar status dos serviços
echo -e "${YELLOW}10. Verificando status dos serviços...${NC}"
echo
echo "Status da API:"
systemctl status api-mendes.service --no-pager
echo
echo "Status do Nginx:"
systemctl status nginx --no-pager
echo

# 11. Testar endpoints
echo -e "${YELLOW}11. Testando endpoints...${NC}"
echo
echo "Teste local (HTTP):"
curl -I http://localhost:8000/health
echo
echo "Teste via domínio (HTTPS):"
curl -I https://api.mendessolucao.site/health
echo

echo -e "${GREEN}=== Setup Concluído! ===${NC}"
echo
echo "Comandos úteis:"
echo "- Ver logs da API: journalctl -u api-mendes.service -f"
echo "- Reiniciar API: systemctl restart api-mendes.service"
echo "- Ver logs do Nginx: tail -f /var/log/nginx/api.error.log"
echo "- Testar API: curl https://api.mendessolucao.site/health"
echo 