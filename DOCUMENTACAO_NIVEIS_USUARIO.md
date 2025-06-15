# 📋 Documentação - Sistema de Níveis de Usuário - AppMendes/Visão360

## 🎯 Visão Geral

Sistema completo de controle de acesso baseado em níveis de usuário, com busca automática de código de vendedor para filtros específicos.

---

## 📊 Estrutura do Sistema

### 🗄️ **Tabelas Envolvidas**

#### 1. **USUARIOS_APP** (Tabela Principal)
```sql
-- Campos principais para autenticação
ID              INT             -- ID único do usuário
EMAIL           VARCHAR(100)    -- Email/login do usuário
SENHA           VARCHAR(255)    -- Senha criptografada
NOME            VARCHAR(100)    -- Nome do usuário
NIVEL_ACESSO    VARCHAR(20)     -- Nível: 'VENDEDOR', 'MASTER', 'admin'
USU_VEN_CODIGO  VARCHAR(20)     -- [OPCIONAL] Código manual do vendedor
ATIVO           CHAR(1)         -- Status: 'S' = Ativo, 'N' = Inativo
```

#### 2. **VENDEDOR** (Tabela de Códigos Automáticos)
```sql
-- Tabela para busca automática de código por email
VEN_CODIGO      VARCHAR(20)     -- Código do vendedor (ex: '08', '123')
VEN_EMAIL       VARCHAR(100)    -- Email do vendedor
VEN_NOME        VARCHAR(100)    -- Nome do vendedor
-- outros campos...
```

---

## 🔐 Níveis de Acesso

### 🏢 **MASTER**
- **Acesso**: Total à empresa
- **Pode ver**: Todos clientes, pedidos, orçamentos, relatórios
- **Permissões**: Criar, editar, excluir qualquer registro
- **Interface**: Badge azul `Nível: MASTER`

### 👨‍💼 **VENDEDOR**
- **Acesso**: Restrito aos dados do vendedor
- **Pode ver**: Apenas clientes/pedidos vinculados ao seu código
- **Permissões**: Limitadas ao seu escopo de vendas
- **Interface**: Badge verde `Nível: VENDEDOR (código)`
- **Código**: Obtido automaticamente da tabela VENDEDOR

### ⚙️ **admin** 
- **Acesso**: Similar ao MASTER
- **Uso**: Principalmente para testes e desenvolvimento
- **Interface**: Badge azul `Nível: admin`

---

## 🚀 Implementação Técnica

### 📡 **Backend (auth.py)**

#### **Fluxo de Login:**
```python
1. Usuário faz login com email/senha
2. Sistema verifica USUARIOS_APP.NIVEL_ACESSO
3. Se NIVEL = 'VENDEDOR':
   a) Busca: SELECT VEN_CODIGO FROM VENDEDOR WHERE VEN_EMAIL = 'email_usuario'
   b) Se não encontrar, busca: SELECT USU_VEN_CODIGO FROM USUARIOS_APP WHERE ID = usuario_id
4. Retorna token JWT com: nivel + codigo_vendedor
```

#### **Exemplo de Resposta do Login:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "usuario_id": 123,
  "usuario_nome": "João Silva",
  "usuario_nivel": "VENDEDOR",
  "codigo_vendedor": "08"
}
```

### 🎨 **Frontend (App.js)**

#### **Exibição na Interface:**
```javascript
// Localização: Barra superior, ao lado do email
// Formato para VENDEDOR: "email - Nível: VENDEDOR (08)"
// Formato para MASTER: "email - Nível: MASTER"

// Código de exibição:
{user?.nivel === 'VENDEDOR' && user?.codigo_vendedor && (
  <span className="ml-1">({user.codigo_vendedor})</span>
)}
```

#### **Cores dos Badges:**
- **VENDEDOR**: Verde (`bg-green-700` / `bg-green-100`)
- **MASTER/admin**: Azul (`bg-blue-700` / `bg-blue-100`)
- **Outros**: Cinza (fallback)

---

## 🔄 Processo de Migração

### 📥 **Situação Atual (100+ empresas)**
- Campo `USU_VEN_CODIGO` existe mas está vazio
- Usuários já cadastrados sem código manual

### 💡 **Solução Implementada**
1. **Busca Automática**: Query na tabela VENDEDOR por email
2. **Fallback**: Se não encontrar, verifica USU_VEN_CODIGO
3. **Zero Configuração**: Não precisa alterar dados existentes

### ⚡ **Vantagens**
- ✅ Não requer migração manual de 100+ empresas
- ✅ Funciona imediatamente se vendedor tem email cadastrado
- ✅ Mantém compatibilidade com código manual (USU_VEN_CODIGO)
- ✅ Log completo para diagnóstico

---

## 🎯 Casos de Uso por Nível

### 👨‍💼 **VENDEDOR**
```sql
-- Filtros automáticos aplicados:
WHERE codigo_vendedor = 'X'

-- Exemplos:
-- Clientes do vendedor
-- Pedidos do vendedor  
-- Orçamentos do vendedor
-- Comissões do vendedor
```

### 🏢 **MASTER**
```sql
-- Sem filtros, vê tudo:
-- Todos os clientes da empresa
-- Todos os pedidos da empresa
-- Relatórios consolidados
-- Gestão de vendedores
```

---

## 🛠️ Cache e Persistência

### 💾 **LocalStorage Frontend**
```javascript
// Dados salvos no navegador:
{
  "id": 123,
  "name": "João Silva", 
  "username": "joao@empresa.com",
  "nivel": "VENDEDOR",
  "codigo_vendedor": "08"
}
```

### 🔄 **Renovação Automática**
- **Problema**: Cache antigo sem campo `nivel`
- **Solução**: Detecção automática e limpeza de dados incompletos
- **Resultado**: Força novo login automaticamente

---

## 📈 Próximas Implementações

### 🎯 **Filtros por Vendedor** (Em desenvolvimento)
- Dashboard personalizado
- Relatórios específicos
- Clientes do vendedor
- Histórico de vendas

### 🔐 **Controle de Menu** (Planejado)
- Ocultar opções para VENDEDOR
- Funcionalidades específicas por nível
- Aprovações hierárquicas

### 📊 **Relatórios Avançados** (Futuro)
- Comissões por vendedor
- Metas e indicadores
- Ranking de vendas

---

## 🧪 Como Testar

### 1️⃣ **Teste de VENDEDOR:**
```sql
-- Criar vendedor na tabela VENDEDOR:
INSERT INTO VENDEDOR (VEN_CODIGO, VEN_EMAIL, VEN_NOME) 
VALUES ('08', 'vendedor@empresa.com', 'João Vendedor');

-- Criar usuário app:
INSERT INTO USUARIOS_APP (EMAIL, SENHA, NOME, NIVEL_ACESSO) 
VALUES ('vendedor@empresa.com', 'hash_senha', 'João Vendedor', 'VENDEDOR');
```

### 2️⃣ **Resultado Esperado:**
- Login: `vendedor@empresa.com`
- Interface: `vendedor@empresa.com - Nível: VENDEDOR (08)`
- Badge: Verde com código entre parênteses

### 3️⃣ **Teste de MASTER:**
```sql
-- Usuário master:
INSERT INTO USUARIOS_APP (EMAIL, SENHA, NOME, NIVEL_ACESSO) 
VALUES ('master@empresa.com', 'hash_senha', 'Admin Master', 'MASTER');
```

### 4️⃣ **Resultado Esperado:**
- Login: `master@empresa.com`  
- Interface: `master@empresa.com - Nível: MASTER`
- Badge: Azul sem código

---

## 🐛 Logs e Diagnóstico

### 📝 **Logs do Backend:**
```python
# Sucesso:
"Código do vendedor encontrado por email joao@empresa.com: 08"

# Aviso:
"Nenhum código de vendedor encontrado para o email joao@empresa.com"

# Fallback:
"Código de vendedor obtido da tabela USUARIOS_APP: 08"

# Erro:
"Erro ao buscar código do vendedor por email: [detalhes]"
```

### 🔍 **Como Depurar:**
1. Verificar logs do backend durante login
2. Inspecionar localStorage no navegador
3. Verificar se email existe na tabela VENDEDOR
4. Confirmar NIVEL_ACESSO na tabela USUARIOS_APP

---

## ✅ Status da Implementação

- ✅ **Backend**: Busca automática de código por email
- ✅ **Frontend**: Exibição do nível com código
- ✅ **Cache**: Limpeza automática de dados antigos
- ✅ **Logs**: Sistema completo de diagnóstico
- ✅ **Fallback**: Compatibilidade com USU_VEN_CODIGO
- 🚧 **Filtros**: Em desenvolvimento
- 📋 **Menu**: Planejado
- 📊 **Relatórios**: Futuro

---

## 📞 Contato e Suporte

**Desenvolvido para**: AppMendes/Visão360  
**Tecnologias**: Python/FastAPI + React + Firebird  
**Arquitetura**: JWT Authentication + Role-Based Access Control  

**🎯 Sistema robusto, escalável e pronto para crescimento!** 🚀 