import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const PedidosList = ({ darkMode }) => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPedidos, setFilteredPedidos] = useState([]);
  const [expandedPedido, setExpandedPedido] = useState(null);
  const [dataInicial, setDataInicial] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().slice(0, 10);
  });
  const [dataFinal, setDataFinal] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().slice(0, 10);
  });

  // Remover busca automática ao abrir no mobile
  useEffect(() => {
    if (window.innerWidth >= 768) {
      buscarPedidos();
    }
    // eslint-disable-next-line
  }, []);

  // Busca só será feita ao clicar em "Buscar" no mobile
  const buscarPedidos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const empresaSelecionada = localStorage.getItem('empresa') || localStorage.getItem('empresa_atual') || localStorage.getItem('empresa_selecionada');
      let empresaCodigo = null;
      if (empresaSelecionada) {
        try {
          const empObj = JSON.parse(empresaSelecionada);
          empresaCodigo = empObj?.cli_codigo || empObj?.codigo;
        } catch {
          empresaCodigo = empresaSelecionada;
        }
      }
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      if (empresaCodigo) headers['x-empresa-codigo'] = empresaCodigo;
      const apiUrl = process.env.REACT_APP_API_URL || '';
      // Montar query string de datas
      let url = `${apiUrl}/relatorios/vendas`;
      if (dataInicial && dataFinal) {
        url += `?data_inicial=${dataInicial}&data_final=${dataFinal}`;
      }
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error('Erro ao buscar pedidos');
      const data = await response.json();
      // Mapear os dados para o formato esperado pelo front
      const pedidosFormatados = data.map(venda => ({
        id: venda.ecf_numero,
        cliente_id: venda.cli_codigo,
        cliente_nome: venda.nome,
        data: venda.ecf_data,
        status: venda.ecf_total > 0 ? 'CONCLUÍDO' : 'PENDENTE',
        valor_total: venda.ecf_total,
        observacao: venda.observacao || '',
        autenticacao_data: venda.ecf_cx_data || null,
        autenticada: !!venda.ecf_cx_data,
        forma_pagamento: venda.fpg_nome || '',
        vendedor: venda.ven_nome || '',
        itens: [], // será preenchido ao expandir
      }));
      setPedidos(pedidosFormatados);
      setFilteredPedidos(pedidosFormatados);
    } catch (error) {
      setPedidos([]);
      setFilteredPedidos([]);
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setLoading(false);
    }
  }

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
      <div className="mb-6 flex flex-col sm:flex-row gap-2 items-start sm:items-end">
        <div>
          <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Data inicial</label>
          <input
            type="date"
            className={`p-2 border rounded ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-700"}`}
            value={dataInicial}
            onChange={e => setDataInicial(e.target.value)}
          />
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Data final</label>
          <input
            type="date"
            className={`p-2 border rounded ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-700"}`}
            value={dataFinal}
            onChange={e => setDataFinal(e.target.value)}
          />
        </div>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-5"
          onClick={buscarPedidos}
          disabled={loading}
        >Buscar</button>
      </div>

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
                  Autenticação
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  Status Autenticação
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  Forma Pgto
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  Vendedor
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  Valor Total
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
                        <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{pedido.autenticacao_data ? formatDate(pedido.autenticacao_data) : '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${pedido.autenticada ? (darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800') : (darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800')}`}>
                          {pedido.autenticada ? 'Autenticada' : 'Não Autenticada'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{pedido.forma_pagamento || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{pedido.vendedor || '-'}</div>
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
                      </td>
                    </tr>
                    {expandedPedido === pedido.id && (
                      <tr>
                        <td colSpan="9" className={`px-6 py-4 ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                          <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>
                            <h3 className="font-bold mb-2">Detalhes do Pedido #{pedido.id}</h3>
                            {pedido.observacao && (
                              <div className="mb-3">
                                <p className="font-semibold">Observação:</p>
                                <p>{pedido.observacao}</p>
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
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className={`px-6 py-4 text-center text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
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
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"} mt-1`}>Data: {formatDate(pedido.data)}</p>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Autenticação: {pedido.autenticacao_data ? formatDate(pedido.autenticacao_data) : '-'}</p>
                    <p className={`text-xs ${pedido.autenticada ? (darkMode ? 'text-green-300' : 'text-green-800') : (darkMode ? 'text-red-300' : 'text-red-800')}`}>Status: {pedido.autenticada ? 'Autenticada' : 'Não Autenticada'}</p>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Forma Pgto: {pedido.forma_pagamento || '-'}</p>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Vendedor: {pedido.vendedor || '-'}</p>
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
