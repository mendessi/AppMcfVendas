import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { FiUser, FiPhone, FiMapPin, FiShoppingBag, FiDollarSign, FiCalendar } from 'react-icons/fi';

const TopClientes = ({ darkMode, empresaSelecionada, dataInicial, dataFinal }) => {
  // Estados para modais e carregamento de vendas/itens
  const [modalVendas, setModalVendas] = useState({ open: false, vendas: [], cliente: null });
  const [modalItens, setModalItens] = useState({ open: false, itens: [], venda: null });
  const [loadingVendas, setLoadingVendas] = useState(false);
  const [loadingItens, setLoadingItens] = useState(false);
  const [errorVendas, setErrorVendas] = useState(null);
  const [errorItens, setErrorItens] = useState(null);

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
      const apiUrl = process.env.REACT_APP_API_URL || '';
      // Montar query string com período
      const params = [];
      if (dataInicial) params.push(`data_inicial=${encodeURIComponent(dataInicial)}`);
      if (dataFinal) params.push(`data_final=${encodeURIComponent(dataFinal)}`);
      const queryString = params.length > 0 ? `?${params.join('&')}` : '';
      const response = await fetch(`${apiUrl}/relatorios/clientes/${cliente.codigo}/vendas${queryString}`, { headers });
      if (!response.ok) throw new Error('Erro ao buscar vendas do cliente');
      const vendas = await response.json();
      setModalVendas({ open: true, vendas, cliente });
    } catch (err) {
      setErrorVendas('Erro ao buscar vendas.');
      setModalVendas({ open: true, vendas: [], cliente });
    } finally {
      setLoadingVendas(false);
    }
  };

  // Handler para abrir itens da venda
  const handleVerItensVenda = async (venda) => {
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
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/relatorios/vendas/${venda.ecf_numero}/itens`, { headers });
      if (!response.ok) throw new Error('Erro ao buscar itens da venda');
      const itens = await response.json();
      setModalItens({ open: true, itens, venda });
    } catch (err) {
      setErrorItens('Erro ao buscar itens da venda.');
      setModalItens({ open: true, itens: [], venda });
    } finally {
      setLoadingItens(false);
    }
  };
  const closeModalVendas = () => setModalVendas({ open: false, vendas: [], cliente: null });
  const closeModalItens = () => setModalItens({ open: false, itens: [], venda: null });
  // Log para debug
  console.log('TopClientes - Empresa selecionada recebida como prop:', empresaSelecionada);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topClientes, setTopClientes] = useState([]);
  const [filtroVendedor, setFiltroVendedor] = useState(null);



  useEffect(() => {
    // Buscar dados quando as props de data mudarem
    if (dataInicial && dataFinal) {
      fetchTopClientes();
    }
  }, [dataInicial, dataFinal, empresaSelecionada]);

  const fetchTopClientes = async () => {
    try {
      setLoading(true);
      
      // Obter o token de autenticação
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Autenticação necessária');
        setLoading(false);
        return;
      }
      
      // Usar a empresa selecionada recebida como prop, se disponível
      let empresaCodigo = null;
      
      if (empresaSelecionada && empresaSelecionada.cli_codigo) {
        // Se recebemos a empresa como prop, usar diretamente
        empresaCodigo = empresaSelecionada.cli_codigo;
        console.log(`TopClientes - Usando empresa da prop: ${empresaSelecionada.cli_nome} (${empresaCodigo})`);
      } else {
        // Backup: Verificar localStorage se não recebemos a empresa como prop
        console.log('TopClientes - Empresa não recebida como prop, verificando localStorage');
        const empresaData = localStorage.getItem('empresa') || 
                         localStorage.getItem('empresa_atual') || 
                         localStorage.getItem('empresa_selecionada');
        
        if (!empresaData) {
          setError('Nenhuma empresa selecionada');
          setLoading(false);
          return;
        }

        // Extrair o código da empresa do objeto JSON armazenado
        try {
          const empresaObj = JSON.parse(empresaData);
          if (empresaObj && empresaObj.cli_codigo) {
            empresaCodigo = empresaObj.cli_codigo;
            console.log(`TopClientes - Empresa do localStorage: ${empresaObj.cli_nome} (${empresaCodigo})`);
          }
        } catch (e) {
          console.error('Erro ao processar dados da empresa:', e);
        }
        
        // Se não conseguiu extrair do JSON, tentar o legado
        if (!empresaCodigo) {
          empresaCodigo = localStorage.getItem("empresaCodigo");
          console.log(`TopClientes - Usando código legado do localStorage: ${empresaCodigo}`);
        }
      }
      
      // Verificar se temos um código de empresa válido
      if (!empresaCodigo) {
        setError('Código da empresa não identificado');
        setLoading(false);
        return;
      }
      
      console.log(`TopClientes - Código final da empresa: ${empresaCodigo}`);
      
      // Configurar headers
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Adicionar cabeçalho x-empresa-codigo - fundamental para nosso sistema híbrido
      headers["x-empresa-codigo"] = empresaCodigo;
      console.log(`TopClientes - Adicionando cabeçalho x-empresa-codigo: ${empresaCodigo}`);
      
      console.log(`TopClientes - Fazendo requisição com cabeçalhos:`, headers);
      
      const response = await axios.get(
        `${API_URL}/relatorios/top-clientes?data_inicial=${dataInicial}&data_final=${dataFinal}`,
        {
          headers: headers,
          withCredentials: true,
        }
      );
      
      console.log('TopClientes - Resposta completa recebida:', response.data);

      // Armazenar os clientes
      if (Array.isArray(response.data.top_clientes)) {
        setTopClientes(response.data.top_clientes);
      } else if (Array.isArray(response.data)) {
        // Compatibilidade com o formato anterior
        setTopClientes(response.data);
        console.log('Formato antigo detectado - array direto');
      } else {
        console.error('Formato de resposta inesperado:', response.data);
        setTopClientes([]);
      }
      
      // Verificar se temos informações de filtro de vendedor
      // Estrutura esperada: { filtro_aplicado: { vendedor: { codigo, nome }, filtro_vendedor_ativo: true } }
      console.log('Verificando se há filtro de vendedor:', response.data);
      
      if (response.data.filtro_aplicado) {
        console.log('Filtro aplicado encontrado:', response.data.filtro_aplicado);
        
        if (response.data.filtro_aplicado.filtro_vendedor_ativo && 
            response.data.filtro_aplicado.vendedor) {
          console.log('Vendedor encontrado nos dados da resposta:', response.data.filtro_aplicado.vendedor);
          setFiltroVendedor(response.data.filtro_aplicado.vendedor);
        } else {
          console.log('Filtro de vendedor não está ativo ou vendedor ausente');
          setFiltroVendedor(null);
        }
      } else {
        console.log('Estrutura filtro_aplicado não encontrada na resposta');
        setFiltroVendedor(null);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Erro ao buscar top clientes:", error);
      
      // Obter detalhes do erro para exibir uma mensagem mais informativa
      let mensagemErro = "Erro ao carregar os dados. Por favor, tente novamente.";
      
      if (error.response) {
        // O servidor respondeu com um código de erro
        console.log('Resposta de erro:', error.response);
        
        // Usar a mensagem de erro retornada pela API, se disponível
        if (error.response.data && error.response.data.detail) {
          mensagemErro = `Erro ${error.response.status}: ${error.response.data.detail}`;
        } else {
          mensagemErro = `Erro ${error.response.status}: ${error.response.statusText}`;
        }
        
        // Mensagens personalizadas para códigos de erro comuns
        if (error.response.status === 401) {
          mensagemErro = "Sessão expirada. Por favor, faça login novamente.";
        } else if (error.response.status === 404) {
          mensagemErro = "As tabelas necessárias não foram encontradas no banco de dados.";
        } else if (error.response.status === 503) {
          mensagemErro = "Não foi possível conectar ao banco de dados. Verifique as configurações da empresa.";
        }
      } else if (error.request) {
        // A requisição foi feita mas não houve resposta
        mensagemErro = "Servidor não respondeu. Verifique sua conexão com a internet.";
      }
      
      setError(mensagemErro);
      setLoading(false);
    }
  };



  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatarDataExibicao = (dataString) => {
    if (!dataString) return '';
    
    const data = new Date(dataString);
    return new Intl.DateTimeFormat('pt-BR').format(data);
  };

  return (
    <div className={`p-4 mb-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
      {/* Exibir informações do vendedor se disponíveis */}
      {filtroVendedor && (
        <div className={`mb-4 px-3 py-2 rounded ${darkMode ? 'bg-blue-900/30 text-blue-200' : 'bg-blue-50 text-blue-800'}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center">
              <span className="font-medium">Vendedor:</span>
              <span className="ml-2 font-bold">{filtroVendedor.codigo}</span>
              {filtroVendedor.nome && (
                <span className="ml-1">- {filtroVendedor.nome}</span>
              )}
            </div>
            {filtroVendedor.email && (
              <div className="text-sm">
                <span className="font-medium">Email:</span>
                <span className="ml-1">{filtroVendedor.email}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Top Clientes
        </h2>
      </div>
      
      {loading ? (
        <div className="text-center py-4">
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Carregando dados...
          </p>
        </div>
      ) : error ? (
        <p className={`text-center py-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
          {error}
        </p>
      ) : topClientes.length === 0 ? (
        <p className={`text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Nenhum cliente encontrado no período.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className={`min-w-full table-auto ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            <thead>
              <tr className={darkMode ? 'border-b border-gray-700' : 'border-b border-gray-300'}>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase">Cliente</th>
                <th className="hidden sm:table-cell px-2 py-2 text-left text-xs font-medium uppercase">Localização</th>
                <th className="px-2 py-2 text-right text-xs font-medium uppercase">Compras</th>
                <th className="px-2 py-2 text-right text-xs font-medium uppercase">Total</th>
                <th className="hidden sm:table-cell px-2 py-2 text-center text-xs font-medium uppercase">Última Compra</th>
              </tr>
            </thead>
            <tbody>
              {topClientes.map((cliente, index) => (
                <tr 
                  key={cliente.codigo} 
                  className={`${
                    darkMode 
                      ? index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750' 
                      : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                >
                  <td className="px-2 py-3 text-sm">
                    <div className="flex items-start">
                      <FiUser className={`mr-2 mt-1 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                      <div>
                        <p className="font-medium">{cliente.nome}</p>
                        {cliente.whatsapp && (
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <FiPhone className="inline mr-1" /> {cliente.whatsapp}
                          </p>
                        )}
                        <div className="sm:hidden text-xs mt-1">
                          {(cliente.cidade || cliente.uf) && (
                            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <FiMapPin className="inline mr-1" />
                              {cliente.cidade}{cliente.uf ? `, ${cliente.uf}` : ''}
                            </p>
                          )}
                          {cliente.ecf_data && (
                            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <FiCalendar className="inline mr-1" />
                              {formatarDataExibicao(cliente.ecf_data)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-2 py-3 text-sm">
                    {(cliente.cidade || cliente.uf) && (
                      <div className="flex items-center">
                        <FiMapPin className={`mr-2 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
                        <span>{cliente.cidade}{cliente.uf ? `, ${cliente.uf}` : ''}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-3 text-sm text-right">
                    <div className="flex items-center justify-end">
                      <FiShoppingBag className={`mr-2 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`} />
                      <span>{cliente.qtde_compras}</span>
                      <button
                        className="ml-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded shadow"
                        onClick={() => handleVerVendas(cliente)}
                        title="Ver vendas do cliente"
                      >
                        Ver Vendas
                      </button>
                    </div>
                  </td> 
                  <td className="px-2 py-3 text-sm text-right">
                    <div className="flex items-center justify-end">
                      <FiDollarSign className={`mr-2 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
                      <span>{formatCurrency(cliente.total)}</span>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-2 py-3 text-sm text-center">
                    {cliente.ecf_data && (
                      <div className="flex items-center justify-center">
                        <FiCalendar className={`mr-2 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
                        <span>{formatarDataExibicao(cliente.ecf_data)}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    {/* Modal de Vendas do Cliente */}
    {modalVendas.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-3xl w-full p-2 sm:p-6 relative text-gray-900 dark:text-white`} style={{maxHeight:'95vh', overflowY:'auto'}}>
          <button className="absolute top-3 right-3 text-gray-500 hover:text-red-500" onClick={closeModalVendas}>&times;</button>
          <h2 className="text-xl font-bold mb-4">Vendas de {modalVendas.cliente?.nome}</h2>
          {loadingVendas ? (
            <div className="text-blue-500">Carregando vendas...</div>
          ) : errorVendas ? (
            <div className="text-red-500">{errorVendas}</div>
          ) : modalVendas.vendas.length === 0 ? (
            <div className="text-gray-500">Nenhuma venda encontrada para este cliente.</div>
          ) : (
            <div className="overflow-x-auto max-h-80 sm:max-h-96" style={{maxHeight:'20rem', overflowY:'auto'}}>
              <table className="min-w-full text-xs md:text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
                  <tr>
                    <th className="px-2 py-1">Venda</th>
                    <th className="px-2 py-1">Data</th>
                    <th className="px-2 py-1">Vendedor</th>
                    <th className="px-2 py-1">Total</th>
                    <th className="px-2 py-1">Desconto</th>
                    <th className="px-2 py-1">Forma Pgto</th>
                    <th className="px-2 py-1">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {modalVendas.vendas.map((venda) => (
                    <tr key={venda.ecf_numero} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-2 py-1">{venda.ecf_numero}</td>
                      <td className="px-2 py-1">{venda.ecf_data ? new Date(venda.ecf_data).toLocaleDateString() : '-'}</td>
                      <td className="px-2 py-1">{venda.ven_nome}</td>
                      <td className="px-2 py-1">R$ {Number(venda.ecf_total).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                      <td className="px-2 py-1">R$ {Number(venda.ecf_desconto).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                      <td className="px-2 py-1">{venda.fpg_nome}</td>
                      <td className="px-2 py-1">
                        <button className="text-blue-600 dark:text-blue-400 hover:underline mr-2" onClick={() => handleVerItensVenda(venda)}>Ver Itens</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )}
    {/* Modal de Itens da Venda */}
    {modalItens.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full p-2 sm:p-6 relative text-gray-900 dark:text-white`} style={{maxHeight:'95vh', overflowY:'auto'}}>
          <button className="absolute top-3 right-3 text-gray-500 hover:text-red-500" onClick={closeModalItens}>&times;</button>
          <h2 className="text-xl font-bold mb-4">Itens da Venda {modalItens.venda?.ecf_numero}</h2>
          {loadingItens ? (
            <div className="text-blue-500">Carregando itens...</div>
          ) : errorItens ? (
            <div className="text-red-500">{errorItens}</div>
          ) : modalItens.itens.length === 0 ? (
            <div className="text-gray-500">Nenhum item encontrado para esta venda.</div>
          ) : (
            <div className="overflow-x-auto max-h-80 sm:max-h-96" style={{maxHeight:'20rem', overflowY:'auto'}}>
              <table className="min-w-full text-xs md:text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
                  <tr>
                    <th className="px-2 py-1">Código</th>
                    <th className="px-2 py-1">Descrição</th>
                    <th className="px-2 py-1">Marca</th>
                    <th className="px-2 py-1">Unidade</th>
                    <th className="px-2 py-1">Qtde</th>
                    <th className="px-2 py-1">Preço</th>
                    <th className="px-2 py-1">Estoque</th>
                  </tr>
                </thead>
                <tbody>
                  {modalItens.itens.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-2 py-1">{item.PRO_CODIGO}</td>
                      <td className="px-2 py-1">{item.PRO_DESCRICAO}</td>
                      <td className="px-2 py-1">{item.PRO_MARCA}</td>
                      <td className="px-2 py-1">{item.UNI_CODIGO}</td>
                      <td className="px-2 py-1">{Number(item.PRO_QUANTIDADE)}</td>
                      <td className="px-2 py-1">R$ {Number(item.PRO_VENDA).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                      <td className={`px-2 py-1 ${Number(item.ESTOQUE_ATUAL) <= 0 ? 'text-red-600 font-bold' : ''}`}>{Number(item.ESTOQUE_ATUAL)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end mt-4">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded" onClick={closeModalItens}>Fechar</button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

export default TopClientes;
