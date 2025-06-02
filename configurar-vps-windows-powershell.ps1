# Script PowerShell para configurar API no Windows Server
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Configuracao API Windows Server" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# 1. Parar processos Python
Write-Host "`nParando processos Python..." -ForegroundColor Yellow
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Navegar para o diretorio
$apiPath = "C:\ProgPython\AppMcfVendas"
$backendPath = "$apiPath\backend"

if (Test-Path $backendPath) {
    Set-Location $backendPath
    Write-Host "Navegando para: $backendPath" -ForegroundColor Green
} elseif (Test-Path $apiPath) {
    Set-Location $apiPath
    Write-Host "Navegando para: $apiPath" -ForegroundColor Green
} else {
    Write-Host "ERRO: Pasta nao encontrada!" -ForegroundColor Red
    Write-Host "Procurado em: $apiPath" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit
}

# 3. Fazer backup do main.py
if (Test-Path "main.py") {
    Copy-Item "main.py" "main.py.backup" -Force
    Write-Host "`nBackup criado: main.py.backup" -ForegroundColor Green
}

# 4. Editar CORS no main.py para permitir todas as origens
Write-Host "`nEditando CORS no main.py..." -ForegroundColor Yellow
$content = Get-Content "main.py" -Raw
$newContent = $content -replace 'allow_origins=\[.*?\]', 'allow_origins=["*"]'
Set-Content "main.py" $newContent
Write-Host "CORS configurado para permitir todas as origens" -ForegroundColor Green

# 5. Iniciar API
Write-Host "`nIniciando API na porta 8000..." -ForegroundColor Yellow
$job = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    python main.py --port 8000
}

# 6. Aguardar inicializacao
Start-Sleep -Seconds 3

# 7. Testar API
Write-Host "`nTestando API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/" -UseBasicParsing
    Write-Host "API respondendo! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Resposta: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "ERRO: API nao esta respondendo" -ForegroundColor Red
    Write-Host "Erro: $_" -ForegroundColor Red
}

# 8. Configurar Firewall
Write-Host "`nConfigurando Firewall..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "API Python 8000" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow -ErrorAction SilentlyContinue
Write-Host "Porta 8000 liberada no Firewall" -ForegroundColor Green

# 9. Instrucoes para IIS
Write-Host "`n====================================" -ForegroundColor Cyan
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "1. Para configurar IIS como proxy reverso:" -ForegroundColor White
Write-Host "   - Instale IIS URL Rewrite" -ForegroundColor Gray
Write-Host "   - Instale Application Request Routing (ARR)" -ForegroundColor Gray
Write-Host "   - Configure proxy para http://localhost:8000" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Para teste rapido com NGROK:" -ForegroundColor White
Write-Host "   ngrok http 8000" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. API esta rodando em segundo plano" -ForegroundColor Green
Write-Host "   Para ver logs: Get-Job | Receive-Job" -ForegroundColor Gray
Write-Host "====================================" -ForegroundColor Cyan

Read-Host "`nPressione Enter para sair" 