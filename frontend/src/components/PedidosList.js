import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const PedidosList = ({ darkMode }) => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPedidos, setFilteredPedidos] = useState([]);
  const [expandedPedido, setExpandedPedido] = useState(null);

  useEffect(() => {
    // Em um ambiente real, você faria uma chamada à API aqui
    // Por enquanto, vamos simular dados
    const fetchPedidos = async () => {
      try {
        // Simular uma chamada de API
        setTimeout(() => {
          const mockPedidos = [
            {
              id: 1,
              cliente_id: 1,
              cliente_nome: 'Supermercado Silva',
              data: '2025-05-18T10:30:00',
              status: 'CONCLUÍDO',
              valor_total: 1250.75,
              observacao: 'Entrega agendada para segunda-feira',
              itens: [
                { produto_id: 1, produto_descricao: 'Arroz Branco 5kg', quantidade: 10, preco_unitario: 24.90, valor_total: 249.00 },
                { produto_id: 2, produto_descricao: 'Feijão Carioca 1kg', quantidade: 15, preco_unitario: 8.50, valor_total: 127.50 },
                { produto_id: 5, produto_descricao: 'Óleo de Soja 900ml', quantidade: 20, preco_unitario: 7.80, valor_total: 156.00 },
              ]
            },
            {
              id: 2,
              cliente_id: 3,
              cliente_nome: 'Padaria Pão Quente',
              data: '2025-05-18T14:45:00',
              status: 'PENDENTE',
              valor_total: 875.20,
              observacao: '',
              itens: [
                { produto_id: 9, produto_descricao: 'Farinha de Trigo 1kg', quantidade: 50, preco_unitario: 4.50, valor_total: 225.00 },
                { produto_id: 3, produto_descricao: 'Açúcar Refinado 1kg', quantidade: 30, preco_unitario: 5.99, valor_total: 179.70 },
                { produto_id: 4, produto_descricao: 'Café Torrado 500g', quantidade: 15, preco_unitario: 15.90, valor_total: 238.50 },
              ]
            },
            {
              id: 3,
              cliente_id: 2,
              cliente_nome: 'Farmácia Saúde',
              data: '2025-05-17T09:15:00',
              status: 'CANCELADO',
              valor_total: 0,
              observacao: 'Cliente solicitou cancelamento',
              itens: []
            },
            {
              id: 4,
              cliente_id: 5,
              cliente_nome: 'Mercado Central',
              data: '2025-05-16T16:20:00',
              status: 'CONCLUÍDO',
              valor_total: 2345.60,
              observacao: '',
              itens: [
                { produto_id: 1, produto_descricao: 'Arroz Branco 5kg', quantidade: 20, preco_unitario: 24.90, valor_total: 498.00 },
                { produto_id: 2, produto_descricao: 'Feijão Carioca 1kg', quantidade: 25, preco_unitario: 8.50, valor_total: 212.50 },
                { produto_id: 6, produto_descricao: 'Leite Integral 1L', quantidade: 100, preco_unitario: 4.99, valor_total: 499.00 },
                { produto_id: 7, produto_descricao: 'Macarrão Espaguete 500g', quantidade: 50, preco_unitario: 3.50, valor_total: 175.00 },
              ]
            },
            {
              id: 5,
              cliente_id: 4,
              cliente_nome: 'Açougue Boi Feliz',
              data: '2025-05-15T11:10:00',
              status: 'CONCLUÍDO',
              valor_total: 567.80,
              observacao: 'Cliente pagou em dinheiro',
              itens: [
                { produto_id: 3, produto_descricao: 'Açúcar Refinado 1kg', quantidade: 20, preco_unitario: 5.99, valor_total: 119.80 },
                { produto_id: 8, produto_descricao: 'Sal Refinado 1kg', quantidade: 15, preco_unitario: 2.99, valor_total: 44.85 },
                { produto_id: 10, produto_descricao: 'Molho de Tomate 340g', quantidade: 30, preco_unitario: 2.79, valor_total: 83.70 },
              ]
            },
          ];
          setPedidos(mockPedidos);
          setFilteredPedidos(mockPedidos);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
        setLoading(false);
      }
    };

    fetchPedidos();
  }, []);

  useEffect(() => {
    // Filtrar pedidos com base no termo de pesquisa
    const results = pedidos.filter(pedido =>
      pedido.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.id.toString().includes(searchTerm) ||
      pedido.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPedidos(results);
  }, [searchTerm, pedidos]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    const options = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
  };

  const togglePedidoDetails = (pedidoId) => {
    if (expandedPedido === pedidoId) {
      setExpandedPedido(null);
    } else {
      setExpandedPedido(pedidoId);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status.toUpperCase()) {
      case 'CONCLUÍDO':
        return darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800';
      case 'PENDENTE':
        return darkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800';
      case 'CANCELADO':
        return darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800';
      default:
        return darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className={darkMode ? "text-blue-400" : "text-blue-600"}>Carregando pedidos...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Pedidos</h1>
        <Link to="/novo-pedido" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full sm:w-auto">
          Novo Pedido
        </Link>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por cliente, número do pedido ou status..."
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
                  Pedido
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  Cliente
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  Data
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  Status
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  Valor Total
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className={`${darkMode ? "bg-gray-800" : "bg-white"} divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
              {filteredPedidos.length > 0 ? (
                filteredPedidos.map((pedido) => (
                  <React.Fragment key={pedido.id}>
                    <tr className={darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>#{pedido.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{pedido.cliente_nome}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{formatDate(pedido.data)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(pedido.status)}`}>
                          {pedido.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(pedido.valor_total)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          className={darkMode ? "text-blue-400 hover:text-blue-300 mr-3" : "text-blue-600 hover:text-blue-900 mr-3"}
                          onClick={() => togglePedidoDetails(pedido.id)}
                        >
                          {expandedPedido === pedido.id ? 'Ocultar' : 'Detalhes'}
                        </button>
                        <button className={darkMode ? "text-green-400 hover:text-green-300 mr-3" : "text-green-600 hover:text-green-900 mr-3"}>Editar</button>
                        <button className={darkMode ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-900"}>Cancelar</button>
                      </td>
                    </tr>
                    {expandedPedido === pedido.id && (
                      <tr>
                        <td colSpan="6" className={`px-6 py-4 ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                          <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>
                            <h3 className="font-bold mb-2">Detalhes do Pedido #{pedido.id}</h3>
                            
                            {pedido.observacao && (
                              <div className="mb-3">
                                <p className="font-semibold">Observação:</p>
                                <p>{pedido.observacao}</p>
                              </div>
                            )}
                            
                            <div className="mt-3">
                              <p className="font-semibold mb-2">Itens do Pedido:</p>
                              {pedido.itens.length > 0 ? (
                                <div className="overflow-x-auto">
                                  <table className={`min-w-full divide-y ${darkMode ? "divide-gray-600 border-gray-600" : "divide-gray-200 border-gray-200"} border`}>
                                    <thead className={darkMode ? "bg-gray-800" : "bg-gray-100"}>
                                      <tr>
                                        <th className={`px-4 py-2 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Produto</th>
                                        <th className={`px-4 py-2 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Quantidade</th>
                                        <th className={`px-4 py-2 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Preço Unit.</th>
                                        <th className={`px-4 py-2 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody className={`${darkMode ? "divide-gray-700" : "divide-gray-200"} divide-y`}>
                                      {pedido.itens.map((item, index) => (
                                        <tr key={index} className={darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}>
                                          <td className={`px-4 py-2 text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{item.produto_descricao}</td>
                                          <td className={`px-4 py-2 text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{item.quantidade}</td>
                                          <td className={`px-4 py-2 text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(item.preco_unitario)}</td>
                                          <td className={`px-4 py-2 text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(item.valor_total)}</td>
                                        </tr>
                                      ))}
                                      <tr className={darkMode ? "bg-gray-800" : "bg-gray-100"}>
                                        <td colSpan="3" className={`px-4 py-2 text-sm font-bold text-right ${darkMode ? "text-white" : "text-gray-900"}`}>Total:</td>
                                        <td className={`px-4 py-2 text-sm font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(pedido.valor_total)}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className={darkMode ? "text-gray-400 italic" : "text-gray-500 italic"}>Nenhum item no pedido</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className={`px-6 py-4 text-center text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Nenhum pedido encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Versão para dispositivos móveis - cards */}
      <div className="md:hidden">
        {filteredPedidos.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredPedidos.map((pedido) => (
              <div key={pedido.id} className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow p-4`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`text-lg font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>Pedido #{pedido.id}</h3>
                    <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"} mt-1`}>{pedido.cliente_nome}</p>
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"} mt-1`}>{formatDate(pedido.data)}</p>
                  </div>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(pedido.status)}`}>
                    {pedido.status}
                  </span>
                </div>
                
                <div className="mt-4 flex justify-between items-center">
                  <div>
                    <span className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase`}>Valor Total:</span>
                    <p className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(pedido.valor_total)}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      className={`px-3 py-1 rounded ${darkMode ? "bg-blue-900 text-blue-300 hover:bg-blue-800" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
                      onClick={() => togglePedidoDetails(pedido.id)}
                    >
                      {expandedPedido === pedido.id ? 'Ocultar' : 'Detalhes'}
                    </button>
                    <button className={`px-3 py-1 rounded ${darkMode ? "bg-green-900 text-green-300 hover:bg-green-800" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>Editar</button>
                    <button className={`px-3 py-1 rounded ${darkMode ? "bg-red-900 text-red-300 hover:bg-red-800" : "bg-red-100 text-red-700 hover:bg-red-200"}`}>Cancelar</button>
                  </div>
                </div>
                
                {expandedPedido === pedido.id && (
                  <div className={`mt-4 pt-4 border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                    {pedido.observacao && (
                      <div className="mb-3">
                        <p className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>Observação:</p>
                        <p className={darkMode ? "text-gray-300" : "text-gray-700"}>{pedido.observacao}</p>
                      </div>
                    )}
                    
                    <div className="mt-3">
                      <p className={`font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>Itens do Pedido:</p>
                      {pedido.itens.length > 0 ? (
                        <div className="space-y-2">
                          {pedido.itens.map((item, index) => (
                            <div key={index} className={`p-2 rounded ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                              <div className="flex justify-between">
                                <span className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>{item.produto_descricao}</span>
                                <span className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(item.valor_total)}</span>
                              </div>
                              <div className="flex justify-between text-sm mt-1">
                                <span className={darkMode ? "text-gray-400" : "text-gray-500"}>{item.quantidade} x {formatCurrency(item.preco_unitario)}</span>
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-between font-bold mt-2 pt-2 border-t border-dashed border-gray-300">
                            <span className={darkMode ? "text-white" : "text-gray-900"}>Total:</span>
                            <span className={darkMode ? "text-white" : "text-gray-900"}>{formatCurrency(pedido.valor_total)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className={darkMode ? "text-gray-400 italic" : "text-gray-500 italic"}>Nenhum item no pedido</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow p-6 text-center`}>
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Nenhum pedido encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PedidosList;
