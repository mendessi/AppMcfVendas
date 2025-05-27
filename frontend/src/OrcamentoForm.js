import React, { useState, useRef, useEffect } from 'react';
import OrcamentoHeader from './components/OrcamentoHeader';
import useIsMobile from './components/useIsMobile';
import ProdutoAutocomplete from './components/ProdutoAutocomplete';
import api from './services/api';
import { FaPlus, FaSave, FaTrash } from 'react-icons/fa';
import ClienteAutocomplete from './components/ClienteAutocomplete';

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
  const [dataOrcamento] = useState(new Date().toISOString().split('T')[0]);
  const [validade, setValidade] = useState(new Date().toISOString().split('T')[0]);
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

  const quantidadeRefs = useRef([]);
  const precoRefs = useRef([]);
  const quantidadeInputRef = useRef(null);

  // Novos estados para os dados iniciais
  const [vendedores, setVendedores] = useState([]);
  const [tabelas, setTabelas] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);

  const [ultimoItemIndex, setUltimoItemIndex] = useState(null);

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function fetchDadosIniciais() {
      try {
        console.log('Buscando dados iniciais...');
        const [respVendedores, respTabelas, respFormas] = await Promise.all([
          api.get('/relatorios/vendedores'),
          api.get('/relatorios/tabelas'),
          api.get('/relatorios/formapag')
        ]);

        console.log('Dados recebidos:', {
          vendedores: respVendedores.data,
          tabelas: respTabelas.data,
          formas: respFormas.data
        });

        if (Array.isArray(respVendedores.data)) {
          setVendedores(respVendedores.data);
        } else {
          console.error('Dados de vendedores inválidos:', respVendedores.data);
        }

        if (Array.isArray(respTabelas.data)) {
          setTabelas(respTabelas.data);
        } else {
          console.error('Dados de tabelas inválidos:', respTabelas.data);
        }

        if (Array.isArray(respFormas.data)) {
          setFormasPagamento(respFormas.data);
        } else {
          console.error('Dados de formas de pagamento inválidos:', respFormas.data);
        }
      } catch (err) {
        console.error('Erro ao carregar dados iniciais:', err);
        // Adicionar tratamento de erro visual aqui se necessário
      }
    }

    fetchDadosIniciais();
  }, []);

  // Handler para adicionar produto
  const handleAdicionarProduto = () => {
    if (!produtoSelecionado) return;
    const valorUnit = produtoSelecionado.pro_venda || produtoSelecionado.valor_unitario || 0;
    const novoItem = {
      codigo: produtoSelecionado.pro_codigo || produtoSelecionado.codigo,
      descricao: produtoSelecionado.pro_descricao || produtoSelecionado.descricao,
      quantidade: 1,
      valor_unitario: valorUnit,
      valor_total: valorUnit * 1,
      imagem: produtoSelecionado.pro_imagem || produtoSelecionado.imagem || ''
    };
    setProdutos([...produtos, novoItem]);
    setProdutoSelecionado(null);
    setQuantidade(1);
    setValorUnitario(0);
    setImagem('');
    setProdutoBusca('');
    setTimeout(() => {
      if (quantidadeRefs.current[produtos.length]) {
        quantidadeRefs.current[produtos.length].focus();
      }
    }, 100);
  };

  const formatarNumero = (valor) => {
    return valor.toString().replace('.', ',');
  };

  const parseNumero = (valor) => {
    return parseFloat(valor.toString().replace(',', '.')) || 0;
  };

  const handleQuantidadeChange = (idx, value) => {
    // Converter vírgula para ponto e garantir número válido
    const novaQtd = parseFloat(value.replace(',', '.')) || 0;
    const novosProdutos = produtos.map((p, i) =>
      i === idx ? { 
        ...p, 
        quantidade: novaQtd,
        valor_total: novaQtd * p.valor_unitario 
      } : p
    );
    setProdutos(novosProdutos);
  };

  const handleValorUnitarioChange = (idx, value) => {
    const novoValor = parseNumero(value);
    const novosProdutos = produtos.map((p, i) =>
      i === idx ? { 
        ...p, 
        valor_unitario: novoValor, 
        valor_total: novoValor * p.quantidade 
      } : p
    );
    setProdutos(novosProdutos);
  };

  // Handler para remover produto
  const handleRemoverProduto = idx => {
    setProdutos(produtos.filter((_, i) => i !== idx));
    setUltimoItemIndex(null);
  };

  const handleAdicionarProdutoDireto = (produto) => {
    if (!produto) return;
    const valorUnit = produto.pro_venda || produto.valor_unitario || 0;
    const novoItem = {
      codigo: produto.pro_codigo || produto.codigo,
      descricao: produto.pro_descricao || produto.descricao,
      quantidade: 1,
      valor_unitario: valorUnit,
      valor_total: valorUnit * 1,
      imagem: produto.pro_imagem || produto.imagem || '',
      timestamp: Date.now()
    };
    
    const novosProdutos = [novoItem, ...produtos];
    setProdutos(novosProdutos);
    setProdutoSelecionado(null);
    setQuantidade(1);
    setValorUnitario(0);
    setImagem('');
    setProdutoBusca('');
    
    setUltimoItemIndex(0);
    
    setTimeout(() => {
      if (quantidadeRefs.current[0]) {
        quantidadeRefs.current[0].focus();
      }
    }, 100);
  };

  // Handler para submit do orçamento
  const handleSalvar = async () => {
    if (!cliente?.nome) {
      alert('Por favor, selecione um cliente.');
      return;
    }
    if (produtos.length === 0) {
      alert('Adicione pelo menos um produto ao orçamento.');
      return;
    }
    setShowModal(true);
  };

  const confirmarSalvar = async () => {
    setShowModal(false);
    try {
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

      const response = await api.post('/api/orcamentos', payload);
      const data = response.data;
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
      console.error('Erro ao salvar orçamento:', err);
      alert('Erro de conexão ao salvar orçamento.');
    }
  };

  // TODO: Buscar clientes, tabelas, formas de pagamento, vendedores, produtos via API
  // TODO: Implementar autocomplete e selects reais

  return (
    <div className="min-h-screen w-full bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 max-w-full sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto">
          {/* Cabeçalho */}
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-white mb-8">Novo Orçamento</h2>
            
            {/* Grid de campos do cabeçalho */}
            <div className="grid grid-cols-1 gap-6">
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
                vendedores={vendedores}
                tabelas={tabelas}
                formasPagamento={formasPagamento}
                inputClassName="p-3 rounded-lg border border-gray-600 bg-gray-900 text-gray-100 text-lg"
                selectClassName="p-3 rounded-lg border border-gray-600 bg-gray-900 text-gray-100 text-lg"
              />
            </div>
          </div>

          {/* Área de Produtos */}
          <div className="p-6">
            {/* Busca de Produtos */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <ProdutoAutocomplete
                  value={produtoSelecionado}
                  onChange={setProdutoSelecionado}
                  onAdd={handleAdicionarProdutoDireto}
                />
              </div>
              <button
                className="w-full md:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-lg font-bold rounded-lg shadow transition-colors flex items-center justify-center gap-2 min-w-[200px]"
                onClick={handleAdicionarProduto}
                type="button"
              >
                <FaPlus /> Adicionar Produto
              </button>
            </div>

            {/* Lista de Produtos */}
            <div className="space-y-4 mb-6">
              {produtos.map((item, idx) => (
                <div
                  key={idx}
                  className={`bg-gray-900 rounded-lg p-4 border ${
                    idx === ultimoItemIndex 
                      ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
                      : 'border-gray-700'
                  } transition-all duration-300`}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="font-mono text-blue-400 text-lg font-bold mb-1">{item.codigo}</div>
                      <div className="text-gray-100 text-lg font-semibold">{item.descricao}</div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 whitespace-nowrap">Qtd:</span>
                        <input
                          type="text"
                          pattern="[0-9]*[.,]?[0-9]*"
                          inputMode="decimal"
                          className="w-24 p-2 rounded border border-gray-600 bg-gray-900 text-gray-100 text-lg text-right"
                          value={typeof item.quantidade === 'number' ? item.quantidade.toString().replace('.', ',') : item.quantidade}
                          onChange={e => {
                            const value = e.target.value.replace(',', '.');
                            const quantidade = parseFloat(value);
                            if (!isNaN(quantidade) || value === '' || value === '.') {
                              handleQuantidadeChange(idx, value);
                            }
                          }}
                          onFocus={e => e.target.select()}
                          ref={el => quantidadeRefs.current[idx] = el}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 whitespace-nowrap">Valor:</span>
                        <input
                          type="text"
                          pattern="[0-9]*[.,]?[0-9]*"
                          inputMode="decimal"
                          className="w-28 p-2 rounded border border-gray-600 bg-gray-900 text-gray-100 text-lg text-right"
                          value={typeof item.valor_unitario === 'number' ? item.valor_unitario.toString().replace('.', ',') : item.valor_unitario}
                          onChange={e => handleValorUnitarioChange(idx, e.target.value)}
                          onFocus={e => e.target.select()}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 whitespace-nowrap">Total:</span>
                        <span className="text-blue-400 font-bold text-lg min-w-[120px] text-right">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_total)}
                        </span>
                      </div>
                      <button
                        className="w-full sm:w-auto px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded shadow transition-colors flex items-center justify-center gap-2"
                        onClick={() => handleRemoverProduto(idx)}
                        type="button"
                      >
                        <FaTrash /> Remover
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totalizador */}
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
              <div className="flex flex-col items-end gap-2">
                <div className="text-lg text-gray-300">
                  Subtotal: <span className="font-bold text-white">{subtotal.toFixed(2)}</span>
                </div>
                <div className="text-lg text-gray-300">
                  Desconto: <span className="font-bold text-yellow-400">{desconto.toFixed(2)}</span>
                </div>
                <div className="text-2xl font-bold text-blue-400">
                  TOTAL: {total.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Botão Salvar */}
            <button
              className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-lg shadow transition-colors flex items-center justify-center gap-3"
              onClick={handleSalvar}
              type="button"
            >
              <FaSave /> Salvar Orçamento
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-6 max-w-lg w-full animate-fade-in">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">Confirmar Orçamento</h3>
            
            <div className="space-y-4 mb-8">
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 mb-1">Cliente</div>
                <div className="text-white text-lg font-semibold">{cliente?.nome}</div>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 mb-1">Produtos</div>
                <div className="text-white text-lg font-semibold">{produtos.length} itens</div>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-400 mb-1">Subtotal</div>
                    <div className="text-white font-semibold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Desconto</div>
                    <div className="text-yellow-400 font-semibold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(desconto)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-right">
                  <div className="text-gray-400 mb-1">Total</div>
                  <div className="text-blue-400 text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white text-lg font-semibold rounded-lg transition-colors"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                onClick={confirmarSalvar}
              >
                <FaSave /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrcamentoForm;
