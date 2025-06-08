#!/bin/bash

echo "Iniciando instalação do serviço de IA..."

# Atualiza o repositório
echo "Atualizando repositório..."
git pull

# Ativa o ambiente virtual (se existir)
if [ -d "venv" ]; then
    echo "Ativando ambiente virtual..."
    source venv/bin/activate
else
    echo "Criando ambiente virtual..."
    python -m venv venv
    source venv/bin/activate
fi

# Instala/atualiza as dependências
echo "Instalando dependências..."
pip install -r requirements_ai.txt

# Verifica se o arquivo .env existe
if [ ! -f ".env" ]; then
    echo "Arquivo .env não encontrado. Por favor, crie o arquivo .env com as seguintes variáveis:"
    echo "OPENAI_API_KEY=sua_chave_api_aqui"
    exit 1
fi

# Verifica se a chave da API está configurada
if grep -q "OPENAI_API_KEY=sua_chave_api_aqui" .env; then
    echo "ATENÇÃO: A chave da API OpenAI ainda está com o valor padrão!"
    echo "Por favor, atualize o arquivo .env com sua chave real."
    exit 1
fi

echo "Instalação concluída!"
echo "Para iniciar o servidor, execute: python main.py" 