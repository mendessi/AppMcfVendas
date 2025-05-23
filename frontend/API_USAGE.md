# Padrão de Consumo da API AppMendes

Este documento define o padrão obrigatório para todas as chamadas à API protegidas (dados sensíveis, multiempresa, etc) no frontend React do AppMendes.

## 1. Headers obrigatórios em TODAS as requisições autenticadas

Sempre envie **dois headers** em toda requisição protegida:

- `Authorization`: Token JWT do usuário autenticado
  - Exemplo: `Authorization: Bearer <token>`
- `x-empresa-codigo`: Código da empresa selecionada
  - Exemplo: `x-empresa-codigo: 1234`

Exemplo de uso com `fetch`:
```js
const token = localStorage.getItem('token');
const empresaCodigo = empresaSelecionada?.cli_codigo || empresaSelecionada?.codigo;
const headers = {
  'Authorization': `Bearer ${token}`,
  'x-empresa-codigo': empresaCodigo,
  'Content-Type': 'application/json'
};
fetch(`${API_URL}/algum-endpoint`, { headers });
```

Exemplo de uso com `axios`:
```js
axios.get(`${API_URL}/algum-endpoint`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-empresa-codigo': empresaCodigo,
    'Content-Type': 'application/json'
  }
});
```

## 2. Fluxo de seleção de empresa
- O código da empresa deve SEMPRE ser obtido do contexto global (ex: prop `empresaSelecionada`, ou localStorage se for componente isolado).
- Nunca "chutar" um código de empresa; sempre use o valor selecionado pelo usuário.

## 3. Consequências de não seguir o padrão
- Se faltar qualquer header, o backend retorna erro 401 (Não autorizado) ou 500 (Erro interno).
- O backend NUNCA retorna dados sensíveis sem ambos os headers.

## 4. Checklist rápido para novos endpoints/components
- [ ] Está enviando `Authorization`?
- [ ] Está enviando `x-empresa-codigo`?
- [ ] O código da empresa está correto (do contexto/prop)?
- [ ] O token está válido?

## 5. Exemplos de endpoints afetados
- `/relatorios/clientes`
- `/relatorios/top-clientes`
- `/relatorios/vendas-por-dia`
- `/produtos/lista`
- `/pedidos/lista`

## 6. Dica de debug
- Sempre inspecione a aba Network do navegador e confira os headers enviados.
- Se der erro 401/500, confira se ambos estão presentes e corretos.

---

**Mantenha este padrão documentado e revisite sempre que implementar novos componentes!**
