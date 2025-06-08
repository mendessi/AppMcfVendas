#!/bin/bash

echo "Configurando API Key da OpenAI..."

# Verifica se o arquivo .env existe
if [ ! -f ".env" ]; then
    echo "Criando arquivo .env..."
    touch .env
fi

# Pede a chave da API
read -p "Digite sua API Key da OpenAI: " api_key

# Atualiza ou adiciona a chave no arquivo .env
if grep -q "OPENAI_API_KEY" .env; then
    # Se a chave já existe, atualiza
    sed -i "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=$api_key/" .env
else
    # Se a chave não existe, adiciona
    echo "OPENAI_API_KEY=$api_key" >> .env
fi

echo "API Key configurada com sucesso!"
echo "Reinicie o servidor com: python main.py" 