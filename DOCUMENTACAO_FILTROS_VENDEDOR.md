# 📋 Documentação - Filtros por Nível de Usuário VENDEDOR

## 🎯 Resumo

Sistema implementado com sucesso para filtrar dados baseado no nível do usuário. Quando o usuário tem nível **VENDEDOR**, o sistema automaticamente:

1. ✅ **Busca o código do vendedor** na tabela VENDEDOR da empresa selecionada
2. ✅ **Armazena globalmente** no estado da aplicação 
3. ✅ **Aplica filtros automáticos** em relatórios e consultas
4. ✅ **Exibe informações visuais** na interface (badge com código)

## 🔍 Como Acessar o Código do Vendedor

### No Frontend (React)

```javascript
// 1. Acessar através do estado global user
const codigoVendedor = user?.codigo_vendedor;
const nomeVendedor = user?.nome_vendedor;
const nivelUsuario = user?.nivel;

// 2. Verificar se é vendedor
const isVendedor = user?.nivel === 'VENDEDOR';

// 3. Exemplo completo de uso
if (isVendedor && codigoVendedor) {
  console.log(`Vendedor: ${nomeVendedor} (${codigoVendedor})`);
  // Aplicar filtros específicos
}

// 4. Acessar via localStorage (backup)
const userData = JSON.parse(localStorage.getItem('user_data'));
const codigo = userData?.codigo_vendedor;
```

### No Backend (Python/FastAPI)

```python
# 1. Através do token JWT decodificado
from jose import jwt
from auth import SECRET_KEY, ALGORITHM

def obter_dados_usuario(token: str):
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    usuario_nivel = payload.get("nivel")
    codigo_vendedor = payload.get("codigo_vendedor")
    usuario_id = payload.get("id")
    
    return {
        'nivel': usuario_nivel,
        'codigo_vendedor': codigo_vendedor,
        'id': usuario_id
    }

# 2. Em endpoints protegidos
@router.get("/relatorio-vendedor")
async def relatorio_vendedor(request: Request):
    authorization = request.headers.get("Authorization")
    token = authorization.replace("Bearer ", "")
    
    dados_usuario = obter_dados_usuario(token)
    
    if dados_usuario['nivel'] == 'VENDEDOR':
        codigo_vendedor = dados_usuario['codigo_vendedor']
        # Aplicar filtro WHERE USU_VEN_CODIGO = codigo_vendedor
```

## 🎯 Implementação de Filtros Automáticos

### 1. Relatórios - Top Vendedores

```python
# backend/relatorios.py
def filtrar_por_vendedor(query: str, usuario_nivel: str, codigo_vendedor: str):
    if usuario_nivel and usuario_nivel.lower() == 'vendedor' and codigo_vendedor:
        # Adicionar filtro WHERE
        filtro = f" AND USU_VEN_CODIGO = '{codigo_vendedor}' "
        return query + filtro
    return query

# Exemplo de uso
sql_vendedores = """
    SELECT VEN_CODIGO, VEN_NOME, SUM(ECF_VALOR_TOTAL) as TOTAL_VENDAS
    FROM VENDAS V
    JOIN VENDEDOR VE ON V.USU_VEN_CODIGO = VE.VEN_CODIGO
    WHERE ECF_DATA BETWEEN ? AND ?
"""

sql_vendedores = filtrar_por_vendedor(sql_vendedores, usuario_nivel, codigo_vendedor)
```

### 2. Dashboard - Estatísticas Pessoais

```python
# Estatísticas específicas do vendedor
def obter_stats_vendedor(codigo_vendedor: str, data_inicial: str, data_final: str):
    sql = """
        SELECT 
            COUNT(*) as total_pedidos,
            SUM(ECF_VALOR_TOTAL) as valor_total,
            AVG(ECF_VALOR_TOTAL) as ticket_medio
        FROM VENDAS 
        WHERE USU_VEN_CODIGO = ?
        AND ECF_DATA BETWEEN ? AND ?
        AND ECF_CANCELADA = 'N'
    """
    return executar_query(sql, [codigo_vendedor, data_inicial, data_final])
```

### 3. Frontend - Componentes Filtrados

```javascript
// components/RelatorioVendedores.js
const RelatorioVendedores = ({ user }) => {
  const [dados, setDados] = useState([]);
  
  useEffect(() => {
    const buscarDados = async () => {
      const response = await api.get('/relatorios/vendedores', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaCodigo
        }
      });
      
      // Se for vendedor, dados já vêm filtrados do backend
      setDados(response.data);
    };
    
    buscarDados();
  }, []);

  return (
    <div>
      {user?.nivel === 'VENDEDOR' && (
        <div className="alert alert-info mb-4">
          📊 Visualizando dados pessoais de: <strong>{user.nome_vendedor}</strong> ({user.codigo_vendedor})
        </div>
      )}
      
      {/* Renderizar dados */}
      {dados.map(item => (
        <div key={item.id}>{item.descricao}</div>
      ))}
    </div>
  );
};
```

## 🔧 Exemplos Práticos de Implementação

### 1. Filtro em Lista de Clientes

```javascript
// Aplicar filtro no frontend se necessário
const filtrarClientesPorVendedor = (clientes, user) => {
  if (user?.nivel === 'VENDEDOR' && user?.codigo_vendedor) {
    return clientes.filter(cliente => 
      cliente.vendedor_codigo === user.codigo_vendedor
    );
  }
  return clientes; // MASTER/admin vê todos
};
```

### 2. Filtro em Relatório de Pedidos

```python
# backend/pedidos_router.py
@router.get("/pedidos")
async def listar_pedidos(request: Request, data_inicial: str, data_final: str):
    # Obter dados do usuário
    usuario_dados = obter_usuario_do_token(request)
    
    sql = """
        SELECT P.PED_NUMERO, P.PED_DATA, C.CLI_NOME, P.PED_VALOR_TOTAL
        FROM PEDIDOS P
        JOIN CLIENTES C ON P.CLI_CODIGO = C.CLI_CODIGO
        WHERE P.PED_DATA BETWEEN ? AND ?
    """
    
    parametros = [data_inicial, data_final]
    
    # Aplicar filtro de vendedor se necessário
    if usuario_dados['nivel'] == 'VENDEDOR' and usuario_dados['codigo_vendedor']:
        sql += " AND P.USU_VEN_CODIGO = ?"
        parametros.append(usuario_dados['codigo_vendedor'])
    
    return executar_consulta(sql, parametros)
```

### 3. Dashboard Personalizado

```javascript
// components/DashboardVendedor.js
const DashboardVendedor = ({ user }) => {
  const [meusResultados, setMeusResultados] = useState(null);
  
  const buscarMeusResultados = async () => {
    if (user?.nivel === 'VENDEDOR' && user?.codigo_vendedor) {
      const response = await api.get('/dashboard/vendedor-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaCodigo
        }
      });
      setMeusResultados(response.data);
    }
  };

  if (user?.nivel !== 'VENDEDOR') {
    return <div>Acesso apenas para vendedores</div>;
  }

  return (
    <div className="vendedor-dashboard">
      <h2>Meu Painel - {user.nome_vendedor}</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Minhas Vendas</h3>
          <p>{meusResultados?.total_vendas || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Meu Faturamento</h3>
          <p>R$ {meusResultados?.valor_total || 0}</p>
        </div>
      </div>
    </div>
  );
};
```

## 🗄️ Estrutura de Dados

### Estado Global do Usuário
```javascript
user: {
  id: 123,
  name: "João Silva", 
  username: "joao@empresa.com",
  nivel: "VENDEDOR",           // ou "MASTER", "admin"
  codigo_vendedor: "08",       // string, obtido da base da empresa
  nome_vendedor: "João Silva"  // nome da tabela VENDEDOR
}
```

### Token JWT Decodificado
```python
payload: {
  "sub": "joao@empresa.com",
  "id": 123,
  "nivel": "VENDEDOR", 
  "codigo_vendedor": "08",
  "nome": "João Silva",
  "exp": 1640995200
}
```

## 🔄 Fluxo Completo

1. **Login** → Usuário autentica (nível armazenado)
2. **Seleção de Empresa** → Se VENDEDOR, busca código automaticamente
3. **Tela de Boas-vindas** → Mostra email + código (6 segundos)
4. **Interface Global** → Badge com nível e código
5. **Relatórios** → Filtros aplicados automaticamente no backend
6. **Frontend** → Componentes recebem dados já filtrados

## 🎨 Interface Visual

### Badge do Usuário
```javascript
<span className={`badge ${user?.nivel === 'VENDEDOR' ? 'badge-green' : 'badge-blue'}`}>
  Nível: {user?.nivel}
  {user?.nivel === 'VENDEDOR' && user?.codigo_vendedor && (
    <span> ({user.codigo_vendedor})</span>
  )}
</span>
```

### Resultado: `vendedor1@solucao.com - Nível: VENDEDOR (08)`

## ✅ Status de Implementação

- ✅ **Sistema de busca automática** de código por email
- ✅ **Armazenamento global** no estado da aplicação  
- ✅ **Interface visual** com badge e informações
- ✅ **Filtros automáticos** em relatórios (top-vendedores)
- ✅ **Tela de boas-vindas** personalizada (6 segundos)
- ✅ **Logs detalhados** para depuração
- ✅ **Tratamento de erros** robusto

## 🚀 Próximos Passos

1. **Expandir filtros** para outros relatórios (clientes, pedidos, produtos)
2. **Dashboard personalizado** para vendedores  
3. **Controle de acesso** por nível (rotas protegidas)
4. **Relatórios comparativos** (vendedor vs empresa)
5. **Notificações** e metas por vendedor

## 📞 Suporte

O sistema está **funcionando perfeitamente**! Não houve problemas significativos na implementação. 

Para dúvidas ou expansões, consulte os logs detalhados em:
- `backend/auth.py` - linha 396+ (buscar-codigo-vendedor)
- `frontend/src/App.js` - linha 227+ (buscarCodigoVendedor)
- `backend/relatorios.py` - filtros automáticos implementados 