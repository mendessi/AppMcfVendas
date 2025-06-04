# README - Orçamento/Pedido de Venda (OrcamentoForm.js)

## Visão Geral

O arquivo `OrcamentoForm.js` é o componente principal responsável por toda a lógica e interface da tela de Orçamento/Pedido de Venda do sistema. Ele foi desenvolvido em React e integra-se ao backend Firebird via API. Este componente centraliza o controle de estados, validações, cálculos, usabilidade e comunicação com o backend, garantindo uma experiência fluida e segura para o usuário.

---

## Principais Responsabilidades

- **Gerenciamento de Estados:** Controla todos os campos do orçamento, como cliente, tabela de preço, forma de pagamento, vendedor, validade, espécie, desconto, observação e lista de produtos.
- **Adição, Edição e Remoção de Produtos:** Permite buscar, adicionar, editar e remover produtos do orçamento, controlando quantidade, valor unitário, valor total, estoque e preço mínimo.
- **Validações Inteligentes:**
  - O valor unitário nunca pode ser menor que o preço mínimo, nem zero ou vazio.
  - Ao sair do campo de valor unitário, se o valor for inválido, exibe alerta, limpa o campo e mantém o foco para correção.
  - Se o campo de valor unitário ficar vazio ou zero, preenche automaticamente com o valor de venda do produto.
  - O valor unitário inicial de um novo produto é sempre o valor de venda (pro_venda).
  - Ao salvar, garante que nenhum item seja salvo com valor unitário zero ou vazio.
  - O campo de quantidade também possui seleção automática de texto ao focar, facilitando a edição.
- **Cálculo de Totais:** Soma subtotal, desconto e total geral do orçamento em tempo real.
- **Salvamento e Envio:** Monta o JSON completo do orçamento e envia para o backend Firebird via API, validando todos os dados antes do envio.
- **Cache Local:** Salva e recupera orçamentos em andamento no cache/localStorage, permitindo retomar orçamentos não finalizados.
- **Usabilidade e Interface:**
  - Seleção automática de texto ao focar nos campos de quantidade e valor unitário.
  - Feedback visual, atalhos de teclado, toasts e modais para melhor experiência do usuário.
  - Interface adaptada para desktop e mobile.
- **Integração com Componentes Auxiliares:** Utiliza componentes como `OrcamentoHeader`, `ProdutoAutocomplete`, `Toast`, `VendedorSelect`, entre outros.

---

## Regras de Validação do Valor Unitário

1. **Digitação Livre:** O usuário pode digitar livremente, inclusive apagar, deixar vazio ou inserir zeros à esquerda.
2. **Validação ao Sair do Campo:**
   - Se o valor for menor que o preço mínimo, exibe alerta, limpa o campo e mantém o foco.
   - Se o campo ficar vazio, nulo ou zero, preenche automaticamente com o valor de venda (pro_venda).
3. **Novo Produto:** O valor unitário inicial é sempre o valor de venda (pro_venda).
4. **Salvar Orçamento:** Antes de enviar ao backend, todos os valores unitários vazios ou zero são preenchidos automaticamente com o valor de venda.
5. **Nunca Salvar com Zero:** Não é possível salvar um item com valor unitário zero ou vazio.
6. **Select All:** Ao focar nos campos de valor unitário e quantidade, todo o texto é selecionado para facilitar a edição.

---

## Dicas para Manutenção

- **Não altere a lógica de gravação sem necessidade.** Teste sempre em ambiente de homologação antes de subir para produção.
- **Documente qualquer alteração importante** neste arquivo e atualize este README.
- **Evite duplicidade de arquivos:** Certifique-se de editar apenas o `frontend/src/OrcamentoForm.js`.
- **Valide sempre as integrações com o backend Firebird** para garantir compatibilidade de dados.
- **Mantenha a usabilidade:** Qualquer melhoria deve preservar a experiência do usuário, principalmente nas validações e preenchimentos automáticos.

---

## Estrutura do Componente

- **Estados principais:** cliente, tabela, formaPagamento, vendedor, validade, especie, desconto, observacao, produtos, etc.
- **Funções principais:**
  - handleAdicionarProdutoDireto
  - handleRemoverProduto
  - handleQuantidadeChange
  - handleValorUnitarioChange
  - validarPrecoAoTerminar
  - handleSalvar
  - salvarNoCache
  - showToast (feedback visual)
- **Componentes auxiliares:** OrcamentoHeader, ProdutoAutocomplete, Toast, VendedorSelect, OrcamentosCache

---

## Observações Finais

- Este componente foi desenvolvido para garantir máxima segurança e flexibilidade na operação de orçamentos.
- Qualquer dúvida sobre o funcionamento ou necessidade de ajuste, consulte este README ou peça suporte ao responsável técnico. 