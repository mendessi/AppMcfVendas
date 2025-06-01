# AppMendes - Sistema de Força de Vendas

## Requisitos do Sistema

### Backend
- Python 3.9 ou superior
- Firebird 2.5 ou superior
- Bibliotecas Python listadas em `requirements.txt`
- fbclient.dll (incluído no projeto)

### Frontend
- Node.js 16.x ou superior
- npm 8.x ou superior
- Dependências listadas em `package.json`

## Instalação

### 1. Backend

```bash
# 1. Clone o repositório
git clone [url-do-repositorio]

# 2. Entre na pasta do backend
cd backend

# 3. Crie um ambiente virtual (recomendado)
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# 4. Instale as dependências
pip install -r requirements.txt

# 5. Configure o ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# 6. Inicie o servidor
python main.py
```

### 2. Frontend

```bash
# 1. Entre na pasta do frontend
cd frontend

# 2. Instale as dependências
npm install

# 3. Configure o ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# 4. Para desenvolvimento
npm start

# 5. Para produção
npm run build
```

## Estrutura do Projeto

```
appmendes/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── fbclient.dll
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
└── docs/
    └── PASSO_A_PASSO_IMPLANTACAO_VPS.txt
```

## Implantação em Produção

Siga as instruções detalhadas em `PASSO_A_PASSO_IMPLANTACAO_VPS.txt`

## Dependências Principais

### Backend
- FastAPI
- SQLAlchemy
- fdb (Firebird)
- python-jose[cryptography]
- passlib[bcrypt]
- python-multipart
- uvicorn

### Frontend
- React 19.1.0
- React Router DOM 7.6.0
- Axios 1.9.0
- TailwindCSS 3.3.1
- React Icons 5.5.0

## Suporte

Para suporte, entre em contato com a equipe de desenvolvimento ou consulte a documentação adicional na pasta `docs/`.
