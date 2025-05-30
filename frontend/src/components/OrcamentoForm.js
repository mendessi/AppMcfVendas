import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSave, FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import OrcamentoHeader from './OrcamentoHeader';
import ProdutoAutocomplete from './ProdutoAutocomplete';
import api from '../services/api';

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
    observacao: '',
    produtos: []
  });

  const [tabelas, setTabelas] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [vendedores, setVendedores] = useState([]);

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
    
    // Mapear os campos corretamente
    const produtoCodigo = produto.pro_codigo || produto.codigo;
    const produtoDescricao = produto.pro_descricao || produto.descricao;
    const produtoPreco = produto.pro_venda || produto.preco || produto.valor_unitario || 0;
    
    console.log('Campos mapeados:', {
      produtoCodigo,
      produtoDescricao,
      produtoPreco
    });
    
    const produtoExistente = orcamento.produtos.find(p => p.codigo === produtoCodigo);
    console.log('Produto existente?', !!produtoExistente);
    
    if (produtoExistente) {
      console.log('Atualizando produto existente...');
      setOrcamento(prev => {
        const novoProdutos = prev.produtos.map(p =>
          p.codigo === produtoCodigo
            ? { ...p, quantidade: p.quantidade + 1, valor_total: (p.quantidade + 1) * p.valor_unitario }
            : p
        );
        console.log('Novos produtos (existente):', novoProdutos);
        return {
          ...prev,
          produtos: novoProdutos
        };
      });
    } else {
      console.log('Adicionando novo produto...');
      const novoProduto = {
        codigo: produtoCodigo,
        descricao: produtoDescricao,
        quantidade: 1,
        valor_unitario: produtoPreco,
        valor_total: produtoPreco
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

  console.log('Função handleProdutoSelect definida:', typeof handleProdutoSelect);

  const handleQuantidadeChange = (codigo, quantidade) => {
    setOrcamento(prev => ({
      ...prev,
      produtos: prev.produtos.map(p =>
        p.codigo === codigo
          ? {
              ...p,
              quantidade: parseFloat(quantidade) || 1,
              valor_total: parseFloat(quantidade) * p.valor_unitario
            }
          : p
      )
    }));
  };

  const handleRemoveProduto = (codigo) => {
    setOrcamento(prev => ({
      ...prev,
      produtos: prev.produtos.filter(p => p.codigo !== codigo)
    }));
  };

  const calcularTotal = () => {
    const subtotal = orcamento.produtos.reduce((total, produto) => total + produto.valor_total, 0);
    const desconto = (subtotal * orcamento.desconto) / 100;
    return subtotal - desconto;
  };

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {numero ? `Editar Orçamento #${numero}` : 'Novo Orçamento'}
        </h1>
        <div className="space-x-4">
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
                  <tr key={produto.codigo} className={darkMode ? "hover:bg-gray-600" : "hover:bg-gray-50"}>
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
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={produto.quantidade}
                        onChange={(e) => handleQuantidadeChange(produto.codigo, e.target.value)}
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
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(produto.valor_unitario)}
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
                        className={`text-red-600 hover:text-red-900 ${
                          darkMode ? "hover:text-red-400" : ""
                        }`}
                      >
                        <FiTrash2 className="inline-block" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className={darkMode ? "bg-gray-600" : "bg-gray-100"}>
                <tr>
                  <td colSpan="4" className={`px-6 py-4 text-right font-medium ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    Subtotal:
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(orcamento.produtos.reduce((total, produto) => total + produto.valor_total, 0))}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan="4" className={`px-6 py-4 text-right font-medium ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    Desconto ({orcamento.desconto}%):
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format((orcamento.produtos.reduce((total, produto) => total + produto.valor_total, 0) * orcamento.desconto) / 100)}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan="4" className={`px-6 py-4 text-right font-bold ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    Total:
                  </td>
                  <td className={`px-6 py-4 text-right font-bold ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(calcularTotal())}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className={`text-center py-8 ${
            darkMode ? "text-gray-300" : "text-gray-600"
          }`}>
            Nenhum produto adicionado
          </div>
        )}
      </div>
    </form>
  );
};

export default OrcamentoForm; 