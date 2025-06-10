import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSave, FiX, FiPlus, FiTrash2, FiArchive, FiAlertCircle } from 'react-icons/fi';
import OrcamentoHeader from './OrcamentoHeader';
import ProdutoAutocomplete from './ProdutoAutocomplete';
import api from '../services/api';
import OrcamentoCache from '../services/OrcamentoCache';

const OrcamentoForm = ({ numero, darkMode }) => {
  console.log('OrcamentoForm renderizado, props:', { numero, darkMode });
  
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orcamento, setOrcamento] = useState({
    cliente: {
      codigo: '',
      nome: ''
    },
    data: new Date().toISOString().split('T')[0],
    validade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    tabela: '',
    forma_pagamento: '',
    vendedor: '',
    desconto: 0,
    valor_desconto: 0,
    observacao: '',
    produtos: []
  });

  const [tabelas, setTabelas] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [showCacheModal, setShowCacheModal] = useState(false);

  // Estados para modal de confirmação de produto existente
  const [showProdutoExistenteModal, setShowProdutoExistenteModal] = useState(false);
  const [produtoExistenteInfo, setProdutoExistenteInfo] = useState(null);

  const [alertaValorUnitario, setAlertaValorUnitario] = useState({});

  const inputRefs = useRef({});

  useEffect(() => {
    carregarDados();
    if (numero) {
      carregarOrcamento();
    }
  }, [numero]);

  const carregarDados = async () => {
    try {
      const token = localStorage.getItem('token');
      const empresa = localStorage.getItem('empresa_atual');

      const [tabelasRes, formasPagamentoRes, vendedoresRes] = await Promise.all([
        api.get('/tabelas', {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-empresa-codigo': empresa
          }
        }),
        api.get('/formas-pagamento', {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-empresa-codigo': empresa
          }
        }),
        api.get('/vendedores', {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-empresa-codigo': empresa
          }
        })
      ]);

      setTabelas(tabelasRes.data);
      setFormasPagamento(formasPagamentoRes.data);
      setVendedores(vendedoresRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Erro ao carregar dados. Por favor, tente novamente.');
    }
  };

  const carregarOrcamento = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const empresa = localStorage.getItem('empresa_atual');

      const response = await api.get(`/orcamentos/${numero}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-empresa-codigo': empresa
        }
      });

      const orcamentoData = response.data;
      setOrcamento({
        ...orcamentoData,
        cliente: {
          codigo: orcamentoData.cliente_codigo,
          nome: orcamentoData.cliente_nome
        },
        data: orcamentoData.data_emissao,
        validade: orcamentoData.data_validade,
        tabela: orcamentoData.tabela_codigo,
        forma_pagamento: orcamentoData.formapag_codigo,
        vendedor: orcamentoData.vendedor_codigo,
        desconto: orcamentoData.desconto,
        valor_desconto: orcamentoData.valor_desconto,
        observacao: orcamentoData.observacao,
        produtos: orcamentoData.produtos.map(p => ({
          ...p,
          valor_unitario: Number(p.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          valor_total: Number(p.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        }))
      });
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
      setError('Erro ao carregar orçamento. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const empresa = localStorage.getItem('empresa_atual');

      const headers = {
        Authorization: `Bearer ${token}`,
        'x-empresa-codigo': empresa
      };

      // Preparar dados para envio
      const payload = {
        cliente_codigo: orcamento.cliente.codigo,
        cliente_nome: orcamento.cliente.nome,
        data_emissao: orcamento.data,
        data_validade: orcamento.validade,
        tabela_codigo: orcamento.tabela,
        formapag_codigo: orcamento.forma_pagamento,
        vendedor_codigo: orcamento.vendedor,
        desconto: orcamento.desconto,
        valor_desconto: orcamento.valor_desconto,
        observacao: orcamento.observacao,
        produtos: orcamento.produtos.map(p => ({
          codigo: p.codigo,
          descricao: p.descricao,
          quantidade: Number(p.quantidade),
          valor_unitario: Number(p.valor_unitario.replace(/\./g, '').replace(',', '.')),
          valor_total: Number(p.valor_total.replace(/\./g, '').replace(',', '.'))
        }))
      };

      if (numero) {
        await api.put(`/orcamentos/${numero}`, payload, { headers });
      } else {
        await api.post('/orcamentos', payload, { headers });
      }

      navigate('/orcamentos');
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
      setError('Erro ao salvar orçamento. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClienteSelect = (cliente) => {
    if (!cliente) return;
    
    setOrcamento(prev => ({
      ...prev,
      cliente: {
        codigo: cliente.codigo || '',
        nome: cliente.nome || ''
      }
    }));
  };

  const handleProdutoSelect = (produto) => {
    console.log('=== HANDLEPRODUCTOSELECT INICIADO ===');
    console.log('Produto recebido:', produto);
    console.log('Estado atual do orçamento:', orcamento);
    console.log('Produtos atuais:', orcamento.produtos);
    
    if (!produto) {
      console.log('Produto é null ou undefined, saindo...');
      return;
    }
    
    // Mapear os campos corretamente incluindo os novos campos
    const produtoCodigo = produto.pro_codigo || produto.codigo;
    const produtoDescricao = produto.pro_descricao || produto.descricao;
    const produtoPreco = produto.pro_venda || produto.preco || produto.valor_unitario || 0;
    const produtoMarca = produto.PRO_MARCA || produto.pro_marca || '';
    const precoPrazo = produto.pro_vendapz || 0;
    const precoMinimo = produto.pro_descprovlr || 0;
    const estoqueAtual = produto.estoque || produto.pro_quantidade || produto.PRO_QUANTIDADE || 0;
    const unidade = produto.UNI_CODIGO || '';
    
    console.log('Campos mapeados:', {
      produtoCodigo,
      produtoDescricao,
      produtoPreco,
      produtoMarca,
      precoPrazo,
      precoMinimo,
      estoqueAtual,
      unidade
    });
    
    const produtoExistente = orcamento.produtos.find(p => p.codigo === produtoCodigo);
    console.log('Produto existente?', !!produtoExistente);
    
    if (produtoExistente) {
      console.log('Produto já existe na lista, mostrando modal...');
      setProdutoExistenteInfo({
        produto: produto,
        produtoExistente: produtoExistente
      });
      setShowProdutoExistenteModal(true);
      return;
    } else {
      console.log('Adicionando novo produto...');
      const novoProduto = {
        codigo: produtoCodigo,
        descricao: produtoDescricao,
        marca: produtoMarca,
        unidade: unidade,
        quantidade: 1,
        valor_unitario: produtoPreco,
        valor_total: produtoPreco,
        preco_prazo: precoPrazo,
        preco_minimo: precoMinimo,
        estoque_atual: estoqueAtual
      };
      console.log('Novo produto criado:', novoProduto);
      
      setOrcamento(prev => {
        const novoProdutos = [...prev.produtos, novoProduto];
        console.log('Lista atualizada de produtos:', novoProdutos);
        return {
          ...prev,
          produtos: novoProdutos
        };
      });
    }
    console.log('=== HANDLEPRODUCTOSELECT FINALIZADO ===');
  };

  const handleQuantidadeChange = (codigo, quantidade) => {
    setOrcamento(prev => ({
      ...prev,
      produtos: prev.produtos.map(p =>
        p.codigo === codigo
          ? {
              ...p,
              quantidade: parseFloat(quantidade) || 1,
              valor_total: (parseFloat(quantidade) || 1) * p.valor_unitario
            }
          : p
      )
    }));
  };

  const handleValorUnitarioChange = (codigo, valor) => {
    setOrcamento(prev => ({
      ...prev,
      produtos: prev.produtos.map(p =>
        p.codigo === codigo
          ? {
              ...p,
              valor_unitario: valor,
              valor_total: p.quantidade * (parseFloat(valor.replace(',', '.')) || 0)
            }
          : p
      )
    }));
  };

  const handleValorUnitarioBlur = (codigo) => {
    setOrcamento(prev => {
      // Não altera o valor, só alerta se for menor que o mínimo
      const produtos = prev.produtos.map(p => {
        if (p.codigo === codigo) {
          let valorStr = (p.valor_unitario || '').replace(',', '.');
          let valorAtual = parseFloat(valorStr);
          const precoMinimo = parseFloat(p.preco_minimo) || 0;
          if (valorStr && !isNaN(valorAtual) && valorAtual < precoMinimo) {
            setAlertaValorUnitario(prevAlertas => ({ ...prevAlertas, [codigo]: true }));
            setTimeout(() => {
              setAlertaValorUnitario(prevAlertas => ({ ...prevAlertas, [codigo]: false }));
            }, 2000);
          }
        }
        return p;
      });
      return { ...prev, produtos };
    });
  };

  const handleRemoveProduto = (codigo) => {
    setOrcamento(prev => ({
      ...prev,
      produtos: prev.produtos.filter(p => p.codigo !== codigo)
    }));
  };

  // Função para confirmar adição de quantidade ao produto existente
  const handleConfirmarProdutoExistente = () => {
    if (produtoExistenteInfo) {
      const { produtoExistente } = produtoExistenteInfo;
      setOrcamento(prev => {
        const novoProdutos = prev.produtos.map(p =>
          p.codigo === produtoExistente.codigo
            ? { ...p, quantidade: p.quantidade + 1, valor_total: (p.quantidade + 1) * p.valor_unitario }
            : p
        );
        return {
          ...prev,
          produtos: novoProdutos
        };
      });
      
      // Fazer scroll até o produto
      const index = orcamento.produtos.findIndex(p => p.codigo === produtoExistente.codigo);
      if (index !== -1) {
        setTimeout(() => {
          const element = document.getElementById(`produto-row-${produtoExistente.codigo}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('bg-yellow-100');
            setTimeout(() => element.classList.remove('bg-yellow-100'), 2000);
          }
        }, 100);
      }
    }
    setShowProdutoExistenteModal(false);
    setProdutoExistenteInfo(null);
  };

  // Função para cancelar adição ao produto existente
  const handleCancelarProdutoExistente = () => {
    setShowProdutoExistenteModal(false);
    setProdutoExistenteInfo(null);
  };

  const calcularTotal = () => {
    console.log('OrcamentoForm - Calculando total...');
    const subtotal = orcamento.produtos.reduce((total, produto) => total + produto.valor_total, 0);
    const valorDesconto = (subtotal * orcamento.desconto) / 100;
    console.log('OrcamentoForm - Total calculado:', { subtotal, desconto: orcamento.desconto, valorDesconto });
    return subtotal - valorDesconto;
  };

  const calcularValorDesconto = () => {
    console.log('OrcamentoForm - Calculando valor do desconto...');
    const subtotal = orcamento.produtos.reduce((total, produto) => total + produto.valor_total, 0);
    const valorDesconto = (subtotal * orcamento.desconto) / 100;
    console.log('OrcamentoForm - Desconto calculado:', { 
      subtotal, 
      desconto: orcamento.desconto, 
      valorDesconto,
      produtos: orcamento.produtos 
    });
    return valorDesconto;
  };

  const handleSalvar = async () => {
    try {
      // Antes de salvar, validar todos os valores unitários
      const produtosValidados = orcamento.produtos.map(p => {
        let valorStr = (p.valor_unitario || '').replace(',', '.');
        let valorAtual = parseFloat(valorStr);
        const precoMinimo = parseFloat(p.preco_minimo) || 0;
        const precoVenda = parseFloat(p.pro_venda || p.valor_unitario_original || p.valor_unitario || 0);
        let valorFinal;
        if (!valorStr || isNaN(valorAtual)) {
          valorFinal = precoVenda;
        } else if (valorAtual < precoMinimo) {
          valorFinal = precoMinimo;
        } else {
          valorFinal = valorAtual;
        }
        // Formatar para string sem zeros à esquerda, com duas casas decimais e vírgula
        const valorFormatado = Number(valorFinal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return {
          ...p,
          valor_unitario: valorFormatado,
          valor_total: p.quantidade * Number(valorFinal)
        };
      });
      // Monta o JSON conforme backend
      const payload = {
        ...orcamento,
        produtos: produtosValidados
      };

      const token = localStorage.getItem('token');
      const empresa = localStorage.getItem('empresa_atual');

      const headers = {
        Authorization: `Bearer ${token}`,
        'x-empresa-codigo': empresa
      };

      if (numero) {
        await api.put(`/orcamentos/${numero}`, payload, { headers });
      } else {
        await api.post('/orcamentos', payload, { headers });
      }

      navigate('/orcamentos');
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
      setError('Erro ao salvar orçamento. Por favor, tente novamente.');
    }
  };

  // Adiciona useEffect para monitorar mudanças no desconto
  useEffect(() => {
    console.log('OrcamentoForm - Monitorando mudanças:', {
      desconto: orcamento.desconto,
      valor_desconto: orcamento.valor_desconto,
      produtos: orcamento.produtos,
      subtotal: orcamento.produtos.reduce((total, produto) => total + produto.valor_total, 0)
    });
  }, [orcamento.desconto, orcamento.valor_desconto, orcamento.produtos]);

  useEffect(() => {
    return () => {
      // Só salva se tiver cliente e pelo menos um produto
      if (
        orcamento &&
        orcamento.cliente &&
        orcamento.cliente.codigo &&
        orcamento.produtos &&
        orcamento.produtos.length > 0
      ) {
        OrcamentoCache.salvar({ ...orcamento, status: 'pendente' });
      }
    };
  }, [orcamento]);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className={`mt-4 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
          Carregando...
        </p>
      </div>
    );
  }

  return (
    <div className={`container mx-auto p-4 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
      <form onSubmit={handleSubmit}>
        <OrcamentoHeader
          darkMode={darkMode}
          orcamento={orcamento}
          setOrcamento={setOrcamento}
          tabelas={tabelas}
          formasPagamento={formasPagamento}
          vendedores={vendedores}
        />

        {/* Lista de Produtos */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Produtos</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Quantidade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Valor Unitário</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Valor Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {orcamento.produtos.map((produto, index) => (
                  <tr key={index} id={`produto-row-${produto.codigo}`}>
                    <td className="px-6 py-4 whitespace-nowrap">{produto.codigo}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{produto.descricao}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={produto.quantidade}
                        onChange={(e) => handleQuantidadeChange(produto.codigo, e.target.value)}
                        className={`w-20 rounded-md ${
                          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                        }`}
                        min="1"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={produto.valor_unitario}
                        onChange={(e) => handleValorUnitarioChange(produto.codigo, e.target.value)}
                        className={`w-32 rounded-md ${
                          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                        } ${alertaValorUnitario[produto.codigo] ? 'border-red-500' : ''}`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{produto.valor_total}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleRemoveProduto(produto.codigo)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="mt-6 flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/orcamentos')}
            className={`px-4 py-2 rounded-md ${
              darkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            <FiX className="inline-block mr-2" />
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <FiSave className="inline-block mr-2" />
            {isLoading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Modal de Produto Já Existente */}
      {showProdutoExistenteModal && produtoExistenteInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border-2 rounded-xl shadow-2xl w-full max-w-md p-6 mx-4`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  darkMode ? 'bg-yellow-900/30' : 'bg-yellow-100'
                }`}>
                  <FiAlertCircle className={`w-6 h-6 ${
                    darkMode ? 'text-yellow-400' : 'text-yellow-600'
                  }`} />
                </div>
                <h3 className={`text-xl font-bold ${
                  darkMode ? 'text-yellow-400' : 'text-yellow-600'
                }`}>
                  Produto Já Adicionado
                </h3>
              </div>
              <button
                onClick={handleCancelarProdutoExistente}
                className={`p-1 rounded-full transition-colors ${
                  darkMode 
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <p className="mb-4">
                O produto <strong>{produtoExistenteInfo.produto.pro_descricao || produtoExistenteInfo.produto.descricao}</strong> já está no pedido.
              </p>
              <p className="mb-2">
                Quantidade atual: <strong>{produtoExistenteInfo.produtoExistente.quantidade}</strong>
              </p>
              <p>
                Deseja adicionar +1 unidade a este item?
              </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelarProdutoExistente}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarProdutoExistente}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                } flex items-center gap-2`}
              >
                <FiPlus className="w-5 h-5" />
                Adicionar +1
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrcamentoForm;