# Script PowerShell para inicializar os servidores

Write-Host "🚀 Iniciando servidores..." -ForegroundColor Green

# Função para iniciar o backend
function Start-Backend {
    Write-Host "📦 Iniciando Backend na porta 8000..." -ForegroundColor Cyan
    python start_backend.py
}

# Função para iniciar o frontend
function Start-Frontend {
    Write-Host "⚡ Iniciando Frontend na porta 3001..." -ForegroundColor Yellow
    Set-Location frontend
    $env:PORT = 3001
    npm start
}

# Perguntar ao usuário o que quer inicializar
$choice = Read-Host "Digite 1 para Backend, 2 para Frontend, 3 para ambos"

switch ($choice) {
    "1" { Start-Backend }
    "2" { Start-Frontend }
    "3" { 
        Write-Host "🔄 Iniciando ambos os servidores..." -ForegroundColor Magenta
        
        # Iniciar backend em segundo plano
        Start-Job -ScriptBlock { 
            Set-Location $using:PWD
            python start_backend.py 
        } -Name "Backend"
        
        # Aguardar um pouco e depois iniciar o frontend
        Start-Sleep -Seconds 3
        Start-Frontend
    }
    default { Write-Host "❌ Opção inválida!" -ForegroundColor Red }
} 