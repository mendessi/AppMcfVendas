# Módulo de Orçamentos - App Mendes Solução

## 📱 Visão Geral
Este módulo permite a criação e gerenciamento de orçamentos no sistema Mendes Solução, com interface otimizada para dispositivos móveis.

## 🔗 URLs e Endpoints

### Frontend
- **URL Principal:** `https://app.mendessolucao.site/orcamento`
- **URL Alternativa:** `https://app.mendessolucao.site/orcamentos`

### API
- **Base URL:** `https://api.mendessolucao.site`
- **Endpoints Principais:**
  - `/relatorios/listar_tabelas`
  - `/relatorios/listar_formas_pagamento`
  - `/relatorios/listar_vendedores`
  - `/orcamentos` (POST/GET)
  - `/orcamento` (POST/GET)

## ⚙️ Configuração do Ambiente

### Frontend (React)
```javascript
// frontend/src/services/api.js
const isExternalAccess = 
  window.location.hostname.includes('mendessolucao.site') || 
  window.location.hostname.includes('ngrok.io');

let API_URL;
if (isExternalAccess) {
  API_URL = 'https://api.mendessolucao.site';
} else {
  API_URL = 'http://localhost:8000';
}
```

### Backend (FastAPI)
```python
# backend/orcamento_router.py
@router.get("/orcamentos")
@router.get("/orcamento")
async def listar_orcamentos(request: Request):
    # ... código existente ...
```

## 🚨 Problemas Comuns e Soluções

### 1. Erro 404 nas Requisições
**Sintoma:** Erro ao carregar dropdowns (tabelas, formas de pagamento, vendedores)
**Causa:** Requisições indo para o domínio errado
**Solução:** Verificar se a baseURL do Axios está configurada para `api.mendessolucao.site`

### 2. Erro 405 Method Not Allowed
**Sintoma:** Erro ao salvar orçamento com mensagem "405 Method Not Allowed"
**Causa:** 
- URL incorreta com prefixo `/api/` extra
- Rota registrada no backend sem o prefixo `/api`
**Solução:** 
- Usar `/orcamentos` em vez de `/api/orcamentos`
- Verificar se a rota está registrada corretamente no backend
- Confirmar se o método POST está habilitado na rota
- Verificar o arquivo `main.py` para confirmar como a rota está registrada

### 3. Dropdowns Não Carregam
**Verificar:**
1. Console do navegador para erros
2. Se as rotas da API estão respondendo
3. Se o token de autenticação está válido
4. Se o código da empresa está sendo enviado

### 4. Problemas de CORS
**Sintoma:** Erro de acesso negado no console
**Solução:** Verificar se o backend está configurado para aceitar requisições do domínio do frontend

## 📋 Checklist de Implementação

### Frontend
- [ ] Configurar baseURL do Axios
- [ ] Implementar interceptadores de erro
- [ ] Adicionar retry logic para mobile
- [ ] Configurar headers de autenticação
- [ ] Implementar cache de dados

### Backend
- [ ] Configurar rotas com aliases (singular/plural)
- [ ] Implementar validação de dados
- [ ] Configurar CORS
- [ ] Implementar cache de consultas
- [ ] Adicionar logs de erro

## 🔍 Debugging

### Frontend
```javascript
// Verificar URL base
console.log('API URL:', API_URL);

// Verificar requisições
api.interceptors.request.use(config => {
  console.log('Request:', config);
  return config;
});

// Verificar respostas
api.interceptors.response.use(
  response => {
    console.log('Response:', response);
    return response;
  },
  error => {
    console.error('Error:', error);
    return Promise.reject(error);
  }
);
```

### Backend
```python
# Log de requisições
@router.get("/orcamentos")
async def listar_orcamentos(request: Request):
    print(f"Requisição recebida: {request.url}")
    # ... resto do código
```

## 📱 Otimizações Mobile

1. **Performance**
   - Implementar cache local
   - Usar lazy loading
   - Otimizar imagens
   - Minimizar requisições

2. **UX**
   - Feedback visual imediato
   - Mensagens de erro claras
   - Botões com área de toque adequada
   - Suporte a gestos

3. **Offline**
   - Salvar dados localmente
   - Sincronizar quando online
   - Indicar status de conexão

## 🔐 Segurança

1. **Autenticação**
   - Token JWT
   - Refresh token
   - Validação de sessão

2. **Dados**
   - Validação no frontend e backend
   - Sanitização de inputs
   - Proteção contra XSS

3. **API**
   - Rate limiting
   - Validação de origem
   - Logs de acesso

## 📈 Monitoramento

1. **Frontend**
   - Erros de JavaScript
   - Performance de carregamento
   - Uso de memória
   - Tempo de resposta

2. **Backend**
   - Tempo de resposta
   - Uso de recursos
   - Erros de banco
   - Queries lentas

## 🚀 Deploy

### Frontend
1. Build otimizado
2. Testes automatizados
3. Verificação de CORS
4. Cache de assets

### Backend
1. Migrations do banco
2. Testes de integração
3. Logs configurados
4. Monitoramento ativo

## 📞 Suporte

### Contatos
- **Desenvolvimento:** [Seu contato]
- **Infraestrutura:** [Contato infra]
- **Banco de Dados:** [Contato DBA]

### Documentação
- [Link para documentação completa]
- [Link para API docs]
- [Link para manuais]

---

**Última atualização:** [Data]
**Versão:** 1.0.0
**Autor:** [Seu nome]

> 💡 **Dica:** Mantenha este README atualizado com qualquer mudança significativa no sistema. 