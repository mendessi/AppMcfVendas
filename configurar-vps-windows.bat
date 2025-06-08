@echo off
echo ====================================
echo Configuracao API Windows Server
echo ====================================

REM 1. Parar processos Python existentes
echo Parando processos Python...
taskkill /F /IM python.exe 2>nul

REM 2. Navegar para o diretorio correto
cd /d C:\ProgPython\AppMcfVendas\backend
if not exist C:\ProgPython\AppMcfVendas\backend (
    echo ERRO: Pasta C:\ProgPython\AppMcfVendas\backend nao encontrada!
    echo Verificando se existe sem \backend...
    cd /d C:\ProgPython\AppMcfVendas
    if not exist main.py (
        echo ERRO: main.py nao encontrado!
        pause
        exit
    )
)

REM 3. Fazer backup do main.py
echo Fazendo backup...
copy main.py main.py.backup

REM 4. Iniciar API
echo Iniciando API na porta 8000...
start /b python main.py --port 8000

REM 5. Aguardar inicializacao
timeout /t 3

REM 6. Testar se esta funcionando
echo.
echo Testando API...
powershell -Command "Invoke-WebRequest -Uri http://localhost:8000/ -UseBasicParsing"

echo.
echo ====================================
echo Para configurar IIS como proxy:
echo ====================================
echo 1. Abra o IIS Manager
echo 2. Instale URL Rewrite e ARR (Application Request Routing)
echo 3. Crie um novo site para api.mendessolucao.site
echo 4. Configure o proxy reverso para http://localhost:8000
echo.
echo OU use o ngrok para teste rapido:
echo ngrok http 8000
echo ====================================
pause 