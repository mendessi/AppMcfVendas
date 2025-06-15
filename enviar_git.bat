@echo off
setlocal EnableDelayedExpansion

:: Mostrar a última tag existente
for /f "delims=" %%i in ('git describe --tags --abbrev=0 2^>nul') do set LAST_TAG=%%i

echo ==============================================
echo Última versão publicada: %LAST_TAG%
echo ==============================================

:: Solicitar a nova versão ao usuário
set /p NEW_TAG=Digite a nova versão (ex: v1.0.1.0): 

:: Validar se foi digitado algo
if "%NEW_TAG%"=="" (
    echo Nenhuma versão informada. Encerrando.
    pause
    exit /b
)

:: Solicitar mensagem de commit
set /p MSG=Digite a mensagem do commit: 

:: Iniciar o processo de versionamento
echo.
echo Comitando e tagueando como: %NEW_TAG%
echo.

:: Garantir que está na branch main
git checkout main

:: Adicionar e commitar
git add .
git commit -m "%MSG%"

:: Criar a nova tag
git tag %NEW_TAG%

:: Enviar para o repositório
git push origin main
git push origin %NEW_TAG%

echo.
echo ==============================================
echo ✅ Versão %NEW_TAG% publicada com sucesso!
echo ==============================================
pause
