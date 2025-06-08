@echo off
title 🚀 Deploy Frontend React - AppMcfVendas

echo 📥 Clonando repositório...
git clone https://github.com/mendessi/AppMcfVendas.git
cd AppMcfVendas\frontend

echo 📦 Instalando dependências...
call npm install

echo 🏗️ Gerando build de produção...
call npm run build

echo 🚀 Instalando servidor 'serve'...
call npm install -g serve

echo 🟢 Subindo aplicação na porta 3000...
serve -s build -l 3000

pause
