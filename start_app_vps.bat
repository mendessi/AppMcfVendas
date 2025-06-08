@echo off
title Aplicação AppMendes - Inicializador VPS
color 0A

:: Caminho base da aplicação na VPS
set "APP_PATH=C:\ProgPython\AppMcfVendas"

:MENU
cls
echo =====================================================
echo      INICIALIZADOR DE SERVIÇOS - APP MACFIN VPS
echo =====================================================
echo.
echo  [1] Iniciar Backend (API FastAPI)
echo  [2] Iniciar Frontend (React)
echo  [3] Iniciar TODOS os serviços
echo  [4] Verificar Status dos Serviços
echo  [5] Sair
echo.
echo =====================================================
set /p escolha=Digite sua escolha (1-5): 

if "%escolha%"=="1" goto BACKEND
if "%escolha%"=="2" goto FRONTEND
if "%escolha%"=="3" goto ALL
if "%escolha%"=="4" goto STATUS
if "%escolha%"=="5" goto EXIT
goto MENU

:BACKEND
cls
echo =====================================================
echo             INICIANDO BACKEND FASTAPI
echo =====================================================
echo.
cd /d %APP_PATH%\backend

:: Ativa o ambiente virtual e inicia o servidor
call .venv\Scripts\activate
echo Iniciando servidor backend na porta 8000...
start "Backend - FastAPI" cmd /c "cd /d %APP_PATH%\backend && .venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4 --timeout-keep-alive 75 --limit-concurrency 1000"
echo.
echo Backend iniciado com sucesso!
timeout /t 3 >nul
goto MENU

:FRONTEND
cls
echo =====================================================
echo             INICIANDO FRONTEND REACT
echo =====================================================
echo.
cd /d %APP_PATH%\frontend

:: Verifica se a pasta build existe
if not exist build (
    echo Build do frontend não encontrado. Criando...
    call npm install
    call npm run build
) else (
    echo Build do frontend encontrado.
)

:: Inicia o frontend em nova janela
echo Iniciando servidor frontend na porta 3001...
start "Frontend - React" cmd /c "cd /d %APP_PATH%\frontend && npx serve -s build -l 3001"
echo.
echo Frontend iniciado com sucesso!
timeout /t 3 >nul
goto MENU

:STATUS
cls
echo =====================================================
echo             STATUS DOS SERVIÇOS
echo =====================================================
echo.
echo Verificando processos...
echo.

:: Verifica o backend
tasklist /FI "WINDOWTITLE eq Backend - FastAPI" 2>NUL | find /I /N "cmd.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] Backend está rodando
) else (
    echo [X] Backend não está rodando
)

:: Verifica o frontend
tasklist /FI "WINDOWTITLE eq Frontend - React" 2>NUL | find /I /N "cmd.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] Frontend está rodando
) else (
    echo [X] Frontend não está rodando
)

echo.
echo Pressione qualquer tecla para voltar ao menu...
pause >nul
goto MENU

:ALL
cls
echo =====================================================
echo      INICIANDO TODOS OS SERVIÇOS APPMENDES
echo =====================================================
echo.

:: Inicia o backend
echo [1/2] Iniciando Backend...
cd /d %APP_PATH%\backend
call .venv\Scripts\activate
start "Backend - FastAPI" cmd /c "cd /d %APP_PATH%\backend && .venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4 --timeout-keep-alive 75 --limit-concurrency 1000"
echo Backend iniciado com sucesso!

:: Inicia o frontend
echo [2/2] Iniciando Frontend...
cd /d %APP_PATH%\frontend

if not exist build (
    echo Build do frontend não encontrado. Criando...
    call npm install
    call npm run build
) else (
    echo Build do frontend encontrado.
)

start "Frontend - React" cmd /c "cd /d %APP_PATH%\frontend && npx serve -s build -l 3001"
echo Frontend iniciado com sucesso!

echo.
echo =====================================================
echo        TODOS OS SERVIÇOS FORAM INICIADOS!
echo =====================================================
echo.
echo Acesse:
echo - Backend: http://localhost:8000
echo - Frontend: http://localhost:3001
echo.
echo Pressione qualquer tecla para voltar ao menu...
pause >nul
goto MENU

:EXIT
cls
echo Encerrando...
timeout /t 2 >nul
exit 