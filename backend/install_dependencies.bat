@echo off
echo Instalando dependencias do sistema...

:: Ativa o ambiente virtual
call .venv\Scripts\activate

:: Instala as dependências principais
echo.
echo [1/2] Instalando dependencias principais...
pip install -r requirements.txt

:: Instala as dependências da IA
echo.
echo [2/2] Instalando dependencias da IA...
pip install -r requirements_ai.txt

echo.
echo Todas as dependencias foram instaladas com sucesso!
echo.
pause 