import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSave, FiX, FiPlus, FiTrash2, FiArchive, FiAlertCircle } from 'react-icons/fi';
import OrcamentoHeader from './OrcamentoHeader';
import ProdutoAutocomplete from './ProdutoAutocomplete';
import api from '../services/api';
import OrcamentosCache from './OrcamentosCache';

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

      setOrcamento(response.data);
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

      if (numero) {
        await api.put(`/orcamentos/${numero}`, orcamento, { headers });
      } else {
        await api.post('/orcamentos', orcamento, { headers });
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
    <div className={`container mx-auto p-4 ${darkMode ? 'dark' : ''}`}>
      <div className="bg-white dark:bg-gray-800 shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold dark:text-white">
            {numero ? `Editar Pedido de Venda ${numero}` : 'Pedido de Venda'}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCacheModal(true)}
              className={`flex items-center px-3 py-2 rounded-md ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              <FiArchive className="mr-2" />
              <span className="text-sm">Pedidos em Cache</span>
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => navigate('/orcamentos')}
              className={`px-4 py-2 rounded-md ${
                darkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-800"
              }`}
            >
              <FiX className="inline-block mr-2" />
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-md ${
                darkMode
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              <FiSave className="inline-block mr-2" />
              Salvar
            </button>
          </div>
        </div>

        {error && (
          <div className={`p-4 rounded-md ${
            darkMode ? "bg-red-900 text-white" : "bg-red-100 text-red-700"
          }`}>
            {error}
          </div>
        )}

        <OrcamentoHeader
          darkMode={darkMode}
          orcamento={orcamento}
          setOrcamento={setOrcamento}
          tabelas={tabelas}
          formasPagamento={formasPagamento}
          vendedores={vendedores}
          onClienteSelect={handleClienteSelect}
        />

        <div className={`p-4 rounded-lg ${
          darkMode ? "bg-gray-700" : "bg-gray-50"
        }`}>
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-1 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Produto
            </label>
            {console.log('Renderizando ProdutoAutocomplete, handleProdutoSelect:', typeof handleProdutoSelect)}
            <ProdutoAutocomplete
              onSelect={(produto) => {
                console.log('onSelect wrapper chamado com:', produto);
                console.log('handleProdutoSelect existe?', typeof handleProdutoSelect);
                if (typeof handleProdutoSelect === 'function') {
                  return handleProdutoSelect(produto);
                } else {
                  console.error('handleProdutoSelect não é uma função!');
                }
              }}
              darkMode={darkMode}
            />
          </div>

          {orcamento.produtos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className={`min-w-full divide-y ${
                darkMode ? "divide-gray-600" : "divide-gray-200"
              }`}>
                <thead className={darkMode ? "bg-gray-600" : "bg-gray-100"}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${
                      darkMode ? "text-gray-300" : "text-gray-500"
                    } uppercase tracking-wider`}>
                      Código
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${
                      darkMode ? "text-gray-300" : "text-gray-500"
                    } uppercase tracking-wider`}>
                      Descrição
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${
                      darkMode ? "text-gray-300" : "text-gray-500"
                    } uppercase tracking-wider`}>
                      Marca
                    </th>
                    <th className={`px-6 py-3 text-center text-xs font-medium ${
                      darkMode ? "text-gray-300" : "text-gray-500"
                    } uppercase tracking-wider`}>
                      Unid.
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium ${
                      darkMode ? "text-gray-300" : "text-gray-500"
                    } uppercase tracking-wider`}>
                      Quantidade
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium ${
                      darkMode ? "text-gray-300" : "text-gray-500"
                    } uppercase tracking-wider`}>
                      Valor Unitário
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium ${
                      darkMode ? "text-gray-300" : "text-gray-500"
                    } uppercase tracking-wider`}>
                      Preço 2
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium ${
                      darkMode ? "text-gray-300" : "text-gray-500"
                    } uppercase tracking-wider`}>
                      Preço Mín.
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium ${
                      darkMode ? "text-gray-300" : "text-gray-500"
                    } uppercase tracking-wider`}>
                      Estoque
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium ${
                      darkMode ? "text-gray-300" : "text-gray-500"
                    } uppercase tracking-wider`}>
                      Total
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium ${
                      darkMode ? "text-gray-300" : "text-gray-500"
                    } uppercase tracking-wider`}>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  darkMode ? "divide-gray-600 bg-gray-700" : "divide-gray-200 bg-white"
                }`}>
                  {orcamento.produtos.map((produto) => (
                    <tr 
                      key={produto.codigo} 
                      id={`produto-row-${produto.codigo}`}
                      className={darkMode ? "hover:bg-gray-600" : "hover:bg-gray-50"}
                    >
                      <td className={`px-6 py-4 whitespace-nowrap ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}>
                        {produto.codigo}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}>
                        {produto.descricao}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}>
                        {produto.marca}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-center ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}>
                        {produto.unidade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={produto.quantidade}
                          onChange={e => {
                            // Aceita apenas números e vírgula/ponto decimal
                            const value = e.target.value.replace(/[^0-9,.]/g, '');
                            handleQuantidadeChange(produto.codigo, value);
                          }}
                          className={`w-20 text-right rounded-md ${
                            darkMode
                              ? "bg-gray-600 border-gray-500 text-white"
                              : "bg-white border-gray-300 text-gray-700"
                          }`}
                        />
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={produto.valor_unitario}
                          onFocus={e => e.target.select()}
                          onChange={e => {
                            const value = e.target.value.replace(/[^0-9,.]/g, '');
                            handleValorUnitarioChange(produto.codigo, value);
                          }}
                          onBlur={(e) => handleValorUnitarioBlur(produto.codigo)}
                          className={`w-24 text-right rounded-md font-semibold ${
                            darkMode
                              ? "bg-gray-600 border-gray-500 text-white"
                              : "bg-white border-gray-300 text-gray-900"
                          } ${alertaValorUnitario[produto.codigo] ? 'border-2 border-red-500 animate-pulse' : ''}`}
                          style={{fontVariantNumeric: 'tabular-nums'}}
                        />
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(produto.preco_prazo)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(produto.preco_minimo)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}>
                        {produto.estoque_atual}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(produto.valor_total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveProduto(produto.codigo)}
                          className={`text-red-500 hover:text-red-700 ${
                            darkMode ? "text-red-300 hover:text-red-400" : ""
                          }`}
                        >
                          <FiTrash2 className="inline-block" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div className={`p-4 rounded-lg ${
          darkMode ? "bg-gray-700" : "bg-gray-50"
        }`}>
          <div className="flex flex-col space-y-2 mt-4">
            <div className="flex justify-between items-center">
              <span>Qtde de Itens:</span>
              <span>{orcamento.produtos.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Soma das Qtdades:</span>
              <span>{orcamento.produtos.reduce((total, produto) => total + produto.quantidade, 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Subtotal:</span>
              <span>{orcamento.produtos.reduce((total, produto) => total + produto.valor_total, 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span>Desconto:</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={orcamento.desconto}
                  onChange={(e) => {
                    console.log('OrcamentoForm - Input desconto onChange:', e.target.value);
                    const valor = parseFloat(e.target.value) || 0;
                    const subtotal = orcamento.produtos.reduce((total, produto) => total + produto.valor_total, 0);
                    const valorDesconto = (subtotal * valor) / 100;
                    
                    setOrcamento(prev => {
                      const novo = {
                        ...prev,
                        desconto: valor,
                        valor_desconto: valorDesconto
                      };
                      console.log('OrcamentoForm - Novo estado após desconto:', novo);
                      return novo;
                    });
                  }}
                  onBlur={(e) => {
                    console.log('OrcamentoForm - Input desconto onBlur:', e.target.value);
                    const valor = parseFloat(e.target.value) || 0;
                    const subtotal = orcamento.produtos.reduce((total, produto) => total + produto.valor_total, 0);
                    const valorDesconto = (subtotal * valor) / 100;
                    
                    setOrcamento(prev => ({
                      ...prev,
                      desconto: valor,
                      valor_desconto: valorDesconto
                    }));
                  }}
                  className="w-16 mx-2 px-2 py-1 text-right border rounded"
                />
                <span>%</span>
              </div>
              <span>R$ {(() => {
                const valor = calcularValorDesconto();
                console.log('OrcamentoForm - Renderizando valor do desconto:', valor);
                return valor.toFixed(2);
              })()}</span>
            </div>
            <div className="flex justify-between items-center font-bold text-blue-500">
              <span>TOTAL:</span>
              <span>R$ {(orcamento.produtos.reduce((total, produto) => total + produto.valor_total, 0) * (1 - orcamento.desconto/100)).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

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