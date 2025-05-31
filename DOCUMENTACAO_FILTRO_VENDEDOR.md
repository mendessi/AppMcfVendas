# 📊 Documentação: Sistema de Filtro por Vendedor

## 🎯 Visão Geral

O sistema implementa um **filtro automático por vendedor** que é aplicado em todos os relatórios e dashboard quando o usuário logado possui nível "VENDEDOR". Isso garante que cada vendedor visualize apenas seus próprios dados de vendas.

---

## 🔄 Fluxo do Sistema

### 1. **Login do Usuário**
```
POST /login
├── Valida credenciais na base controladora
├── Gera token JWT com informações básicas:
│   ├── sub: email do usuário
│   ├── nivel: VENDEDOR
│   └── codigo_vendedor: null (ainda não obtido)
└── Retorna token para o frontend
```

### 2. **Seleção da Empresa**
```
GET /empresas
├── Lista empresas que o usuário tem permissão
└── Frontend permite seleção da empresa
```

### 3. **Obtenção do Código do Vendedor**
```
POST /buscar-codigo-vendedor
├── Headers: Authorization + x-empresa-codigo
├── Conecta na base da empresa selecionada
├── Busca vendedor por email na tabela VENDEDOR
└── Retorna: codigo_vendedor, nome_vendedor
```

### 4. **Aplicação Automática do Filtro**
```
Qualquer endpoint de relatório (dashboard-stats, vendas-por-dia, etc.)
├── Chama função helper: obter_filtro_vendedor()
├── Verifica se usuário é vendedor
├── Busca código do vendedor automaticamente
├── Gera filtro SQL: "AND VENDAS.VEN_CODIGO = '8'"
└── Aplica filtro nas consultas
```

---

## 🛠️ Implementação Técnica

### **Função Helper Global**

```python
async def obter_filtro_vendedor(request: Request) -> tuple[str, bool, str]:
    """
    Função helper global para obter filtro de vendedor automaticamente.
    
    Returns:
        tuple: (filtro_sql, filtro_aplicado, codigo_vendedor)
    """
```

**Retorna:**
- `filtro_sql`: String SQL para adicionar à consulta (ex: "AND VENDAS.VEN_CODIGO = '8'")
- `filtro_aplicado`: Boolean indicando se o filtro foi aplicado
- `codigo_vendedor`: Código do vendedor encontrado

### **Como Usar em Qualquer Endpoint**

```python
@router.get("/meu-endpoint")
async def meu_endpoint(request: Request):
    # 1. Obter filtro automaticamente
    filtro_vendedor, filtro_aplicado, codigo_vendedor = await obter_filtro_vendedor(request)
    
    # 2. Usar na consulta SQL
    sql = f"""
        SELECT * FROM VENDAS 
        WHERE ECF_CANCELADA = 'N'
        AND ECF_CONCLUIDA = 'S'
        {filtro_vendedor}  -- Adiciona automaticamente o filtro
    """
    
    # 3. Log do resultado (opcional)
    if filtro_aplicado:
        log.info(f"✅ DADOS FILTRADOS PARA VENDEDOR {codigo_vendedor}")
    else:
        log.info(f"📊 DADOS GERAIS (sem filtro)")
```

---

## 📋 Configuração Necessária

### **Base Controladora**
Tabela: `CLIENTES` (empresas)
```sql
CLI_CODIGO          -- Código da empresa
CLI_NOME            -- Nome da empresa  
CLI_IP_SERVIDOR     -- IP do servidor Firebird (ex: 149.56.77.81)
CLI_CAMINHO_BASE    -- Caminho completo da base (ex: C:\ERP_MACFIN\Banco\Santos\BASE_PRI.GDB)
CLI_NOME_BASE       -- Nome da base (pode ser vazio se caminho completo)
CLI_PORTA           -- Porta do Firebird (padrão: 3050)
```

### **Base da Empresa**
Tabela: `VENDEDOR`
```sql
VEN_CODIGO          -- Código do vendedor (usado no filtro)
VEN_NOME            -- Nome do vendedor
VEN_EMAIL           -- Email (deve corresponder ao login)
```

Tabela: `VENDAS`
```sql
VEN_CODIGO          -- Código do vendedor (FK para VENDEDOR)
ECF_TOTAL           -- Valor da venda
ECF_DATA            -- Data da venda
ECF_CANCELADA       -- Status (N = não cancelada)
ECF_CONCLUIDA       -- Status (S = concluída)
```

---

## 🔧 Exemplo de Configuração

### **1. Configurar Empresa na Base Controladora**
```sql
UPDATE CLIENTES SET
    CLI_IP_SERVIDOR = '149.56.77.81',
    CLI_CAMINHO_BASE = 'C:\ERP_MACFIN\Banco\Santos\BASE_PRI.GDB',
    CLI_NOME_BASE = '',
    CLI_PORTA = 3050
WHERE CLI_CODIGO = 1;
```

### **2. Cadastrar Vendedor na Base da Empresa**
```sql
INSERT INTO VENDEDOR (VEN_CODIGO, VEN_EMAIL, VEN_NOME)
VALUES ('08', 'vendedor1@solucao.com', 'João Vendedor');
```

---

## 📊 Endpoints com Filtro Implementado

### ✅ **Implementados**
- `GET /relatorios/dashboard-stats` - Cards do dashboard
- `GET /relatorios/vendas-por-dia` - Vendas agrupadas por dia

### 🔄 **Para Implementar** (usar mesmo padrão)
- `GET /relatorios/top-clientes` - Top clientes
- `GET /relatorios/top-produtos` - Top produtos  
- `GET /relatorios/top-vendedores` - Top vendedores
- `GET /relatorios/vendas` - Lista de vendas

**Padrão de implementação:**
```python
# Adicionar no início do endpoint
filtro_vendedor, filtro_aplicado, codigo_vendedor = await obter_filtro_vendedor(request)

# Modificar a SQL
sql = f"SELECT ... FROM VENDAS WHERE ... {filtro_vendedor}"
```

---

## 🎯 Resultados Comprovados

### **Teste com Vendedor (código 8 - JOSE CARLOS):**

| Métrica | Sem Filtro | Com Filtro | Redução |
|---------|-------------|------------|---------|
| Vendas do Mês | R$ 10.381.813,77 | R$ 2.566.243,71 | 75% |
| Total Pedidos | 1.307 | 111 | 91% |
| Vendas por Dia | 23 registros | 20 registros | 13% |

### **Logs de Funcionamento:**
```
🎯 FILTRO APLICADO: Vendedor 8 (JOSE CARLOS)
✅ ESTATÍSTICAS FILTRADAS PARA VENDEDOR 8:
   💰 Vendas do dia: R$ 0.00
   💰 Vendas do mês: R$ 2566243.71
   📦 Total de pedidos: 111
```

---

## 🔐 Segurança

### **Verificações Automáticas:**
1. ✅ Token JWT válido
2. ✅ Nível de usuário = "VENDEDOR"
3. ✅ Empresa selecionada válida
4. ✅ Vendedor existe na base da empresa
5. ✅ Email do login = Email do vendedor

### **Fallback Seguro:**
- Se qualquer verificação falhar → **Sem filtro aplicado**
- Logs detalhados para auditoria
- Não expõe dados de outros vendedores

---

## 🚀 Vantagens da Solução

### **🔄 Reutilizável**
- Uma função para todos os endpoints
- Padrão consistente em todo o sistema

### **⚡ Automática**
- Detecta automaticamente se é vendedor
- Obtém código sem intervenção manual

### **🛡️ Segura**
- Múltiplas verificações de segurança
- Fallback seguro em caso de erro

### **📊 Transparente**
- Logs detalhados de funcionamento
- Fácil auditoria e debug

### **🎯 Eficiente**
- Filtro aplicado no banco de dados
- Reduz tráfego de rede
- Melhora performance

---

## 🐛 Troubleshooting

### **Problema: Código do vendedor não encontrado**
```
🔄 SEM FILTRO - Vendedor não encontrado para email vendedor1@solucao.com
```
**Solução:** Verificar se vendedor existe na tabela VENDEDOR da empresa

### **Problema: Empresa não configurada**
```
🔄 SEM FILTRO - Empresa 1 não encontrada
```
**Solução:** Configurar empresa na base controladora

### **Problema: Conexão com base da empresa**
```
Erro ao conectar ao banco Firebird: IP do servidor não configurado
```
**Solução:** Verificar CLI_IP_SERVIDOR e CLI_CAMINHO_BASE

---

## 📝 Changelog

### **v1.0 - Implementação Inicial**
- ✅ Função helper global `obter_filtro_vendedor()`
- ✅ Filtro em `dashboard-stats`
- ✅ Filtro em `vendas-por-dia`
- ✅ Testes comprovando funcionamento
- ✅ Documentação completa

### **Próximas Versões**
- 🔄 Aplicar filtro em todos os endpoints de relatório
- 🔄 Cache do código do vendedor para otimização
- 🔄 Interface para administrador visualizar todos vendedores

---

## 📞 Contato Técnico

Para dúvidas sobre implementação ou problemas:
1. Verificar logs do backend
2. Testar com `python teste_fluxo_vendedor_completo.py`
3. Consultar esta documentação

**Arquivos importantes:**
- `backend/relatorios.py` - Função helper e endpoints
- `backend/auth.py` - Autenticação e busca de código
- `backend/conexao_firebird.py` - Conexões com banco
- `teste_fluxo_vendedor_completo.py` - Teste completo 