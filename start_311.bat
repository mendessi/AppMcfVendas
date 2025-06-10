@echo off
echo === ATIVANDO AMBIENTE COM PYTHON 3.11.2 ===

REM Ir para a pasta do projeto
cd /d C:\ProgPython\AppMendes

REM Criar ambiente virtual com Python 3.11.2
"C:\Users\user\AppData\Local\Programs\Python\Python311\python.exe" -m venv venv

REM Ativar ambiente virtual
call .\venv\Scripts\activate

REM Atualizar pip
python -m pip install --upgrade pip

REM Instalar dependências principais
pip install fastapi[all] pydantic==2.6.4 openai python-dotenv

echo === AMBIENTE PRONTO COM PYTHON 3.11.2 ===
pause

//ativar ambiente virtual 3.11.2

& "C:\Users\user\AppData\Local\Programs\Python\Python311\python.exe" -m venv venv

$env:PORT="3001"; npm start
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --timeout-keep-alive 75 --limit-concurrency 1000