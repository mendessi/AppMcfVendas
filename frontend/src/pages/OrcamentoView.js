import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const OrcamentoView = ({ darkMode }) => {
  const { numero } = useParams();
  const navigate = useNavigate();
  const [orcamento, setOrcamento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    carregarOrcamento();
  }, [numero]);

  const carregarOrcamento = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const empresaCodigo = localStorage.getItem('empresa_atual');

      if (!token || !empresaCodigo) {
        throw new Error('Token ou código da empresa não encontrado');
      }

      const response = await axios.get(`/api/orcamentos/${numero}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaCodigo
        }
      });

      console.log('Orçamento carregado:', response.data);
      setOrcamento(response.data);
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
      setError('Erro ao carregar orçamento. Por favor, tente novamente.');
      toast.error('Erro ao carregar orçamento. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = async () => {
    try {
      const token = localStorage.getItem('token');
      const empresaCodigo = localStorage.getItem('empresa_atual');

      if (!token || !empresaCodigo) {
        throw new Error('Token ou código da empresa não encontrado');
      }

      const response = await axios.get(`/api/orcamentos/${numero}/imprimir`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaCodigo
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orcamento-${numero}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Erro ao imprimir orçamento:', error);
      toast.error('Erro ao imprimir orçamento. Por favor, tente novamente.');
    }
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

  if (!orcamento) {
    return (
      <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md`}>
        <div className="text-center">Orçamento não encontrado</div>
      </div>
    );
  }

  return (
    <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Orçamento #{orcamento.numero}
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
            Voltar
          </button>
          <button
            onClick={() => navigate(`/orcamentos/editar/${numero}`)}
            className={`px-4 py-2 rounded-md ${
              darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Editar
          </button>
          <button
            onClick={handleImprimir}
            className={`px-4 py-2 rounded-md ${
              darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            Imprimir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Cliente */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Cliente
          </label>
          <div className={`p-2 rounded-md ${
            darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
          }`}>
            {orcamento.cliente_nome}
          </div>
        </div>

        {/* Vendedor */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Vendedor
          </label>
          <div className={`p-2 rounded-md ${
            darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
          }`}>
            {orcamento.vendedor_nome}
          </div>
        </div>

        {/* Forma de Pagamento */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Forma de Pagamento
          </label>
          <div className={`p-2 rounded-md ${
            darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
          }`}>
            {orcamento.forma_pagamento_nome}
          </div>
        </div>

        {/* Tabela de Preço */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Tabela de Preço
          </label>
          <div className={`p-2 rounded-md ${
            darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
          }`}>
            {orcamento.tabela_preco_nome}
          </div>
        </div>

        {/* Desconto */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Desconto
          </label>
          <div className={`p-2 rounded-md ${
            darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
          }`}>
            {orcamento.desconto}%
          </div>
        </div>

        {/* Validade */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Validade
          </label>
          <div className={`p-2 rounded-md ${
            darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
          }`}>
            {new Date(orcamento.validade).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Observação */}
      {orcamento.observacao && (
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Observação
          </label>
          <div className={`p-2 rounded-md ${
            darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
          }`}>
            {orcamento.observacao}
          </div>
        </div>
      )}

      {/* Itens do Orçamento */}
      <div>
        <h2 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Itens do Orçamento
        </h2>

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
              </tr>
            </thead>
            <tbody className={`divide-y ${
              darkMode ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'
            }`}>
              {orcamento.itens.map((item, index) => {
                const valorItem = item.quantidade * item.valor_unitario;
                const descontoItem = valorItem * (item.desconto / 100);
                const totalItem = valorItem - descontoItem;

                return (
                  <tr key={index}>
                    <td className={`px-6 py-4 whitespace-nowrap ${
                      darkMode ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {item.produto_nome}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${
                      darkMode ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {item.quantidade}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${
                      darkMode ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {item.valor_unitario.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${
                      darkMode ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {item.desconto}%
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${
                      darkMode ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {totalItem.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </td>
                  </tr>
                );
              })}
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
                  {orcamento.valor_total.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrcamentoView; 