import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { FiUser, FiPhone, FiMapPin, FiShoppingBag, FiDollarSign, FiCalendar } from 'react-icons/fi';

const TopClientes = ({ darkMode, empresaSelecionada, dataInicial, dataFinal, dadosEmCache, topClientes }) => {
  // Estados para modais e carregamento de vendas/itens
  const [modalVendas, setModalVendas] = useState({ open: false, vendas: [], cliente: null });
  const [modalItens, setModalItens] = useState({ open: false, itens: [], venda: null });
  const [loadingVendas, setLoadingVendas] = useState(false);
  const [loadingItens, setLoadingItens] = useState(false);
  const [errorVendas, setErrorVendas] = useState(null);
  const [errorItens, setErrorItens] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Tenta carregar do cache
        const cacheData = localStorage.getItem('topClientesCache');
        if (cacheData) {
          const dadosCache = JSON.parse(cacheData);
          const agora = new Date().getTime();
          // Cache válido por 2 horas
          if (agora - dadosCache.timestamp < 2 * 60 * 60 * 1000 && dadosCache.dataInicial === dataInicial && dadosCache.dataFinal === dataFinal && dadosCache.empresaCodigo === (empresaSelecionada?.codigo || empresaSelecionada?.cli_codigo)) {
            setClientes(dadosCache.clientes);
            setLoading(false);
            return;
          }
        }
        // Se não tem cache válido, busca da API
        const token = localStorage.getItem('token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };
        if (empresaSelecionada && empresaSelecionada.codigo) {
          headers['x-empresa-codigo'] = empresaSelecionada.codigo.toString();
        }
        const url = `${API_URL}/relatorios/top-clientes?data_inicial=${dataInicial}&data_final=${dataFinal}`;
        const response = await axios.get(url, { headers });
        if (response.status === 200) {
          const dados = Array.isArray(response.data) ? response.data : Array.isArray(response.data.top_clientes) ? response.data.top_clientes : [];
          setClientes(dados);
          // Salva no cache
          localStorage.setItem('topClientesCache', JSON.stringify({
            clientes: dados,
            dataInicial,
            dataFinal,
            empresaCodigo: empresaSelecionada?.codigo || empresaSelecionada?.cli_codigo,
            timestamp: new Date().getTime()
          }));
        }
      } catch (error) {
        setClientes([]);
      } finally {
        setLoading(false);
      }
    };
    if (dataInicial && dataFinal) {
      fetchData();
    }
  }, [empresaSelecionada, dataInicial, dataFinal]);

  // Handler para abrir vendas do cliente
  const handleVerVendas = async (cliente) => {
    setLoadingVendas(true);
    setErrorVendas(null);
    setModalVendas({ open: true, vendas: [], cliente });
    try {
      const token = localStorage.getItem('token');
      const empresaCodigo = empresaSelecionada?.cli_codigo || empresaSelecionada?.codigo;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'x-empresa-codigo': empresaCodigo,
        'Content-Type': 'application/json'
      };
      // Montar query string com período
      const params = [];
      if (dataInicial) params.push(`data_inicial=${encodeURIComponent(dataInicial)}`);
      if (dataFinal) params.push(`data_final=${encodeURIComponent(dataFinal)}`);
      const queryString = params.length > 0 ? `?${params.join('&')}` : '';
      const response = await fetch(`${API_URL}/relatorios/clientes/${cliente.codigo}/vendas${queryString}`, { headers });
      if (!response.ok) throw new Error('Erro ao buscar vendas do cliente');
      const vendas = await response.json();
      console.log('Vendas recebidas:', vendas); // Log para debug
      setModalVendas({ open: true, vendas, cliente });
    } catch (err) {
      console.error('Erro ao buscar vendas:', err); // Log para debug
      setErrorVendas('Erro ao buscar vendas.');
      setModalVendas({ open: true, vendas: [], cliente });
    } finally {
      setLoadingVendas(false);
    }
  };

  // Handler para abrir itens da venda
  const handleVerItens = async (venda) => {
    setLoadingItens(true);
    setErrorItens(null);
    setModalItens({ open: true, itens: [], venda });
    try {
      const token = localStorage.getItem('token');
      const empresaCodigo = empresaSelecionada?.cli_codigo || empresaSelecionada?.codigo;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'x-empresa-codigo': empresaCodigo,
        'Content-Type': 'application/json'
      };
      const response = await fetch(`${API_URL}/relatorios/vendas/${venda.ecf_numero}/itens`, { headers });
      if (!response.ok) throw new Error('Erro ao buscar itens da venda');
      const itens = await response.json();
      setModalItens({ open: true, itens, venda });
    } catch (err) {
      setErrorItens('Erro ao buscar itens.');
      setModalItens({ open: true, itens: [], venda });
    } finally {
      setLoadingItens(false);
    }
  };

  // Formatação de valores monetários
  const formatCurrency = (value) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    const numValue = Number(value);
    if (isNaN(numValue)) return 'R$ 0,00';
    return numValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Formatação de data
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      return 'N/A';
    }
  };

  // Garantir que clientes é sempre um array
  const clientesArray = Array.isArray(clientes) ? clientes : [];

  return (
    <div className={`w-full mb-8 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-2 sm:p-4`}>
      <h2 className={`text-lg sm:text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Top Clientes</h2>
      {loading ? (
        <div className="text-center text-gray-500">Carregando clientes...</div>
      ) : clientesArray.length === 0 ? (
        <div className="text-center text-gray-500">Nenhum cliente encontrado no período.</div>
      ) : (
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <table className="min-w-full">
            <thead>
              <tr className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <th className={`px-2 sm:px-4 py-2 text-left ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Cliente</th>
                <th className={`hidden sm:table-cell px-2 sm:px-4 py-2 text-left ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Contato</th>
                <th className={`hidden sm:table-cell px-2 sm:px-4 py-2 text-left ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Cidade</th>
                <th className={`px-2 sm:px-4 py-2 text-right ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Total</th>
                <th className={`hidden sm:table-cell px-2 sm:px-4 py-2 text-right ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Pedidos</th>
                <th className={`px-2 sm:px-4 py-2 text-center ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {clientesArray.map((cliente, index) => (
                <tr key={index} className={`${darkMode ? 'border-gray-700' : 'border-gray-200'} border-b`}>
                  <td className={`px-2 sm:px-4 py-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    <div className="flex items-center">
                      <FiUser className="mr-2" />
                      <div>
                        <div className="font-medium">{cliente.nome}</div>
                        <div className="sm:hidden text-sm text-gray-500">
                          {cliente.telefone && <div className="flex items-center"><FiPhone className="mr-1" />{cliente.telefone}</div>}
                          {cliente.cidade && <div className="flex items-center"><FiMapPin className="mr-1" />{cliente.cidade}</div>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={`hidden sm:table-cell px-2 sm:px-4 py-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    <div className="flex items-center">
                      <FiPhone className="mr-2" />
                      {cliente.telefone}
                    </div>
                  </td>
                  <td className={`hidden sm:table-cell px-2 sm:px-4 py-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    <div className="flex items-center">
                      <FiMapPin className="mr-2" />
                      {cliente.cidade}
                    </div>
                  </td>
                  <td className={`px-2 sm:px-4 py-2 text-right ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    <div className="flex items-center justify-end">
                      <FiDollarSign className="mr-1" />
                      {formatCurrency(cliente.total)}
                    </div>
                  </td>
                  <td className={`hidden sm:table-cell px-2 sm:px-4 py-2 text-right ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    <div className="flex items-center justify-end">
                      <FiShoppingBag className="mr-1" />
                      {cliente.qtde_compras}
                    </div>
                  </td>
                  <td className={`px-2 sm:px-4 py-2 text-center`}>
                    <button
                      onClick={() => handleVerVendas(cliente)}
                      className={`px-2 sm:px-3 py-1 text-sm sm:text-base rounded ${
                        darkMode 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      Ver Vendas
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Vendas */}
      {modalVendas.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto`}>
            <h3 className={`text-lg sm:text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Vendas de {modalVendas.cliente?.nome}
            </h3>
            {loadingVendas ? (
              <div className="text-center text-gray-500">Carregando vendas...</div>
            ) : errorVendas ? (
              <div className="text-center text-red-500">{errorVendas}</div>
            ) : modalVendas.vendas.length === 0 ? (
              <div className="text-center text-gray-500">Nenhuma venda encontrada.</div>
            ) : (
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="min-w-full">
                  <thead>
                    <tr className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <th className={`px-2 sm:px-4 py-2 text-left ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Venda</th>
                      <th className={`px-2 sm:px-4 py-2 text-left ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Data</th>
                      <th className={`px-2 sm:px-4 py-2 text-left ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Vendedor</th>
                      <th className={`px-2 sm:px-4 py-2 text-right ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Total</th>
                      <th className={`px-2 sm:px-4 py-2 text-right ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Desconto</th>
                      <th className={`px-2 sm:px-4 py-2 text-left ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Forma Pgto</th>
                      <th className={`px-2 sm:px-4 py-2 text-center ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalVendas.vendas.map((venda, index) => (
                      <tr key={index} className={`${darkMode ? 'border-gray-700' : 'border-gray-200'} border-b`}>
                        <td className={`px-2 sm:px-4 py-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{venda.ecf_numero}</td>
                        <td className={`px-2 sm:px-4 py-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{formatDate(venda.ecf_data)}</td>
                        <td className={`px-2 sm:px-4 py-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{venda.ven_nome}</td>
                        <td className={`px-2 sm:px-4 py-2 text-right ${darkMode ? 'text-white' : 'text-gray-800'}`}>{formatCurrency(venda.ecf_total)}</td>
                        <td className={`px-2 sm:px-4 py-2 text-right ${darkMode ? 'text-white' : 'text-gray-800'}`}>{formatCurrency(venda.ecf_desconto)}</td>
                        <td className={`px-2 sm:px-4 py-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{venda.fpg_nome}</td>
                        <td className={`px-2 sm:px-4 py-2 text-center`}>
                          <button
                            onClick={() => handleVerItens(venda)}
                            className={`px-2 sm:px-3 py-1 text-sm sm:text-base rounded ${
                              darkMode 
                                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                          >
                            Ver Itens
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 text-right">
              <button
                onClick={() => setModalVendas({ open: false, vendas: [], cliente: null })}
                className={`px-3 py-1 text-sm sm:text-base rounded ${
                  darkMode 
                    ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                    : 'bg-gray-500 hover:bg-gray-600 text-white'
                }`}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Itens */}
      {modalItens.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto`}>
            <h3 className={`text-lg sm:text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Itens da Venda: {modalItens.venda?.ECF_NUMERO}
            </h3>
            {loadingItens ? (
              <div className="text-center text-gray-500">Carregando itens...</div>
            ) : errorItens ? (
              <div className="text-center text-red-500">{errorItens}</div>
            ) : modalItens.itens.length === 0 ? (
              <div className="text-center text-gray-500">Nenhum item encontrado.</div>
            ) : (
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="min-w-full">
                  <thead>
                    <tr className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <th className={`px-2 sm:px-4 py-2 text-left ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Código</th>
                      <th className={`px-2 sm:px-4 py-2 text-left ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Descrição</th>
                      <th className={`px-2 sm:px-4 py-2 text-left ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Marca</th>
                      <th className={`px-2 sm:px-4 py-2 text-left ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Unidade</th>
                      <th className={`px-2 sm:px-4 py-2 text-right ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Qtde</th>
                      <th className={`px-2 sm:px-4 py-2 text-right ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Preço</th>
                      <th className={`px-2 sm:px-4 py-2 text-right ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>Estoque</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalItens.itens.map((item, index) => (
                      <tr key={index} className={`${darkMode ? 'border-gray-700' : 'border-gray-200'} border-b`}>
                        <td className={`px-2 sm:px-4 py-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{item.PRO_CODIGO}</td>
                        <td className={`px-2 sm:px-4 py-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{item.PRO_DESCRICAO}</td>
                        <td className={`px-2 sm:px-4 py-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{item.PRO_MARCA}</td>
                        <td className={`px-2 sm:px-4 py-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{item.UNI_CODIGO}</td>
                        <td className={`px-2 sm:px-4 py-2 text-right ${darkMode ? 'text-white' : 'text-gray-800'}`}>{item.PRO_QUANTIDADE}</td>
                        <td className={`px-2 sm:px-4 py-2 text-right ${darkMode ? 'text-white' : 'text-gray-800'}`}>{formatCurrency(item.PRO_VENDA)}</td>
                        <td className={`px-2 sm:px-4 py-2 text-right ${darkMode ? 'text-white' : 'text-gray-800'}`}>{item.ESTOQUE_ATUAL}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 text-right">
              <button
                onClick={() => setModalItens({ open: false, itens: [], venda: null })}
                className={`px-3 py-1 text-sm sm:text-base rounded ${
                  darkMode 
                    ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                    : 'bg-gray-500 hover:bg-gray-600 text-white'
                }`}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopClientes;
