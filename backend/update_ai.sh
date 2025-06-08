#!/bin/bash

echo "Atualizando serviço de IA..."

# Atualiza o repositório
echo "Atualizando código..."
git pull

# Ativa o ambiente virtual
echo "Ativando ambiente virtual..."
source venv/bin/activate

# Atualiza as dependências
echo "Atualizando dependências..."
pip install -r requirements_ai.txt

echo "Atualização concluída!"
echo "Reinicie o servidor com: python main.py" 