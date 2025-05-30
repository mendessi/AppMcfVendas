import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ProdutosList = ({ darkMode, empresaSelecionada }) => {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProdutos, setFilteredProdutos] = useState([]);

  const handleBuscar = () => {
    if (searchTerm.length >= 2 || searchTerm.length === 0) {
      fetchProdutos(searchTerm);
    }
  };

  const fetchProdutos = async (busca) => {
    setLoading(true);
    try {
      const empresaCodigo = empresaSelecionada?.cli_codigo || empresaSelecionada?.codigo;
      const url = busca && busca.length >= 2 ? `/relatorios/produtos?q=${encodeURIComponent(busca)}` : `/relatorios/produtos?q=`;
      
      const response = await api.get(url);
      const data = response.data;
      
      const produtosPadronizados = data.map((p, idx) => ({
        id: idx + 1,
        codigo: p.pro_codigo,
        descricao: p.pro_descricao,
        preco: p.pro_venda,
        aprazo: p.pro_vendapz,
        estoque: p.pro_quantidade,
        unidade: p.uni_codigo
      }));
      setProdutos(produtosPadronizados);
      setFilteredProdutos(produtosPadronizados);
    } catch (error) {
      setProdutos([]);
      setFilteredProdutos([]);
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className={darkMode ? "text-blue-400" : "text-blue-600"}>Carregando produtos...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Produtos</h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full sm:w-auto">
          Novo Produto
        </button>
      </div>

      <div className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Buscar por código ou descrição..."
          className={`flex-1 p-2 border rounded ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-700"}`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleBuscar(); }}
        />
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleBuscar}
          disabled={loading || searchTerm.length < 2}
        >
          Buscar
        </button>
      </div>

      {/* Versão para desktop */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={darkMode ? "bg-gray-700" : "bg-gray-50"}>
              <tr>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-300" : "text-gray-500"} uppercase tracking-wider`}>Código</th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-300" : "text-gray-500"} uppercase tracking-wider`}>Descrição</th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-300" : "text-gray-500"} uppercase tracking-wider`}>Preço</th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-300" : "text-gray-500"} uppercase tracking-wider`}>A Prazo</th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-300" : "text-gray-500"} uppercase tracking-wider`}>Estoque</th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-300" : "text-gray-500"} uppercase tracking-wider`}>Unidade</th>
              </tr>
            </thead>
            <tbody className={`${darkMode ? "bg-gray-800" : "bg-white"} divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
              {filteredProdutos.length > 0 ? (
                filteredProdutos.map((produto) => (
                  <tr key={produto.id} className={darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>{produto.codigo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{produto.descricao}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(produto.preco)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(produto.aprazo)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{produto.estoque}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{produto.unidade}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center">
                    <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {loading ? "Carregando..." : "Nenhum produto encontrado"}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Versão para mobile */}
      <div className="md:hidden">
        {filteredProdutos.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredProdutos.map((produto) => (
              <div key={produto.id} className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow p-4`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`text-lg font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>{produto.descricao}</h3>
                    <p className={`text-sm ${darkMode ? "text-blue-400" : "text-blue-600"} mt-1`}>Código: {produto.codigo}</p>
                  </div>
                  <div className="flex">
                    <button className={`${darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-900"} mr-3`}>Editar</button>
                    <button className={darkMode ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-900"}>Excluir</button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div>
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Preço:</p>
                    <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(produto.preco)}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>A Prazo:</p>
                    <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(produto.aprazo)}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Estoque:</p>
                    <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>{produto.estoque}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Unidade:</p>
                    <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>{produto.unidade}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`text-center py-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            {loading ? "Carregando..." : "Nenhum produto encontrado"}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProdutosList;
