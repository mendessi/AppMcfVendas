/**
 * ATENÇÃO: ESTE ARQUIVO ESTÁ FUNCIONANDO CORRETAMENTE PARA GRAVAÇÃO DE ORÇAMENTOS.
 * NÃO MODIFICAR A LÓGICA DE GRAVAÇÃO A MENOS QUE SEJA ABSOLUTAMENTE NECESSÁRIO.
 * 
 * Se precisar fazer alterações:
 * 1. Teste em ambiente de homologação
 * 2. Documente as alterações
 * 3. Atualize esta mensagem
 */

import React, { useState, useRef, useEffect } from 'react';
import OrcamentoHeader from './components/OrcamentoHeader';
import useIsMobile from './components/useIsMobile';
import ProdutoAutocomplete from './components/ProdutoAutocomplete';
import api from './services/api';
import { FiPrinter, FiX, FiCheck, FiCopy } from 'react-icons/fi';

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
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [orcamentoSalvo, setOrcamentoSalvo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
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

  // Monitora mudanças no cliente para debug
  useEffect(() => {
    console.log('Cliente atualizado (useEffect):', cliente);
    if (cliente) {
      console.log('Dados completos do cliente (useEffect):', JSON.parse(JSON.stringify(cliente)));
      console.log('Campos disponíveis (useEffect):', Object.keys(cliente));
      console.log('CLI_NOME (useEffect):', cliente.CLI_NOME);
      console.log('cli_nome (useEffect):', cliente.cli_nome);
      console.log('nome (useEffect):', cliente.nome);
      console.log('value (useEffect):', cliente.value);
      console.log('label (useEffect):', cliente.label);
    }
  }, [cliente]);

  // Função para obter o nome do cliente, verificando múltiplos campos possíveis
  const getNomeCliente = (cliente) => {
    if (!cliente) return 'Cliente não informado';
    
    // Verifica se é um objeto ou string
    if (typeof cliente === 'string') return cliente;
    
    // Tenta obter o nome em diferentes campos possíveis
    return (
      cliente.cli_nome || 
      cliente.CLI_NOME || 
      cliente.nome || 
      cliente.label || 
      'Cliente não informado'
    );
  };

  // Função para lidar com o envio do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Logs de depuração
    console.log('=== INÍCIO DO ENVIO ===');
    console.log('Cliente no momento do envio:', cliente);
    if (cliente) {
      console.log('Dados completos do cliente (envio):', JSON.parse(JSON.stringify(cliente)));
      console.log('Nome do cliente (formatado):', getNomeCliente(cliente));
    }
  };

  // Subtotal dos itens
  const subtotal = produtos.reduce((acc, p) => acc + (p.quantidade * p.valor_unitario), 0);
  const total = subtotal - desconto;

  // Detecta se é mobile
  const isMobile = useIsMobile();

  // Accordion para mobile
  const [headerOpen, setHeaderOpen] = useState(true);

  const quantidadeRefs = useRef([]);
  const precoRefs = useRef([]);

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
    
    // Adiciona o novo item no início do array para aparecer acima dos existentes
    setProdutos([novoItem, ...produtos]);
    
    setProdutoSelecionado(null);
    setQuantidade(1);
    setValorUnitario(0);
    setImagem('');
    setProdutoBusca('');
    
    // Foca no campo de quantidade do novo item (que agora está na posição 0)
    setTimeout(() => {
      if (quantidadeRefs.current[0]) {
        quantidadeRefs.current[0].focus();
      }
    }, 100);
  };

  const handleQuantidadeChange = (idx, value) => {
    const novaQtd = parseInt(value) || 1;
    const novosProdutos = produtos.map((p, i) =>
      i === idx ? { ...p, quantidade: novaQtd, valor_total: novaQtd * p.valor_unitario } : p
    );
    setProdutos(novosProdutos);
  };

  const handleValorUnitarioChange = (idx, value) => {
    const novoValor = parseFloat(value) || 0;
    const novosProdutos = produtos.map((p, i) =>
      i === idx ? { ...p, valor_unitario: novoValor, valor_total: novoValor * p.quantidade } : p
    );
    setProdutos(novosProdutos);
  };

  // Handler para remover produto
  const handleRemoverProduto = idx => {
    setProdutos(produtos.filter((_, i) => i !== idx));
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
      imagem: produto.pro_imagem || produto.imagem || ''
    };
    
    // Adiciona o novo item no início do array para aparecer acima dos existentes
    setProdutos([novoItem, ...produtos]);
    
    // Foca no campo de quantidade do novo item (que está na posição 0)
    setTimeout(() => {
      if (quantidadeRefs.current[0]) {
        quantidadeRefs.current[0].focus();
      }
    }, 100);
  };

  // Handler para abrir confirmação
  const handleAbrirConfirmacao = () => {
    if (!cliente) {
      alert('Selecione um cliente antes de salvar o orçamento.');
      return;
    }
    if (produtos.length === 0) {
      alert('Adicione pelo menos um produto ao orçamento.');
      return;
    }
    setShowConfirmation(true);
  };

  // Handler para fechar confirmação
  const handleFecharConfirmacao = () => {
    setShowConfirmation(false);
    setOrcamentoSalvo(null);
  };

  // Handler para copiar número do orçamento
  const handleCopiarNumero = () => {
    if (orcamentoSalvo?.numero_orcamento) {
      navigator.clipboard.writeText(orcamentoSalvo.numero_orcamento.toString());
      alert('Número do orçamento copiado!');
    }
  };

  // Handler para imprimir orçamento
  const handleImprimir = () => {
    // TODO: Implementar lógica de impressão
    window.print();
  };

  // Handler para novo orçamento
  const handleNovoOrcamento = () => {
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
    setOrcamentoSalvo(null);
    setShowConfirmation(false);
  };

  // Handler para submit do orçamento
  const handleSalvar = async () => {
    if (isLoading) return; // Evita múltiplos cliques
    setIsLoading(true);
    
    // Log para depuração
    console.log('Cliente ao salvar:', cliente);
    console.log('Campos do cliente:', {
      cli_codigo: cliente?.cli_codigo,
      cli_nome: cliente?.cli_nome,
      codigo: cliente?.codigo,
      nome: cliente?.nome,
      CLI_CODIGO: cliente?.CLI_CODIGO,
      CLI_NOME: cliente?.CLI_NOME
    });
    
    try {
      // Obtém o nome do cliente formatado
      const nomeCliente = getNomeCliente(cliente);
      
      // Monta o JSON conforme backend
      const payload = {
        cliente_codigo: String(cliente?.cli_codigo || cliente?.CLI_CODIGO || cliente?.codigo || ''),
        nome_cliente: nomeCliente,
        tabela_codigo: String(tabela || ''),
        formapag_codigo: String(formaPagamento || ''),
        valor_total: Number(total),
        data_orcamento: String(dataOrcamento || ''),
        data_validade: String(validade || ''),
        observacao: String(observacao || ''),
        vendedor_codigo: String(vendedor || ''),
        especie: String(especie || '0'),
        desconto: Number(desconto || 0),
        produtos: produtos.map(p => ({
          codigo: String(p.codigo || ''),
          descricao: String(p.descricao || ''),
          quantidade: Number(p.quantidade || 0),
          valor_unitario: Number(p.valor_unitario || 0),
          valor_total: Number(p.valor_total || 0),
          imagem: String(p.imagem || '')
        }))
      };

      // Log do payload para depuração
      console.log('Payload do orçamento:', JSON.stringify(payload, null, 2));

      // Envia para o backend
      const response = await api.post('/api/orcamentos', payload);
      const data = response.data;
      
      if (data.success) {
        console.log('Orçamento salvo com sucesso. Nome do cliente:', nomeCliente);
        
        setOrcamentoSalvo({
          numero_orcamento: data.numero_orcamento,
          data: new Date().toLocaleDateString('pt-BR'),
          cliente: nomeCliente,
          valor_total: total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        });
      } else {
        console.error('Erro ao salvar orçamento:', data.message || 'Erro desconhecido');
        alert('Erro ao salvar: ' + (data.message || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao salvar orçamento:', err);
      alert('Erro de conexão ao salvar orçamento: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsLoading(false);
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
            <ProdutoAutocomplete value={produtoSelecionado} onChange={setProdutoSelecionado} onAdd={handleAdicionarProdutoDireto} />
          </div>
          <button type="button" onClick={handleAdicionarProduto} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition">Adicionar Produto</button>
        </div>
        <div className="space-y-3">
          {produtos.map((p, idx) => (
            <div key={idx} className="bg-gray-900 border border-gray-700 rounded-lg p-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Imagem do produto (se existir) */}
                {p.imagem && (
                  <div className="flex-shrink-0">
                    <img 
                      src={p.imagem} 
                      alt={p.descricao} 
                      className="w-16 h-16 sm:w-12 sm:h-12 object-cover rounded" 
                    />
                  </div>
                )}
                
                {/* Conteúdo principal */}
                <div className="flex-1 min-w-0">
                  {/* Cabeçalho com código e descrição */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-gray-200 truncate">
                        {p.codigo} - {p.descricao}
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemoverProduto(idx)} 
                      className="text-red-400 hover:text-red-600 font-bold text-sm flex-shrink-0 ml-2"
                    >
                      Remover
                    </button>
                  </div>
                  
                  {/* Controles de quantidade e preço */}
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="flex items-center">
                      <label className="text-sm text-gray-400 mr-2 whitespace-nowrap">Qtd:</label>
                      <input
                        type="number"
                        min={1}
                        value={p.quantidade}
                        ref={el => quantidadeRefs.current[idx] = el}
                        onChange={e => handleQuantidadeChange(idx, e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === 'Tab') {
                            e.preventDefault();
                            if (precoRefs.current[idx]) precoRefs.current[idx].focus();
                          }
                        }}
                        className="w-full px-2 py-1 rounded bg-gray-800 text-gray-100 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <label className="text-sm text-gray-400 mr-2 whitespace-nowrap">Unit:</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={p.valor_unitario}
                        ref={el => precoRefs.current[idx] = el}
                        onChange={e => handleValorUnitarioChange(idx, e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            if (quantidadeRefs.current[idx + 1]) {
                              e.preventDefault();
                              quantidadeRefs.current[idx + 1].focus();
                            }
                          }
                        }}
                        className="w-full px-2 py-1 rounded bg-gray-800 text-gray-100 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex items-center col-span-2 sm:col-span-1">
                      <span className="text-sm text-gray-400 whitespace-nowrap">Total:</span>
                      <span className="ml-2 text-blue-400 font-bold">
                        {parseFloat(p.valor_total).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Totais */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6">
        <div className="space-y-2">
          {/* Linha de subtotal */}
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-medium">Subtotal:</span>
            <span className="text-gray-100 font-semibold">
              {parseFloat(subtotal).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>
          
          {/* Linha de desconto */}
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-gray-300 font-medium">Desconto:</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={desconto}
                onChange={e => setDesconto(parseFloat(e.target.value) || 0)}
                className="ml-2 w-24 px-2 py-1 rounded bg-gray-800 text-gray-100 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <span className="text-gray-100 font-semibold">
              {parseFloat(desconto).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>
          
          {/* Linha de total */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-700">
            <span className="text-blue-400 font-bold text-lg">TOTAL:</span>
            <span className="text-blue-400 font-bold text-xl">
              {parseFloat(total).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>
        </div>
      </div>
      {/* Ações */}
      <div className="flex justify-center gap-4">
        <button
          type="button"
          onClick={handleAbrirConfirmacao}
          className={`w-full max-w-md ${isLoading ? 'bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white py-3 rounded-lg font-bold text-xl transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
          disabled={!cliente || produtos.length === 0 || isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Salvando...
            </>
          ) : (
            <>
              <FiCheck className="w-6 h-6" />
              Finalizar Orçamento
            </>
          )}
        </button>
      </div>

      {/* Modal de Confirmação */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
                <h3 className="text-2xl font-bold text-white">
                  {orcamentoSalvo ? 'Orçamento Salvo!' : 'Confirmar Orçamento'}
                </h3>
                <button
                  onClick={handleFecharConfirmacao}
                  className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              {!orcamentoSalvo ? (
                <>
                  <div className="mb-8">
                    <h4 className="text-lg font-semibold text-gray-300 mb-4">Resumo do Orçamento</h4>
                    <div className="bg-gray-700 rounded-lg p-5 space-y-3">
                      <p className="text-gray-300 border-b border-gray-600 pb-2">
                        <span className="font-medium">Cliente:</span>{' '}
                        <span className="text-white">
                          {getNomeCliente(cliente)}
                        </span>
                      </p>
                      <p className="text-gray-300 border-b border-gray-600 pb-2">
                        <span className="font-medium">Itens:</span>{' '}
                        <span className="text-white">{produtos.length}</span>
                      </p>
                      <p className="text-gray-300 border-b border-gray-600 pb-2">
                        <span className="font-medium">Valor Total:</span>{' '}
                        <span className="text-blue-400 font-bold">
                          {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-700">
                    <button
                      onClick={handleFecharConfirmacao}
                      className="px-6 py-2.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSalvar}
                      className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition font-medium flex items-center justify-center gap-2"
                    >
                      <FiCheck className="w-5 h-5" />
                      Confirmar e Salvar
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FiCheck className="w-10 h-10 text-green-600" />
                  </div>
                  <h4 className="text-2xl font-bold text-green-400 mb-3">Orçamento Salvo com Sucesso!</h4>
                  <p className="text-gray-300 mb-8 text-lg">O orçamento foi salvo com sucesso no sistema.</p>
                  
                  <div className="bg-gray-700 rounded-xl p-6 mb-8 text-left max-w-md mx-auto">
                    <p className="text-gray-300 mb-3">
                      <span className="font-medium">Número do Orçamento:</span>
                    </p>
                    <p className="text-3xl font-bold text-white mb-6 text-center">
                      {orcamentoSalvo.numero_orcamento}
                    </p>
                    <div className="space-y-2">
                      <p className="text-gray-300">
                        <span className="font-medium">Cliente:</span>{' '}
                        <span className="text-white">
                          {typeof orcamentoSalvo.cliente === 'string' ? orcamentoSalvo.cliente : getNomeCliente(cliente)}
                        </span>
                      </p>
                      <p className="text-gray-300">
                        <span className="font-medium">Valor Total:</span>{' '}
                        <span className="text-green-400 font-bold">{orcamentoSalvo.valor_total}</span>
                      </p>
                      <p className="text-gray-300">
                        <span className="font-medium">Data:</span>{' '}
                        <span className="text-white">{orcamentoSalvo.data}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <button
                      onClick={handleCopiarNumero}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition flex items-center justify-center gap-2 font-medium"
                    >
                      <FiCopy className="w-4 h-4" />
                      Copiar Número
                    </button>
                    <button
                      onClick={handleImprimir}
                      className="px-5 py-2.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition flex items-center justify-center gap-2 font-medium"
                    >
                      <FiPrinter className="w-4 h-4" />
                      Imprimir
                    </button>
                    <button
                      onClick={handleNovoOrcamento}
                      className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition flex items-center justify-center gap-2 font-medium"
                    >
                      Novo Orçamento
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrcamentoForm;
