# Instalação do Serviço de IA na VPS

Este guia descreve como instalar e configurar o serviço de IA na VPS.

## Pré-requisitos

- Python 3.8 ou superior
- Git instalado
- Acesso SSH à VPS
- Chave da API OpenAI

## Passos para Instalação

1. **Clone o Repositório (se ainda não tiver feito)**
   ```bash
   git clone [URL_DO_REPOSITORIO]
   cd backend
   ```

2. **Execute o Script de Instalação**
   ```bash
   chmod +x install_ai.sh
   ./install_ai.sh
   ```

3. **Configure o Arquivo .env**
   Crie um arquivo `.env` na pasta `backend` com o seguinte conteúdo:
   ```
   OPENAI_API_KEY=sua_chave_api_aqui
   ```

4. **Inicie o Servidor**
   ```bash
   python main.py
   ```

## Atualização

Para atualizar o serviço na VPS:

1. **Execute o Script de Instalação Novamente**
   ```bash
   ./install_ai.sh
   ```

2. **Reinicie o Servidor**
   ```bash
   python main.py
   ```

## Verificação

Para verificar se o serviço está funcionando:

1. Acesse o endpoint de teste:
   ```
   http://[IP_DA_VPS]:8000/api/ai/test-prompt
   ```

2. Envie uma requisição POST com o seguinte corpo:
   ```json
   {
     "prompt": "Olá, como posso ajudar?"
   }
   ```

## Solução de Problemas

1. **Erro de Conexão**
   - Verifique se a porta 8000 está liberada no firewall
   - Confirme se o servidor está rodando

2. **Erro de Autenticação**
   - Verifique se a chave da API está correta no arquivo `.env`
   - Confirme se o arquivo `.env` está na pasta correta

3. **Erro de Dependências**
   - Execute `pip install -r requirements_ai.txt` manualmente
   - Verifique se o Python está na versão correta

## Manutenção

- Os logs são salvos em `ai_debug.log`
- O arquivo `app.log` contém logs gerais do servidor
- Para reiniciar o servidor, use CTRL+C e execute `python main.py` novamente 