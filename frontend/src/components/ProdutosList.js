import React, { useState, useEffect } from 'react';

const ProdutosList = ({ darkMode }) => {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProdutos, setFilteredProdutos] = useState([]);

  useEffect(() => {
    // Em um ambiente real, você faria uma chamada à API aqui
    // Por enquanto, vamos simular dados
    const fetchProdutos = async () => {
      try {
        // Simular uma chamada de API
        setTimeout(() => {
          const mockProdutos = [
            { id: 1, codigo: 'P001', descricao: 'Arroz Branco 5kg', preco: 24.90, estoque: 50, unidade: 'PCT' },
            { id: 2, codigo: 'P002', descricao: 'Feijão Carioca 1kg', preco: 8.50, estoque: 35, unidade: 'PCT' },
            { id: 3, codigo: 'P003', descricao: 'Açúcar Refinado 1kg', preco: 5.99, estoque: 40, unidade: 'PCT' },
            { id: 4, codigo: 'P004', descricao: 'Café Torrado 500g', preco: 15.90, estoque: 25, unidade: 'PCT' },
            { id: 5, codigo: 'P005', descricao: 'Óleo de Soja 900ml', preco: 7.80, estoque: 30, unidade: 'UND' },
            { id: 6, codigo: 'P006', descricao: 'Leite Integral 1L', preco: 4.99, estoque: 60, unidade: 'CX' },
            { id: 7, codigo: 'P007', descricao: 'Macarrão Espaguete 500g', preco: 3.50, estoque: 45, unidade: 'PCT' },
            { id: 8, codigo: 'P008', descricao: 'Sal Refinado 1kg', preco: 2.99, estoque: 55, unidade: 'PCT' },
            { id: 9, codigo: 'P009', descricao: 'Farinha de Trigo 1kg', preco: 4.50, estoque: 38, unidade: 'PCT' },
            { id: 10, codigo: 'P010', descricao: 'Molho de Tomate 340g', preco: 2.79, estoque: 42, unidade: 'UND' },
          ];
          setProdutos(mockProdutos);
          setFilteredProdutos(mockProdutos);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        setLoading(false);
      }
    };

    fetchProdutos();
  }, []);

  useEffect(() => {
    // Filtrar produtos com base no termo de pesquisa
    const results = produtos.filter(produto =>
      produto.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProdutos(results);
  }, [searchTerm, produtos]);

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

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por código ou descrição..."
          className={`w-full p-2 border rounded ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-700"}`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Versão para desktop */}
      <div className="hidden md:block">
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow overflow-hidden`}>
          <table className="min-w-full divide-y divide-gray-700">
            <thead className={darkMode ? "bg-gray-900" : "bg-gray-50"}>
              <tr>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  Código
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  Descrição
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  Preço
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  Estoque
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  Unidade
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  Ações
                </th>
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
                      <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{produto.estoque}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{produto.unidade}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className={darkMode ? "text-blue-400 hover:text-blue-300 mr-3" : "text-blue-600 hover:text-blue-900 mr-3"}>Editar</button>
                      <button className={darkMode ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-900"}>Excluir</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className={`px-6 py-4 text-center text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Nenhum produto encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Versão para dispositivos móveis - cards */}
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
                
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div>
                    <span className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase`}>Preço:</span>
                    <p className={`text-sm ${darkMode ? "text-white" : "text-gray-900"} font-bold`}>{formatCurrency(produto.preco)}</p>
                  </div>
                  <div>
                    <span className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase`}>Estoque:</span>
                    <p className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{produto.estoque}</p>
                  </div>
                  <div>
                    <span className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase`}>Unidade:</span>
                    <p className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{produto.unidade}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow p-6 text-center`}>
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Nenhum produto encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProdutosList;
