# Orçamentos (Pedidos) – Documentação Técnica

## Objetivo
Este módulo permite criar, consultar e gerenciar orçamentos (pedidos) no sistema AppMendes. O orçamento é composto por um cabeçalho (dados gerais) e itens (produtos e quantidades).

---

## Como é gerado o sequencial do orçamento (ECF_NUMERO)

O número sequencial do orçamento (campo **ECF_NUMERO**) é obtido e atualizado da seguinte forma:

1. O sistema consulta a tabela **CODIGO** para buscar o campo **COD_PROXVALOR** onde `COD_TABELA = 'ORCAMENT'` e `COD_NOMECAMPO = 'ECF_NUMERO'`.
2. Se não existir esse registro, ele é criado automaticamente com o valor inicial desejado.
3. O valor retornado é utilizado como número do novo orçamento.
4. Após inserir o orçamento, o sistema atualiza o campo **COD_PROXVALOR** na tabela **CODIGO** para o próximo valor (normalmente, o valor utilizado + 1).

Esse mecanismo garante que cada orçamento receba um número único e sequencial, evitando conflitos e duplicidades.

---

## Tabelas e consultas auxiliares para cadastro de orçamento

### Clientes
- **Tabela:** CLIENTES
- **Campos típicos:** CLI_CODIGO, CLI_NOME, CLI_ATIVO
- **Exemplo SELECT:**
  ```sql
  SELECT CLI_CODIGO, CLI_NOME FROM CLIENTES WHERE CLI_ATIVO = 0 ORDER BY CLI_NOME
  ```

### Tabela de Preços
- **Tabela:** TABELA
- **Campos típicos:** TAB_CODIGO, TAB_NOME
- **Exemplo SELECT:**
  ```sql
  SELECT TAB_CODIGO, TAB_NOME FROM TABELA ORDER BY TAB_CODIGO
  ```

### Forma de Pagamento
- **Tabela:** FORMAPAG
- **Campos:** FPG_COD, FPG_NOME
- **Exemplo SELECT:**
  ```sql
  SELECT FORMAPAG.FPG_COD, FORMAPAG.FPG_COD || ' - ' || FORMAPAG.FPG_NOME AS FPG_NOME FROM FORMAPAG ORDER BY FORMAPAG.FPG_COD
  ```

### Vendedor
- **Tabela:** VENDEDOR
- **Campos:** VEN_CODIGO, VEN_NOME, VEN_ATIVO
- **Exemplo SELECT:**
  ```sql
  SELECT VENDEDOR.VEN_CODIGO, VENDEDOR.VEN_CODIGO || ' - ' || VENDEDOR.VEN_NOME AS Vendedor FROM VENDEDOR WHERE VENDEDOR.VEN_ATIVO = 0 ORDER BY VENDEDOR.VEN_CODIGO
  ```
- **Regra de negócio:**
  - Se usuário for "VENDEDOR", já seta o vendedor logado e bloqueia edição.
  - Se for "MASTER" ou outro nível, lista todos os vendedores ativos para escolha.

### Produtos
- **Tabela:** PRODUTO (com JOIN em GRUPOS)
- **Campos:** PRO_CODIGO, PRO_DESCRICAO, UNI_CODIGO, NCM, PRO_VENDA, PRO_QUANTIDADE, PRO_INATIVO, GRU_DESCRICAO, PRO_REF, PRO_APLICACAO, PRO_EMBALAGEM, PRO_MINIMA, PRO_MAXIMA, PRO_VENDAPZ, PRO_QUITE_CODIGO, **PRO_IMAGEM**
- **Exemplo SELECT:**
  ```sql
  SELECT
    PRODUTO.PRO_CODIGO,
    PRODUTO.PRO_DESCRICAO,
    PRODUTO.UNI_CODIGO,
    PRODUTO.NCM,
    PRODUTO.PRO_VENDA,
    PRODUTO.PRO_QUANTIDADE,
    PRODUTO.PRO_INATIVO,
    GRUPOS.GRU_DESCRICAO,
    PRODUTO.PRO_REF,
    PRODUTO.PRO_APLICACAO,
    PRODUTO.PRO_EMBALAGEM,
    PRODUTO.PRO_MINIMA,
    PRODUTO.PRO_MAXIMA,
    PRODUTO.PRO_VENDAPZ,
    PRODUTO.PRO_QUITE_CODIGO,
    PRODUTO.PRO_IMAGEM
  FROM
    PRODUTO
    LEFT JOIN GRUPOS ON PRODUTO.GRU_CODIGO = GRUPOS.GRU_CODIGO
  /*WHERE_NEW*/
  ```
- **Observação:** O campo **PRO_IMAGEM** deve ser retornado tanto na busca de produtos quanto salvo/informado ao inserir o item do orçamento.

---

## Campo "Espécie" no Orçamento

O campo **Espécie** define o tipo de recebimento/pagamento do orçamento. Ele deve ser apresentado como um select na tela, com as seguintes opções:

| Valor | Descrição                   |
|-------|-----------------------------|
| 0     | Dinheiro                    |
| 1     | Duplicata                   |
| 2     | Boleto                      |
| 3     | Carteira                    |
| 4     | C. Crédito                  |
| 5     | Cheque-Pré                  |
| 6     | Outros                      |
| 7     | Vale Funcionário            |
| 8     | Vale Crédito Cliente        |
| 9     | Depósito Bancário           |
| 10    | BX p/ Dev. Mercadoria       |
| 11    | BX Com Aut. da Diretoria    |
| 12    | PIX                         |

Exemplo de select HTML:
```html
<select class="form-select" id="especie" name="especie">
  <option value="0">Dinheiro</option>
  <option value="1">Duplicata</option>
  <option value="2">Boleto</option>
  <option value="3">Carteira</option>
  <option value="4">C. Crédito</option>
  <option value="5">Cheque-Pré</option>
  <option value="6">Outros</option>
  <option value="7">Vale Funcionário</option>
  <option value="8">Vale Crédito Cliente</option>
  <option value="9">Depósito Bancário</option>
  <option value="10">BX p/ Dev. Mercadoria</option>
  <option value="11">BX Com Aut. da Diretoria</option>
  <option value="12">PIX</option>
</select>
```

O valor selecionado deve ser enviado no campo `especie` do orçamento.

---

## Estrutura do Orçamento

### Tabela ORCAMENT (Cabeçalho)
- **ECF_NUMERO**: Número do orçamento (gerado automaticamente)
- **ECF_DATA**: Data do orçamento
- **CLI_CODIGO**: Código do cliente
- **NOME**: Nome do cliente
- **ECF_TAB_COD**: Código da tabela de preço
- **ECF_FPG_COD**: Código da forma de pagamento
- **ECF_TOTAL**: Valor total do orçamento
- **DATA_VALIDADE**: Data de validade do orçamento
- **PAR_PARAMETRO**: Parâmetro de status
- **VEN_CODIGO**: Código do vendedor
- **ECF_OBS**: Observação
- **ECF_ESPECIE**: Espécie de pagamento
- **EMP_CODIGO**: Código da empresa
- **ECF_DESCONTO**: Valor do desconto

### Tabela ITORC (Itens)
- **ECF_NUMERO**: Número do orçamento (referência ao cabeçalho)
- **IEC_SEQUENCIA**: Sequência do item
- **PRO_CODIGO**: Código do produto
- **PRO_DESCRICAO**: Descrição do produto
- **PRO_QUANTIDADE**: Quantidade
- **PRO_VENDA**: Valor unitário
- **IOR_TOTAL**: Quantidade * Valor unitário

---

## Fluxo de Criação de Orçamento
1. Buscar o próximo número de orçamento na tabela CODIGO.
2. Inserir o cabeçalho na tabela ORCAMENT.
3. Inserir os itens na tabela ITORC.
4. Atualizar o próximo número em CODIGO.
5. Commit da transação.

---

## Estrutura do JSON para criação de orçamento
```json
{
  "cliente_codigo": "123",
  "nome_cliente": "Exemplo Ltda",
  "tabela_codigo": "1",
  "formapag_codigo": "2",
  "valor_total": 150.00,
  "data_orcamento": "2025-05-26",
  "data_validade": "2025-06-02",
  "observacao": "Entrega rápida",
  "vendedor_codigo": "5",
  "especie": "1",
  "desconto": 10.00,
  "produtos": [
    {
      "codigo": "P001",
      "descricao": "Produto 1",
      "quantidade": 2,
      "valor_unitario": 50.00,
      "valor_total": 100.00
    },
    {
      "codigo": "P002",
      "descricao": "Produto 2",
      "quantidade": 1,
      "valor_unitario": 60.00,
      "valor_total": 60.00
    }
  ]
}
```

---

## Campos obrigatórios na tela do orçamento
- Cliente (busca/seleção)
- Nome do cliente (preenchido automaticamente)
- Tabela de preço (seleção)
- Forma de pagamento (seleção)
- Data do orçamento (auto)
- Data de validade (editável, default +7 dias)
- Observação (texto livre)
- Vendedor (auto/preenchido)
- Desconto (numérico, opcional)
- Lista de produtos (adicionar/remover)
  - Código, descrição, quantidade, valor unitário, valor total
- Valor total do orçamento

---

## Ações disponíveis
- Salvar orçamento
- Limpar/cancelar
- (Opcional) Imprimir ou gerar PDF

---

## Observações
- O número do orçamento é gerado automaticamente e não deve ser editável.
- O backend valida duplicidade e integridade dos dados.
- O frontend deve calcular e exibir o valor total em tempo real.

---

> Última atualização: 26/05/2025
