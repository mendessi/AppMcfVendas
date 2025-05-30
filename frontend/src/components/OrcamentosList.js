import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiSearch, FiCalendar } from 'react-icons/fi';
import api from '../services/api';

const OrcamentosList = ({ darkMode }) => {
  const [orcamentos, setOrcamentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    cliente: '',
    data_inicio: '',
    data_fim: ''
  });

  useEffect(() => {
    buscarOrcamentos();
  }, [filtros]);

  const buscarOrcamentos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const empresa = localStorage.getItem('empresa_atual');
      
      const params = new URLSearchParams();
      if (filtros.cliente) params.append('cliente', filtros.cliente);
      if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros.data_fim) params.append('data_fim', filtros.data_fim);

      const response = await api.get(`/orcamentos?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-empresa-codigo': empresa
        }
      });

      setOrcamentos(response.data);
    } catch (error) {
      console.error('Erro ao buscar orçamentos:', error);
      setError('Erro ao carregar orçamentos. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExcluir = async (numero) => {
    if (!window.confirm('Tem certeza que deseja excluir este orçamento?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const empresa = localStorage.getItem('empresa_atual');
      
      await api.delete(`/orcamentos/${numero}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-empresa-codigo': empresa
        }
      });

      setOrcamentos(orcamentos.filter(o => o.numero !== numero));
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      alert('Erro ao excluir orçamento. Por favor, tente novamente.');
    }
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarValor = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <div className={`p-6 ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Orçamentos</h1>
        <Link
          to="/orcamentos/novo"
          className={`px-4 py-2 rounded-md ${
            darkMode
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          Novo Orçamento
        </Link>
      </div>

      {/* Filtros */}
      <div className={`mb-6 p-4 rounded-lg ${
        darkMode ? "bg-gray-700" : "bg-gray-50"
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Cliente
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className={`h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
              </div>
              <input
                type="text"
                value={filtros.cliente}
                onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })}
                placeholder="Buscar por cliente..."
                className={`pl-10 w-full rounded-md ${
                  darkMode
                    ? "bg-gray-600 border-gray-500 text-white"
                    : "bg-white border-gray-300 text-gray-700"
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Data Inicial
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCalendar className={`h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
              </div>
              <input
                type="date"
                value={filtros.data_inicio}
                onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })}
                className={`pl-10 w-full rounded-md ${
                  darkMode
                    ? "bg-gray-600 border-gray-500 text-white"
                    : "bg-white border-gray-300 text-gray-700"
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Data Final
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCalendar className={`h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
              </div>
              <input
                type="date"
                value={filtros.data_fim}
                onChange={(e) => setFiltros({ ...filtros, data_fim: e.target.value })}
                className={`pl-10 w-full rounded-md ${
                  darkMode
                    ? "bg-gray-600 border-gray-500 text-white"
                    : "bg-white border-gray-300 text-gray-700"
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Orçamentos */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`mt-4 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Carregando orçamentos...
          </p>
        </div>
      ) : error ? (
        <div className={`text-center py-8 ${darkMode ? "text-red-400" : "text-red-600"}`}>
          {error}
        </div>
      ) : orcamentos.length === 0 ? (
        <div className={`text-center py-8 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
          Nenhum orçamento encontrado
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${
            darkMode ? "divide-gray-700" : "divide-gray-200"
          }`}>
            <thead className={darkMode ? "bg-gray-700" : "bg-gray-50"}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${
                  darkMode ? "text-gray-300" : "text-gray-500"
                } uppercase tracking-wider`}>
                  Número
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${
                  darkMode ? "text-gray-300" : "text-gray-500"
                } uppercase tracking-wider`}>
                  Cliente
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${
                  darkMode ? "text-gray-300" : "text-gray-500"
                } uppercase tracking-wider`}>
                  Data
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${
                  darkMode ? "text-gray-300" : "text-gray-500"
                } uppercase tracking-wider`}>
                  Validade
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${
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
              darkMode ? "divide-gray-700 bg-gray-800" : "divide-gray-200 bg-white"
            }`}>
              {orcamentos.map((orcamento) => (
                <tr key={orcamento.numero} className={darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}>
                  <td className={`px-6 py-4 whitespace-nowrap ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {orcamento.numero}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {orcamento.cliente_nome}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {formatarData(orcamento.data)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {formatarData(orcamento.validade)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {formatarValor(orcamento.valor_total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/orcamentos/${orcamento.numero}`}
                      className={`text-blue-600 hover:text-blue-900 mr-4 ${
                        darkMode ? "hover:text-blue-400" : ""
                      }`}
                    >
                      <FiEdit2 className="inline-block" />
                    </Link>
                    <button
                      onClick={() => handleExcluir(orcamento.numero)}
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
          </table>
        </div>
      )}
    </div>
  );
};

export default OrcamentosList;
