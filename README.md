# Aplicativo de Força de Vendas

Aplicativo de força de vendas para gerenciamento de pedidos, clientes e produtos, com sincronização em tempo real via API REST.

## Estrutura do Projeto

O projeto está dividido em duas partes principais:

### Frontend (React + Tailwind CSS)
- Interface de usuário moderna e responsiva
- Instalável como PWA (Progressive Web App)
- Funciona em dispositivos móveis

### Backend (FastAPI)
- API REST para comunicação com o frontend
- Conexão com banco de dados Firebird via módulo de conexão existente
- Autenticação e autorização de usuários

## Requisitos

### Frontend
- Node.js 14+
- npm 6+

### Backend
- Python 3.8+
- Firebird 2.5+
- Biblioteca fbclient.dll (já incluída no projeto)

## Como Executar

### Backend

1. Ative o ambiente virtual:
```
cd backend
.\venv\Scripts\activate
```

2. Instale as dependências:
```
pip install -r requirements.txt
```

3. Execute o servidor:
```
uvicorn main:app --reload
```

O backend estará disponível em http://localhost:8000

### Frontend

1. Instale as dependências:
```
cd frontend
npm install
```

2. Execute o servidor de desenvolvimento:
```
npm start
```

O frontend estará disponível em http://localhost:3000

## Funcionalidades

- Login de usuários
- Dashboard com resumo de dados
- Gerenciamento de clientes
- Gerenciamento de produtos
- Criação e gerenciamento de pedidos
- Sincronização em tempo real com o banco de dados

## Configuração

As configurações do banco de dados estão no arquivo `.env` na raiz do projeto. Ajuste as configurações conforme necessário:

```
SECRET_KEY=sua-chave-secreta-aqui-mude-isso
DB_HOST=localhost
DB_PATH=C:\ERP_MACFIN\Banco\Erinalda\BASE_PRI.GDB
DB_USER=SYSDBA
DB_PASSWORD=masterkey
```

## Construção para Produção

### Frontend

Para construir o frontend para produção:

```
cd frontend
npm run build
```

Os arquivos estáticos serão gerados na pasta `build` e podem ser servidos por qualquer servidor web.

### Backend

Para o backend, recomenda-se usar o Gunicorn com o Uvicorn como worker:

```
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

## PWA (Progressive Web App)

O aplicativo pode ser instalado como um PWA em dispositivos móveis e desktops. Para instalar:

1. Acesse o aplicativo em um navegador compatível
2. O navegador mostrará uma opção para instalar o aplicativo
3. Siga as instruções para instalar

## Licença

Este projeto é proprietário e confidencial.
