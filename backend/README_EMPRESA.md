# Seleção de Empresa e Cabeçalho `x-empresa-codigo` no Backend

Este documento explica as regras e o funcionamento da seleção de empresa no backend FastAPI do projeto AppMendes, assim como o papel do cabeçalho HTTP `x-empresa-codigo`.

---

## 1. Visão Geral

O sistema permite selecionar a empresa de duas formas, para suportar diferentes fluxos de uso:

- **Via sessão do usuário:** tradicional, usada em navegação clássica
- **Via cabeçalho HTTP `x-empresa-codigo`:** ideal para componentes frontend independentes (ex: TopClientes, dashboards, mobile)

A lógica de seleção é híbrida: o backend sempre tenta priorizar o cabeçalho, mas mantém compatibilidade com a sessão.

---

## 2. Fluxo de Seleção de Empresa

### a) Cabeçalho HTTP `x-empresa-codigo`
- Toda requisição que depende do contexto da empresa deve enviar o header `x-empresa-codigo` com o código da empresa (por exemplo: `x-empresa-codigo: 1234`).
- O backend verifica esse cabeçalho em todos os endpoints sensíveis, buscando a empresa correspondente no banco.
- Se o header estiver presente e válido, ele é usado como fonte principal de contexto.

### b) Sessão do Usuário
- Caso o cabeçalho não esteja presente, o backend recorre ao método tradicional, buscando a empresa selecionada na sessão global do usuário.
- O endpoint `/selecionar-empresa-session` permite selecionar a empresa via sessão.

---

## 3. Implementação

- A função central é `get_empresa_atual` (arquivo `empresa_manager.py`).
- Diversos endpoints e funções utilizam `request.headers.get('x-empresa-codigo')` para identificar a empresa.
- O middleware de CORS está configurado para aceitar o cabeçalho personalizado, garantindo funcionamento em ambientes cross-origin.
- Ferramentas de diagnóstico e teste (ex: `diagnostico_acesso.py`, `teste_cabecalhos.py`) ajudam a validar se o cabeçalho está sendo recebido corretamente.

---

## 4. Boas Práticas

- **Frontend:** Sempre envie o cabeçalho `x-empresa-codigo` em chamadas que dependem do contexto de empresa.
- **Backend:** Sempre priorize o cabeçalho, mas mantenha o fallback para a sessão para garantir compatibilidade.
- **Diagnóstico:** Utilize os endpoints de teste para validar se o fluxo de seleção de empresa está funcionando corretamente.

---

## 5. Exemplos de Uso

### Exemplo de requisição com header:

```
GET /relatorios/clientes HTTP/1.1
Host: api.mendessolucao.site
Authorization: Bearer <token>
x-empresa-codigo: 1234
```

### Trecho de código relevante (backend):

```python
empresa_codigo = request.headers.get("x-empresa-codigo")
if empresa_codigo:
    # Buscar empresa pelo código
    ...
else:
    # Buscar empresa pela sessão
    ...
```

---

## 6. Referências
- Código-fonte: `empresa_manager.py`, `relatorios.py`, `diagnostico_acesso.py`, etc.
- Documentação frontend: `frontend/API_USAGE.md`

---

Dúvidas ou sugestões? Consulte o responsável técnico do projeto.
