import React, { useState } from 'react';
import OrcamentoHeader from './components/OrcamentoHeader';
import useIsMobile from './components/useIsMobile';
import ProdutoAutocomplete from './components/ProdutoAutocomplete';

const ESPECIE_OPCOES = [
  { value: '0', label: 'Dinheiro' },
  { value: '1', label: 'Duplicata' },
  { value: '2', label: 'Boleto' },
  { value: '3', label: 'Carteira' },
  { value: '4', label: 'C. Crédito' },
  { value: '5', label: 'Cheque-Pré' },
  { value: '6', label: 'Outros' },
  { value: '7', label: 'Vale Funcionário' },
  { value: '8', label: 'Vale Crédito Cliente' },
  { value: '9', label: 'Depósito Bancário' },
  { value: '10', label: 'BX p/ Dev. Mercadoria' },
  { value: '11', label: 'BX Com Aut. da Diretoria' },
  { value: '12', label: 'PIX' }
];

function OrcamentoForm() {
  // Estados principais do formulário
  const [cliente, setCliente] = useState(null);
  const [tabela, setTabela] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [dataOrcamento] = useState(new Date().toISOString().slice(0, 10));
  const [validade, setValidade] = useState('');
  const [especie, setEspecie] = useState('0');
  const [desconto, setDesconto] = useState(0);
  const [observacao, setObservacao] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [produtoBusca, setProdutoBusca] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [quantidade, setQuantidade] = useState(1);
  const [valorUnitario, setValorUnitario] = useState(0);
  const [imagem, setImagem] = useState('');

  // Subtotal dos itens
  const subtotal = produtos.reduce((acc, p) => acc + (p.quantidade * p.valor_unitario), 0);
  const total = subtotal - desconto;

  // Detecta se é mobile
  const isMobile = useIsMobile();

  // Accordion para mobile
  const [headerOpen, setHeaderOpen] = useState(true);

  // Handler para adicionar produto
  const handleAdicionarProduto = () => {
    if (!produtoSelecionado) return;
    setProdutos([
      ...produtos,
      {
        codigo: produtoSelecionado.codigo,
        descricao: produtoSelecionado.descricao,
        quantidade: quantidade,
        valor_unitario: valorUnitario,
        valor_total: quantidade * valorUnitario,
        imagem: imagem
      }
    ]);
    setProdutoSelecionado(null);
    setQuantidade(1);
    setValorUnitario(0);
    setImagem('');
    setProdutoBusca('');
  };

  // Handler para remover produto
  const handleRemoverProduto = idx => {
    setProdutos(produtos.filter((_, i) => i !== idx));
  };

  // Handler para submit do orçamento
  const handleSalvar = async () => {
    // Monta o JSON conforme backend
    const payload = {
      cliente_codigo: cliente?.codigo || '',
      nome_cliente: cliente?.nome || '',
      tabela_codigo: tabela,
      formapag_codigo: formaPagamento,
      valor_total: total,
      data_orcamento: dataOrcamento,
      data_validade: validade,
      observacao,
      vendedor_codigo: vendedor,
      especie,
      desconto,
      produtos: produtos.map(p => ({
        codigo: p.codigo,
        descricao: p.descricao,
        quantidade: p.quantidade,
        valor_unitario: p.valor_unitario,
        valor_total: p.valor_total,
        imagem: p.imagem
      }))
    };
    // Envia para o backend
    try {
      const resp = await fetch('/orcamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (data.success) {
        alert('Orçamento salvo com sucesso!');
        // Limpar formulário
        setProdutos([]);
        setCliente(null);
        setTabela('');
        setFormaPagamento('');
        setVendedor('');
        setValidade('');
        setEspecie('0');
        setDesconto(0);
        setObservacao('');
      } else {
        alert('Erro ao salvar: ' + (data.message || 'Erro desconhecido'));
      }
    } catch (err) {
      alert('Erro de conexão ao salvar orçamento.');
    }
  };

  // TODO: Buscar clientes, tabelas, formas de pagamento, vendedores, produtos via API
  // TODO: Implementar autocomplete e selects reais

  return (
    <div className={
      isMobile
        ? 'orcamento-form w-full bg-gray-800 rounded-xl shadow-lg p-2 mt-2 mb-4'
        : 'orcamento-form w-full max-w-7xl mx-auto bg-gray-800 rounded-xl shadow-lg p-8 mt-8 mb-8 flex flex-col min-h-[80vh]'
    }>
      <h2 className="text-2xl font-bold mb-6 text-center text-white">Novo Orçamento</h2>
      {/* Cabeçalho do orçamento: accordion no mobile, aberto no desktop */}
      {isMobile ? (
        <div className="mb-4">
          <button
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gray-900 text-gray-200 font-semibold border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            onClick={() => setHeaderOpen(v => !v)}
            aria-expanded={headerOpen}
          >
            <span>Dados do Orçamento</span>
            <svg className={`w-5 h-5 transition-transform ${headerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </button>
          <div className={`transition-all duration-300 overflow-hidden ${headerOpen ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-2">
              <OrcamentoHeader
                cliente={cliente} setCliente={setCliente}
                tabela={tabela} setTabela={setTabela}
                formaPagamento={formaPagamento} setFormaPagamento={setFormaPagamento}
                vendedor={vendedor} setVendedor={setVendedor}
                dataOrcamento={dataOrcamento}
                validade={validade} setValidade={setValidade}
                especie={especie} setEspecie={setEspecie}
                desconto={desconto} setDesconto={setDesconto}
                observacao={observacao} setObservacao={setObservacao}
                ESPECIE_OPCOES={ESPECIE_OPCOES}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <OrcamentoHeader
            cliente={cliente} setCliente={setCliente}
            tabela={tabela} setTabela={setTabela}
            formaPagamento={formaPagamento} setFormaPagamento={setFormaPagamento}
            vendedor={vendedor} setVendedor={setVendedor}
            dataOrcamento={dataOrcamento}
            validade={validade} setValidade={setValidade}
            especie={especie} setEspecie={setEspecie}
            desconto={desconto} setDesconto={setDesconto}
            observacao={observacao} setObservacao={setObservacao}
            ESPECIE_OPCOES={ESPECIE_OPCOES}
          />
        </div>
      )}
      {/* Itens do orçamento */}
      <div className="mb-8 flex-1">
        <h3 className="text-lg font-semibold mb-4 text-white">Itens</h3>
        <div className="flex gap-2 mb-2">
          <div className="flex-1">
            <ProdutoAutocomplete value={produtoSelecionado} onChange={setProdutoSelecionado} />
          </div>
          <button type="button" onClick={handleAdicionarProduto} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition">Adicionar Produto</button>
        </div>
        <div className="space-y-2">
          {produtos.map((p, idx) => (
            <div key={idx} className="flex items-center bg-gray-900 border border-gray-700 rounded-lg p-3">
              {p.imagem && <img src={p.imagem} alt={p.descricao} className="w-10 h-10 object-cover rounded mr-3" />}
              <div className="flex-1">
                <div className="font-bold text-gray-200">{p.codigo} <span className="font-normal text-gray-300">- {p.descricao}</span></div>
                <div className="text-sm text-gray-400">Qtd: {p.quantidade} | Unit: {p.valor_unitario.toFixed(2)} | Total: {p.valor_total.toFixed(2)}</div>
              </div>
              <button type="button" onClick={() => handleRemoverProduto(idx)} className="ml-3 text-red-400 hover:text-red-600 font-bold text-sm">Remover</button>
            </div>
          ))}
        </div>
      </div>
      {/* Totais */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6 flex flex-col gap-1 text-gray-200 font-semibold text-lg">
        <div className="flex justify-between"><span>Subtotal:</span> <span>{subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Desconto:</span> <span>{desconto.toFixed(2)}</span></div>
        <div className="flex justify-between text-blue-400"><span>TOTAL:</span> <span>{total.toFixed(2)}</span></div>
      </div>
      {/* Ações */}
      <button type="button" onClick={handleSalvar} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold text-xl transition">Salvar Orçamento</button>
    </div>
  );
}

export default OrcamentoForm;
