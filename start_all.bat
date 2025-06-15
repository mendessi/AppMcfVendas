@echo off
echo.
echo 🌟 Iniciando Sistema Completo...
echo =====================================
echo.

echo Escolha uma opcao:
echo 1. Apenas Backend (porta 8000)
echo 2. Apenas Frontend (porta 3001)  
echo 3. Ambos os servicos
echo.

set /p choice=Digite sua escolha (1-3): 

if "%choice%"=="1" goto backend
if "%choice%"=="2" goto frontend
if "%choice%"=="3" goto both
goto invalid

:backend
echo.
echo 📦 Iniciando apenas o Backend...
python run_backend.py
goto end

:frontend
echo.
echo ⚡ Iniciando apenas o Frontend...
cd frontend
set PORT=3001
npm start
goto end

:both
echo.
echo 🔄 Iniciando ambos os servicos...
echo.
echo Abrindo Backend em nova janela...
start "Backend API" cmd /k "python run_backend.py"

echo Aguardando 3 segundos...
timeout /t 3 /nobreak >nul

echo Abrindo Frontend...
cd frontend
set PORT=3001
npm start
goto end

:invalid
echo.
echo ❌ Opcao invalida! Escolha 1, 2 ou 3.
timeout /t 2 /nobreak >nul
goto start

:end
pause 