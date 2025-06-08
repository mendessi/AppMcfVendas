@echo off
title Iniciando App FastAPI + Frontend - Solução Mendes

:: Vai para a raiz do projeto
cd /d C:\ProgPython\AppMendes

echo Ativando ambiente virtual (Python 3.11)...
call venv\Scripts\activate

echo Iniciando o backend (FastAPI)...
start cmd /k "cd backend && uvicorn main:app --host 127.0.0.1 --port 8000 --timeout-keep-alive 75 --limit-concurrency 1000"

timeout /t 3 > nul

echo Iniciando o frontend (React)...
start cmd /k "cd frontend && set PORT=3001 && npm start"

pause
