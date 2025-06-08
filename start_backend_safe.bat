@echo off
title Backend API - Força de Vendas
cls
echo.
echo 🚀 Iniciando Backend API - Força de Vendas
echo ==========================================
echo.

REM Verificar se o Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERRO: Python não encontrado no sistema!
    echo    Instale o Python 3.8+ e tente novamente.
    pause
    exit /b 1
)

REM Verificar se o arquivo run_backend_fixed.py existe
if not exist "run_backend_fixed.py" (
    echo ❌ ERRO: Arquivo run_backend_fixed.py não encontrado!
    echo    Certifique-se de estar no diretório correto.
    pause
    exit /b 1
)

REM Verificar se a pasta backend existe
if not exist "backend" (
    echo ❌ ERRO: Pasta backend não encontrada!
    echo    Certifique-se de estar no diretório correto.
    pause
    exit /b 1
)

echo ✅ Ambiente verificado com sucesso!
echo.
echo 📦 Iniciando servidor backend na porta 8000...
echo 🌐 Acesse: http://localhost:8000
echo.
echo Para parar o servidor, pressione Ctrl+C
echo.

REM Executar o backend
python run_backend_fixed.py

if errorlevel 1 (
    echo.
    echo ❌ Erro ao iniciar o backend!
    echo Verifique as mensagens de erro acima.
)

echo.
echo 🔚 Servidor finalizado.
pause 