import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import OrcamentoHeader from '../components/OrcamentoHeader';

const OrcamentoEdit = ({ darkMode }) => {
  const { numero } = useParams();
  const navigate = useNavigate();
  const [orcamento, setOrcamento] = useState({
    cliente_id: '',
    vendedor_id: '',
    forma_pagamento_id: '',
    tabela_preco_id: '',
    desconto: 0,
    validade: '',
    observacao: '',
    itens: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    carregarDados();
  }, [numero]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const empresaCodigo = localStorage.getItem('empresa_atual');

      if (!token || !empresaCodigo) {
        throw new Error('Token ou código da empresa não encontrado');
      }

      const [orcamentoResponse, produtosResponse] = await Promise.all([
        numero ? axios.get(`/api/orcamentos/${numero}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-empresa-codigo': empresaCodigo
          }
        }) : Promise.resolve({ data: null }),
        axios.get('/api/produtos', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-empresa-codigo': empresaCodigo
          }
        })
      ]);

      if (orcamentoResponse.data) {
        console.log('Orçamento carregado:', orcamentoResponse.data);
        setOrcamento(orcamentoResponse.data);
      }

      console.log('Produtos carregados:', produtosResponse.data);
      setProdutos(produtosResponse.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Erro ao carregar dados. Por favor, tente novamente.');
      toast.error('Erro ao carregar dados. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const empresaCodigo = localStorage.getItem('empresa_atual');

      if (!token || !empresaCodigo) {
        throw new Error('Token ou código da empresa não encontrado');
      }

      const url = numero ? `/api/orcamentos/${numero}` : '/api/orcamentos';
      const method = numero ? 'put' : 'post';

      const response = await axios[method](url, orcamento, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaCodigo
        }
      });

      console.log('Orçamento salvo:', response.data);
      toast.success('Orçamento salvo com sucesso!');
      navigate('/orcamentos');
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
      setError('Erro ao salvar orçamento. Por favor, tente novamente.');
      toast.error('Erro ao salvar orçamento. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setOrcamento(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItens = [...orcamento.itens];
    newItens[index] = {
      ...newItens[index],
      [field]: value
    };

    // Recalcular valores
    if (field === 'quantidade' || field === 'valor_unitario' || field === 'desconto') {
      const item = newItens[index];
      const valorItem = item.quantidade * item.valor_unitario;
      const descontoItem = valorItem * (item.desconto / 100);
      newItens[index].valor_total = valorItem - descontoItem;
    }

    setOrcamento(prev => ({
      ...prev,
      itens: newItens
    }));
  };

  const handleAddItem = () => {
    setOrcamento(prev => ({
      ...prev,
      itens: [
        ...prev.itens,
        {
          produto_id: '',
          quantidade: 1,
          valor_unitario: 0,
          desconto: 0,
          valor_total: 0
        }
      ]
    }));
  };

  const handleRemoveItem = (index) => {
    setOrcamento(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md`}>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md`}>
        <div className="text-red-500 text-center">{error}</div>
      </div>
    );
  }

  return (
    <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {numero ? `Editar Orçamento #${numero}` : 'Novo Orçamento'}
        </h1>
        <div className="flex space-x-4">
          <button
            onClick={() => navigate('/orcamentos')}
            className={`px-4 py-2 rounded-md ${
              darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            className={`px-4 py-2 rounded-md ${
              darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Salvar
          </button>
        </div>
      </div>

      <OrcamentoHeader
        darkMode={darkMode}
        orcamento={orcamento}
        onChange={handleChange}
      />

      {/* Itens do Orçamento */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Itens do Orçamento
          </h2>
          <button
            onClick={handleAddItem}
            className={`px-4 py-2 rounded-md ${
              darkMode
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            Adicionar Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${
            darkMode ? 'divide-gray-700' : 'divide-gray-200'
          }`}>
            <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Produto
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Quantidade
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Valor Unitário
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Desconto
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Total
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${
              darkMode ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'
            }`}>
              {orcamento.itens.map((item, index) => (
                <tr key={index}>
                  <td className={`px-6 py-4 whitespace-nowrap ${
                    darkMode ? 'text-gray-300' : 'text-gray-900'
                  }`}>
                    <select
                      value={item.produto_id}
                      onChange={(e) => handleItemChange(index, 'produto_id', e.target.value)}
                      className={`w-full p-2 rounded-md ${
                        darkMode
                          ? 'bg-gray-700 text-white border-gray-600'
                          : 'bg-white text-gray-900 border-gray-300'
                      }`}
                    >
                      <option value="">Selecione um produto</option>
                      {produtos.map(produto => (
                        <option key={produto.id} value={produto.id}>
                          {produto.nome}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${
                    darkMode ? 'text-gray-300' : 'text-gray-900'
                  }`}>
                    <input
                      type="number"
                      min="1"
                      value={item.quantidade}
                      onChange={(e) => handleItemChange(index, 'quantidade', parseInt(e.target.value))}
                      className={`w-full p-2 rounded-md ${
                        darkMode
                          ? 'bg-gray-700 text-white border-gray-600'
                          : 'bg-white text-gray-900 border-gray-300'
                      }`}
                    />
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${
                    darkMode ? 'text-gray-300' : 'text-gray-900'
                  }`}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.valor_unitario}
                      onChange={(e) => handleItemChange(index, 'valor_unitario', parseFloat(e.target.value))}
                      className={`w-full p-2 rounded-md ${
                        darkMode
                          ? 'bg-gray-700 text-white border-gray-600'
                          : 'bg-white text-gray-900 border-gray-300'
                      }`}
                    />
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${
                    darkMode ? 'text-gray-300' : 'text-gray-900'
                  }`}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.desconto}
                      onChange={(e) => handleItemChange(index, 'desconto', parseFloat(e.target.value))}
                      className={`w-full p-2 rounded-md ${
                        darkMode
                          ? 'bg-gray-700 text-white border-gray-600'
                          : 'bg-white text-gray-900 border-gray-300'
                      }`}
                    />
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${
                    darkMode ? 'text-gray-300' : 'text-gray-900'
                  }`}>
                    {item.valor_total.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${
                    darkMode ? 'text-gray-300' : 'text-gray-900'
                  }`}>
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className={`px-3 py-1 rounded-md ${
                        darkMode
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <td colSpan="4" className={`px-6 py-4 text-right font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-900'
                }`}>
                  Total:
                </td>
                <td className={`px-6 py-4 font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-900'
                }`}>
                  {orcamento.itens.reduce((total, item) => total + item.valor_total, 0).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrcamentoEdit; 