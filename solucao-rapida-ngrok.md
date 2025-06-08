# 🚀 Solução Rápida com NGROK (Windows Server)

## Passos na VPS Windows:

### 1. Conecte via RDP na VPS

### 2. Abra o PowerShell como Administrador e execute:

```powershell
# Ir para a pasta correta
cd C:\ProgPython\AppMcfVendas
# ou se tiver subpasta backend
cd C:\ProgPython\AppMcfVendas\backend

# Parar Python anterior
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar API
python main.py --port 8000
```

### 3. Em OUTRO PowerShell, baixe e execute o ngrok:

```powershell
# Baixar ngrok (se não tiver)
Invoke-WebRequest https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip -OutFile ngrok.zip
Expand-Archive ngrok.zip
cd ngrok

# Executar ngrok
.\ngrok http 8000
```

### 4. O ngrok mostrará algo assim:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:8000
```

### 5. No seu arquivo `frontend/src/services/api.js`, temporariamente mude para:

```javascript
const getApiUrl = () => {
  // TEMPORÁRIO - usar URL do ngrok
  return 'https://abc123.ngrok.io'; // <-- Coloque a URL que o ngrok gerou
  
  // Código original comentado
  // const hostname = window.location.hostname;
  // if (hostname.includes('mendessolucao.site')) {
  //   return 'https://api.mendessolucao.site';
  // }
  // return process.env.REACT_APP_API_URL || 'http://localhost:8000';
};
```

### 6. Teste no celular!
Agora deve funcionar, pois o ngrok cria um túnel HTTPS automaticamente.

## Alternativa - Arquivo .BAT simples:

Crie um arquivo `iniciar-api.bat` na VPS:

```batch
@echo off
cd /d C:\ProgPython\AppMcfVendas
taskkill /F /IM python.exe 2>nul
start python main.py --port 8000
timeout /t 5
start ngrok http 8000
```

## Solução Definitiva (IIS):

Depois de testar com ngrok, configure o IIS corretamente:

1. Instale IIS com módulos:
   - URL Rewrite
   - Application Request Routing (ARR)

2. Configure certificado SSL para api.mendessolucao.site

3. Configure proxy reverso no IIS para localhost:8000

O ngrok é perfeito para testar rapidamente se tudo está funcionando! 