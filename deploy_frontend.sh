#!/bin/bash

echo "📥 Clonando repositório AppMcfVendas..."
git clone https://github.com/mendessi/AppMcfVendas.git || { echo "❌ Erro ao clonar."; exit 1; }

cd AppMcfVendas/frontend || { echo "❌ Pasta frontend não encontrada."; exit 1; }

echo "📦 Instalando dependências..."
npm install || { echo "❌ Falha ao instalar dependências."; exit 1; }

echo "🏗️ Gerando build de produção..."
npm run build || { echo "❌ Falha ao gerar build."; exit 1; }

echo "🚀 Instalando servidor estático 'serve'..."
npm install -g serve || { echo "❌ Falha ao instalar serve."; exit 1; }

echo "🟢 Subindo aplicação React na porta 3000..."
serve -s build -l 3000
