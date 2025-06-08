#!/bin/bash

echo "Instalando OpenAI..."

# Ativa o ambiente virtual
echo "Ativando ambiente virtual..."
source venv/bin/activate

# Desinstala versão atual (se existir)
echo "Removendo versão atual..."
pip uninstall openai -y

# Instala a versão correta
echo "Instalando OpenAI 1.84.0..."
pip install openai==1.84.0

# Instala dependências necessárias
echo "Instalando dependências..."
pip install httpx>=0.23.0 pydantic>=1.9.0 tiktoken==0.6.0

echo "Instalação concluída!"
echo "Reinicie o servidor com: python main.py" 