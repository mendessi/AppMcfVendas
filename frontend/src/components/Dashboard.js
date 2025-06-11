import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { Link } from 'react-router-dom';
import axios from 'axios';

// Ícones
import { FiUsers, FiPackage, FiShoppingCart, FiDollarSign, FiCalendar, FiAlertCircle, FiAward } from 'react-icons/fi';

// Componentes
import EmpresaInfo from './EmpresaInfo';
import TopClientes from './TopClientes';
import EmpresaAtualInfo from './EmpresaAtualInfo';
import VendasPorDiaChart from './VendasPorDiaChart';

// Configuração
import { API_URL } from '../config';

const Dashboard = ({ user, darkMode, empresaSelecionada }) => {
  // Log para debug
  console.log('Dashboard - Empresa selecionada:', empresaSelecionada);
  const statsDefault = {
    totalClientes: 0,
    totalProdutos: 0,
    totalPedidos: 0,
    valorTotalPedidos: 0,
    vendasDia: 0,
    vendasMes: 0,
    vendasNaoAutenticadas: 0,
    vendasAutenticadas: 0,
    percentualCrescimento: 0
  };
  const [stats, setStats] = useState(statsDefault);
  const [loading, setLoading] = useState(true);
  const [topProdutos, setTopProdutos] = useState([]);
  const [topClientes, setTopClientes] = useState([]);
  const [topVendedores, setTopVendedores] = useState([]);
  const [loadingVendedores, setLoadingVendedores] = useState(true);
  const [vendedoresError, setVendedoresError] = useState(null);
  const [dadosEmCache, setDadosEmCache] = useState(false);
  
  // Estados para o filtro de período
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [filtrandoDados, setFiltrandoDados] = useState(false);

  // Adicionar estados para vendas por dia e top clientes
  const [vendasPorDia, setVendasPorDia] = useState([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);

  // Cache keys
  const CACHE_KEY_FILTERS = 'orcamentos_filtros_cache';
  const CACHE_KEY_DATA = 'orcamentos_data_cache';
  const CACHE_KEY_TIMESTAMP = 'orcamentos_timestamp_cache';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  // Função para limpar cache
  const clearCache = () => {
    try {
      localStorage.removeItem(CACHE_KEY_DATA);
      localStorage.removeItem(CACHE_KEY_FILTERS);
      localStorage.removeItem(CACHE_KEY_TIMESTAMP);
      console.log('🔍 DEBUG - Cache limpo');
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  };

  // Função para salvar dados no cache
  const salvarDadosNoCache = (dados) => {
    const cacheData = {
      stats: dados.stats,
      topVendedores: dados.topVendedores,
      vendasPorDia: dados.vendasPorDia,
      topClientes: dados.topClientes,
      topProdutos: dados.topProdutos,
      dataInicial: dataInicial,
      dataFinal: dataFinal,
      timestamp: new Date().getTime()
    };
    localStorage.setItem('dashboardCache', JSON.stringify(cacheData));
    setDadosEmCache(true);
  };

  // Função para carregar dados do cache
  const carregarDadosDoCache = () => {
    try {
      const cacheData = localStorage.getItem('dashboardCache');
      if (cacheData) {
        const dados = JSON.parse(cacheData);
        console.log('Dados encontrados no cache:', dados);
        
        // Verifica se o cache é do mesmo período
        if (dados.dataInicial === dataInicial && dados.dataFinal === dataFinal) {
          console.log('Cache válido para o período atual');
          setStats(dados.stats || statsDefault);
          setTopVendedores(dados.topVendedores);
          
          // Atualizar dados do gráfico de vendas por dia
          if (dados.vendasPorDia) {
            setVendasPorDia(dados.vendasPorDia);
          }
          
          // Atualizar dados de top clientes
          if (dados.topClientes) {
            setTopClientes(dados.topClientes);
          }

          // Atualizar dados de top produtos
          if (dados.topProdutos) {
            setTopProdutos(dados.topProdutos);
          }
          
          setDadosEmCache(true);
          setLoading(false);
          setLoadingVendedores(false);
          return true;
        } else {
          console.log('Cache inválido - período diferente');
          limparCache();
        }
      } else {
        console.log('Nenhum dado encontrado no cache');
      }
    } catch (error) {
      console.error('Erro ao carregar cache:', error);
      limparCache();
    }
    return false;
  };

  // Função para limpar o cache
  const limparCache = () => {
    console.log('Limpando cache');
    localStorage.removeItem('dashboardCache');
    setDadosEmCache(false);
  };

  // Função para buscar todos os dados com base no filtro de período
  const fetchAllData = async (forcarAtualizacao = false) => {
    // Se não forçar atualização, tenta carregar do cache
    if (!forcarAtualizacao && carregarDadosDoCache()) {
      console.log('Dados carregados do cache');
      return;
    }

    console.log('Buscando dados atualizados do servidor');
    setFiltrandoDados(true);
    
    try {
      // Buscar dados reais para cards principais do Dashboard
      const statsResponse = await fetchDashboardStats();
      
      // Buscar dados reais para top vendedores
      const vendedoresResponse = await fetchTopVendedores();
      
      // Buscar dados para o gráfico de vendas por dia
      const vendasPorDiaResponse = await fetchVendasPorDia();
      
      // Buscar dados para top clientes
      const topClientesResponse = await fetchTopClientes();

      // Buscar dados para top produtos
      const topProdutosResponse = await fetchTopProdutos();
      
      // Salvar os dados no cache APÓS receber as respostas
      const dadosParaCache = {
        stats: statsResponse,
        topVendedores: vendedoresResponse,
        vendasPorDia: Array.isArray(vendasPorDiaResponse) ? vendasPorDiaResponse : [],
        topClientes: topClientesResponse,
        topProdutos: topProdutosResponse,
        dataInicial: dataInicial,
        dataFinal: dataFinal,
        timestamp: new Date().getTime()
      };
      
      console.log('Salvando dados no cache:', dadosParaCache);
      localStorage.setItem('dashboardCache', JSON.stringify(dadosParaCache));
      setDadosEmCache(true);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setFiltrandoDados(false);
    }
  };

  // Handler para o botão de filtrar
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    console.log('Atualizando dashboard - forçando busca de dados');
    limparCache();
    fetchAllData(true);
  };

  // Buscar dados quando as datas estiverem definidas
  useEffect(() => {
    if (dataInicial && dataFinal && !dadosEmCache) {
      console.log('Datas definidas, buscando dados...');
      fetchAllData(false);
    }
  }, [dataInicial, dataFinal, dadosEmCache]);

  // Inicializar as datas para o primeiro e último dia do mês atual
  useEffect(() => {
    // Definir datas padrão (primeiro e último dia do mês atual)
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    let ultimoDiaMes;
    
    if (hoje.getMonth() === 11) { // Dezembro
      ultimoDiaMes = new Date(hoje.getFullYear() + 1, 0, 0);
    } else {
      ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    }
    
    const formatarData = (data) => {
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const dia = String(data.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    };
    
    setDataInicial(formatarData(primeiroDiaMes));
    setDataFinal(formatarData(ultimoDiaMes));
  }, []);

  // Função para buscar dados reais do Dashboard do backend
  const fetchDashboardStats = async () => {
    try {
      console.log('Iniciando busca de dados do dashboard');
      setLoading(true);
      
      // Configurar o token de autenticação
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token não encontrado');
        setLoading(false);
        return null;
      }
      
      // Configurar o cabeçalho com o token e empresa selecionada
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Adicionar o código da empresa, se disponível
      if (empresaSelecionada && empresaSelecionada.codigo) {
        headers['x-empresa-codigo'] = empresaSelecionada.codigo.toString();
        console.log(`Usando empresa código: ${empresaSelecionada.codigo}`);
      } else {
        console.warn('Nenhuma empresa selecionada ou código não disponível');
      }
      
      // Preparar parâmetros de consulta para as datas
      const params = {};
      if (dataInicial) params.data_inicial = dataInicial;
      if (dataFinal) params.data_final = dataFinal;
      
      // Construir a URL com os parâmetros
      const queryString = new URLSearchParams(params).toString();
      const url = `${API_URL}/relatorios/dashboard-stats${queryString ? `?${queryString}` : ''}`;
      
      console.log('Buscando estatísticas do dashboard:', url);
      
      // Fazer a requisição para o backend
      const response = await axios.get(url, { headers });
      
      if (response.status === 200) {
        const dashboardData = response.data;
        console.log('Dados do dashboard recebidos:', dashboardData);
        
        // Verificar se os dados estão vindo como números válidos
        const vendasDia = parseFloat(dashboardData.vendas_dia) || 0;
        const vendasMes = parseFloat(dashboardData.vendas_mes) || 0;
        
        // Atualizar os estados com os dados reais
        const novoStats = {
          totalClientes: parseInt(dashboardData.total_clientes) || 0,
          totalProdutos: parseInt(dashboardData.total_produtos) || 0,
          totalPedidos: parseInt(dashboardData.total_pedidos) || 0,
          valorTotalPedidos: parseFloat(dashboardData.valor_total_pedidos) || 0,
          vendasDia: vendasDia,
          vendasMes: vendasMes,
          vendasNaoAutenticadas: parseFloat(dashboardData.vendas_nao_autenticadas) || 0,
          percentualCrescimento: parseFloat(dashboardData.percentual_crescimento) || 0,
          vendasAutenticadas: parseFloat(dashboardData.vendas_autenticadas) || 0
        };
        
        console.log('Atualizando stats com:', novoStats);
        setStats(novoStats);
        return novoStats; // Retornar os dados para o cache
      } else {
        console.error('Erro ao buscar dados do dashboard:', response.statusText);
        return null;
      }
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Função para buscar top vendedores da API real com o período selecionado
  const fetchTopVendedores = async () => {
    console.log('===== INÍCIO fetchTopVendedores =====');
    setLoadingVendedores(true);
    setVendedoresError(null);
    
    try {
      // Limpar cache antes de buscar novos dados
      clearCache();
      
      // Verificar token de autenticação
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Autenticação necessária');
      }
      
      // Verificar empresa selecionada
      let empresaAtual = null;
      if (empresaSelecionada && empresaSelecionada.cli_codigo) {
        empresaAtual = empresaSelecionada;
        console.log(`Dashboard - Usando empresa da prop: ${empresaSelecionada.cli_nome} (${empresaSelecionada.cli_codigo})`);
      } else {
        // Verificar localStorage
        const empresaData = localStorage.getItem('empresa') || 
                         localStorage.getItem('empresa_atual') || 
                         localStorage.getItem('empresa_selecionada');
        
        if (empresaData) {
          empresaAtual = JSON.parse(empresaData);
          console.log(`Dashboard - Usando empresa do localStorage: ${empresaAtual.cli_nome} (${empresaAtual.cli_codigo})`);
        }
      }
      
      if (!empresaAtual || !empresaAtual.cli_codigo) {
        console.error('Dashboard - ERRO: Nenhuma empresa selecionada!');
        throw new Error('Nenhuma empresa selecionada');
      }
      
      console.log('Dashboard - Empresa selecionada para busca de vendedores:', empresaAtual.cli_nome, '(código:', empresaAtual.cli_codigo, ')');
      
      // Configurar cabeçalhos para a requisição
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaAtual.cli_codigo
        }
      };
      
      const url = `${API_URL}/relatorios/top-vendedores?data_inicial=${dataInicial}&data_final=${dataFinal}`;
      console.log(`Dashboard - Buscando top vendedores no endpoint: ${url}`);
      console.log('Dashboard - Headers da requisição:', JSON.stringify(config.headers));
      
      // Fazer a requisição à API para obter os top vendedores com o período selecionado
      console.log('Dashboard - Enviando requisição...');
      const response = await axios.get(url, config);
      console.log('Dashboard - Requisição concluída!');
      
      console.log('Dashboard - Resposta da API de top vendedores:', response.data);
      
      if (response.data && response.data.top_vendedores) {
        console.log('Dashboard - Dados de vendedores recebidos:', response.data.top_vendedores.length, 'registros');
        // Mapear os dados recebidos para o formato que usamos no componente
        const vendedores = response.data.top_vendedores.map((vendedor, index) => {
          // Garantir que a meta nunca seja zero (usar 50.000,00 como padrão)
          const meta = vendedor.meta > 0 ? vendedor.meta : 50000.00;
          
          // Calcular o percentual de atingimento da meta e arredondar para 1 casa decimal
          const percentualBruto = (vendedor.total / meta) * 100;
          const percentual = Math.round(percentualBruto * 10) / 10; // Arredonda para 1 casa decimal
          
          return {
            id: index + 1,
            codigo: vendedor.codigo,
            nome: vendedor.nome,
            meta: meta,
            total: vendedor.total,
            vendas: vendedor.qtde_vendas,
            ticket_medio: vendedor.ticket_medio,
            percentual: percentual,
            status: percentual >= 100 ? 'acima' : 'abaixo'
          };
        });
        
        console.log('Dashboard - Dados processados dos vendedores:', vendedores);
        
        setTopVendedores(vendedores);
        console.log(`Dashboard - ${vendedores.length} vendedores processados`);
        return vendedores;
      } else {
        console.warn('Dashboard - Resposta da API não contém dados de vendedores');
        console.log('Dashboard - Conteúdo da resposta:', response.data);
        setTopVendedores([]);
        return [];
      }
      
    } catch (error) {
      if (handleAuthError(error)) return;
      console.error('Dashboard - Erro ao buscar top vendedores:', error);
      console.error('Dashboard - Mensagem de erro:', error.message);
      if (error.response) {
        console.error('Dashboard - Dados da resposta de erro:', error.response.data);
        console.error('Dashboard - Status de erro:', error.response.status);
        console.error('Dashboard - Headers de erro:', error.response.headers);
      } else if (error.request) {
        console.error('Dashboard - Erro na requisição:', error.request);
      }
      setVendedoresError(error.message || 'Erro ao buscar dados de vendedores');
      setTopVendedores([]);
      return [];
    } finally {
      setLoadingVendedores(false);
    }
  };

  // Função para buscar dados de vendas por dia
  const fetchVendasPorDia = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token não encontrado');
        return null;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      if (empresaSelecionada && empresaSelecionada.codigo) {
        headers['x-empresa-codigo'] = empresaSelecionada.codigo.toString();
      }

      const url = `${API_URL}/relatorios/vendas-por-dia?data_inicial=${dataInicial}&data_final=${dataFinal}`;
      console.log('Buscando vendas por dia:', url);

      const response = await axios.get(url, { headers });
      
      if (response.status === 200) {
        const vendasPorDia = response.data;
        console.log('Dados de vendas por dia recebidos:', vendasPorDia);
        setVendasPorDia(Array.isArray(vendasPorDia) ? vendasPorDia : []);
        return Array.isArray(vendasPorDia) ? vendasPorDia : [];
      }
      return [];
    } catch (error) {
      console.error('Erro ao buscar vendas por dia:', error);
      return [];
    }
  };

  // Função para buscar top clientes
  const fetchTopClientes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token não encontrado');
        return null;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      if (empresaSelecionada && empresaSelecionada.codigo) {
        headers['x-empresa-codigo'] = empresaSelecionada.codigo.toString();
      }

      const url = `${API_URL}/relatorios/top-clientes?data_inicial=${dataInicial}&data_final=${dataFinal}`;
      console.log('Buscando top clientes:', url);

      const response = await axios.get(url, { headers });
      
      if (response.status === 200) {
        const topClientes = response.data;
        console.log('Dados de top clientes recebidos:', topClientes);
        setTopClientes(topClientes);
        return topClientes;
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar top clientes:', error);
      return null;
    }
  };

  // Função para buscar top produtos
  const fetchTopProdutos = async () => {
    try {
      setLoadingProdutos(true);
      console.log('Buscando top produtos...');
      
      // Configurar o token de autenticação
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token não encontrado');
        return [];
      }
      
      // Configurar o cabeçalho com o token e empresa selecionada
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Adicionar o código da empresa, se disponível
      if (empresaSelecionada && empresaSelecionada.codigo) {
        headers['x-empresa-codigo'] = empresaSelecionada.codigo.toString();
      }
      
      // Preparar parâmetros de consulta para as datas
      const params = {};
      if (dataInicial) params.data_inicial = dataInicial;
      if (dataFinal) params.data_final = dataFinal;
      
      // Construir a URL com os parâmetros
      const queryString = new URLSearchParams(params).toString();
      const url = `${API_URL}/relatorios/top-produtos${queryString ? `?${queryString}` : ''}`;
      
      console.log('Buscando top produtos:', url);
      
      // Fazer a requisição para o backend
      const response = await axios.get(url, { headers });
      
      if (response.status === 200) {
        console.log('Top produtos recebidos:', response.data);
        setTopProdutos(response.data);
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao buscar top produtos:', error);
      return [];
    } finally {
      setLoadingProdutos(false);
    }
  };

  const handleAuthError = (error) => {
    if (error.response && error.response.status === 401) {
      alert('Sua sessão expirou ou a senha foi alterada. Por favor, faça login novamente.');
      localStorage.removeItem('token');
      window.location.href = '/login';
      return true;
    }
    return false;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner darkMode={darkMode} message="Carregando dashboard..." />
      </div>
    );
  }

  // Função para formatar valores monetários
  const formatCurrency = (value) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(value);
  };
  
  // Função para obter a cor da barra de progresso com base no percentual
  const getProgressColor = (percentual, isDarkMode) => {
    if (percentual >= 100) return 'bg-green-600';
    if (percentual >= 70) return 'bg-yellow-400';
    return 'bg-red-500';
  };
  
  // Função para obter a cor do texto com base no percentual
  const getTextColor = (percentual, isDarkMode) => {
    if (percentual >= 100) return 'text-green-500';
    if (percentual >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Função para formatar o nome do vendedor (primeiros dois nomes)
  const formatarNomeVendedor = (nome) => {
    if (!nome) return '';
    const nomes = nome.split(' ');
    return nomes.slice(0, 2).join(' ');
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Componente flutuante com informações detalhadas da empresa */}
      <EmpresaAtualInfo darkMode={darkMode} />
      
      <div className="mb-4 px-2 sm:px-4">
        <div className="flex items-center justify-between">
          <h1 className={`text-xl sm:text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Dashboard</h1>
          <EmpresaInfo darkMode={darkMode} />
        </div>
      </div>
      
      {/* Filtro de período unificado */}
      <div className={`mb-4 p-2 sm:p-4 rounded-lg shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2 sm:gap-4">
          <h2 className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            <FiCalendar className="inline-block mr-2" />
            Período do Dashboard
            {dadosEmCache && (
              <span className="ml-2 text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                Dados em cache
              </span>
            )}
          </h2>
          
          <form onSubmit={handleFilterSubmit} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none">
              <label htmlFor="dashboardDataInicial" className={`text-xs block mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Data Inicial
              </label>
              <input
                type="date"
                id="dashboardDataInicial"
                value={dataInicial}
                onChange={(e) => {
                  setDataInicial(e.target.value);
                  limparCache(); // Limpa o cache ao mudar a data
                }}
                className={`w-full text-sm px-2 py-1 rounded border ${
                  darkMode 
                    ? 'bg-gray-700 text-white border-gray-600' 
                    : 'bg-white text-gray-800 border-gray-300'
                }`}
              />
            </div>
            
            <div className="flex-1 sm:flex-none">
              <label htmlFor="dashboardDataFinal" className={`text-xs block mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Data Final
              </label>
              <input
                type="date"
                id="dashboardDataFinal"
                value={dataFinal}
                onChange={(e) => {
                  setDataFinal(e.target.value);
                  limparCache(); // Limpa o cache ao mudar a data
                }}
                className={`w-full text-sm px-2 py-1 rounded border ${
                  darkMode 
                    ? 'bg-gray-700 text-white border-gray-600' 
                    : 'bg-white text-gray-800 border-gray-300'
                }`}
              />
            </div>
            
            <div className="self-end">
              <button
                type="submit"
                disabled={filtrandoDados}
                className={`w-full sm:w-auto text-sm px-4 py-2 rounded ${filtrandoDados ? 'bg-gray-400 cursor-not-allowed' : darkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {filtrandoDados ? 'Atualizando...' : 'Atualizar Dashboard'}
              </button>
            </div>
          </form>
        </div>
        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <p>Os dados exibidos abaixo se referem ao período selecionado.</p>
          {dadosEmCache && (
            <p className="text-green-600 mt-1">
              Dados carregados do cache. Clique em "Atualizar Dashboard" para buscar dados atualizados.
            </p>
          )}
        </div>
      </div>  

      <div className="mb-6">
        <p className={darkMode ? "text-gray-300" : "text-gray-600"}>Bem-vindo, {user?.name || 'master'}!</p>
      </div>

      {/* Cards de Vendas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8 px-2 sm:px-4">
        {/* Card - Vendas do Dia */}
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-3 sm:p-6`}>
          <div className="flex items-center">
            <div className={`p-2 rounded-full ${darkMode ? "bg-blue-900 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
              <FiDollarSign className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Vendas do Dia</p>
              <p className={`text-base sm:text-xl font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                {formatCurrency(stats?.vendasDia ?? 0)}
              </p>
            </div>
          </div>
          <div className="mt-2">
            <Link to="/pedidos" className={`text-xs ${darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"}`}>Ver detalhes →</Link>
          </div>
        </div>

        {/* Card - Vendas do Mês */}
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-3 sm:p-6`}>
          <div className="flex items-center">
            <div className={`p-2 rounded-full ${darkMode ? "bg-green-900 text-green-400" : "bg-green-100 text-green-600"}`}>
              <FiCalendar className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Vendas do Mês</p>
              <p className={`text-base sm:text-xl font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                {formatCurrency(stats?.vendasMes ?? 0)}
              </p>
              <p className={`text-xs ${stats?.percentualCrescimento >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats?.percentualCrescimento >= 0 ? '+' : ''}{stats?.percentualCrescimento}% em relação ao mês anterior
              </p>
            </div>
          </div>
          <div className="mt-2">
            <Link to="/relatorios" className={`text-xs ${darkMode ? "text-green-400 hover:text-green-300" : "text-green-600 hover:text-green-800"}`}>Ver relatório mensal →</Link>
          </div>
        </div>

        {/* Card - Vendas Não Autenticadas */}
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-3 sm:p-6`}>
          <div className="flex items-center">
            <div className={`p-2 rounded-full ${darkMode ? "bg-yellow-900 text-yellow-400" : "bg-yellow-100 text-yellow-600"}`}>
              <FiAlertCircle className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Vendas Não Autenticadas</p>
              <p className={`text-base sm:text-xl font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                {formatCurrency(stats?.vendasNaoAutenticadas ?? 0)}
              </p>
            </div>
          </div>
          <div className="mt-2">
            <Link to="/vendas-pendentes" className={`text-xs ${darkMode ? "text-yellow-400 hover:text-yellow-300" : "text-yellow-600 hover:text-yellow-800"}`}>Verificar pendências →</Link>
          </div>
        </div>

        {/* Card - Vendas Autenticadas */}
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-3 sm:p-6`}>
          <div className="flex items-center">
            <div className={`p-2 rounded-full ${darkMode ? "bg-blue-900 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
              <FiAward className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Vendas Autenticadas</p>
              <p className={`text-base sm:text-xl font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                {formatCurrency(stats?.vendasAutenticadas ?? 0)}
              </p>
            </div>
          </div>
          <div className="mt-2">
            <Link to="/vendas-autenticadas" className={`text-xs ${darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"}`}>Ver autenticadas →</Link>
          </div>
        </div>

      </div>

      {/* Gráfico de Vendas por Dia */}
      <div className="px-2 sm:px-4 mb-4 sm:mb-8">
        <VendasPorDiaChart 
          empresaSelecionada={empresaSelecionada}
          dataInicial={dataInicial}
          dataFinal={dataFinal}
          darkMode={darkMode}
          dadosEmCache={dadosEmCache}
          vendasPorDia={vendasPorDia}
        />
      </div>

      {/* Tabela de Vendedores */}
      <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-2 sm:p-6 mb-4 sm:mb-8 mx-2 sm:mx-4`}>
        <h2 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-800"} mb-4`}>
          <FiAward className="inline-block mr-2" />
          Vendedores {loadingVendedores ? '(Carregando...)' : `(${topVendedores.length} registros)`}
        </h2>
        
        {/* Mensagem de estado e debug */}
        <div className="mb-4">
          {vendedoresError && (
            <div className={`p-3 rounded ${darkMode ? 'bg-red-900/30 text-red-200' : 'bg-red-50 text-red-800'}`}>
              <FiAlertCircle className="inline-block mr-2" />
              Erro: {vendedoresError}
            </div>
          )}
          
          {!loadingVendedores && topVendedores.length === 0 && !vendedoresError && (
            <div className={`p-3 rounded ${darkMode ? 'bg-yellow-900/30 text-yellow-200' : 'bg-yellow-50 text-yellow-800'}`}>
              <FiAlertCircle className="inline-block mr-2" />
              Nenhum vendedor encontrado no período selecionado.
            </div>
          )}
        </div>
        
        {/* Versão para desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className={`min-w-full max-w-full ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            <thead>
              <tr className={darkMode ? "bg-gray-700" : "bg-gray-100"}>
                <th className="px-4 py-2 text-left">Nome</th>
                <th className="px-4 py-2 text-center">Qtd. Vendas</th>
                <th className="px-4 py-2 text-right">Valor Total</th>
                <th className="px-4 py-2 text-right">Ticket Médio</th>
                <th className="px-4 py-2 text-right">Meta</th>
                <th className="px-4 py-2 text-center">Desempenho</th>
              </tr>
            </thead>
            <tbody>
              {topVendedores.map((vendedor, index) => (
                <tr key={vendedor.id} className={index % 2 === 0 ? (darkMode ? "bg-gray-800" : "bg-white") : (darkMode ? "bg-gray-700" : "bg-gray-50")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      {index < 3 && (
                        <span className="mr-2">
                          {index === 0 ? <FiAward className="text-yellow-400" /> : 
                           index === 1 ? <FiAward className="text-gray-400" /> : 
                           <FiAward className="text-yellow-700" />}
                        </span>
                      )}
                      <div>
                        <div className="font-medium">{formatarNomeVendedor(vendedor.nome)}</div>
                        <div className="text-xs text-gray-500">{vendedor.codigo}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{vendedor.vendas}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(vendedor.total)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(vendedor.ticket_medio)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(vendedor.meta)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-2">
                        <div 
                          className={`h-2.5 rounded-full ${getProgressColor(vendedor.percentual, darkMode)}`} 
                          style={{ width: `${Math.min(vendedor.percentual, 100)}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-medium ${getTextColor(vendedor.percentual, darkMode)}`}>
                        {vendedor.percentual.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Versão para celular - NOVA IMPLEMENTAÇÃO COMPLETA */}
        <div className="sm:hidden w-full overflow-x-auto">
          {/* Titulo mobile com contador */}
          <div className={`px-3 py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-md`}>
            <p className="text-sm font-semibold">
              {topVendedores.length} vendedores encontrados
            </p>
          </div>
          
          {/* Lista COMPLETA de vendedores (sem slice/limite) */}
          {topVendedores.length === 0 ? (
            <div className={`p-4 text-center ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'} rounded-lg`}>
              <p>Nenhum vendedor encontrado no período selecionado.</p>
            </div>
          ) : (
            topVendedores.map((vendedor, index) => (
              <div key={vendedor.id} className={`p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"} mb-3`}>
                <div className="flex items-center mb-2">
                  {index < 3 && (
                    <span className="mr-2">
                      {index === 0 ? <FiAward className="text-yellow-400" /> : 
                       index === 1 ? <FiAward className="text-gray-400" /> : 
                       <FiAward className="text-yellow-700" />}
                    </span>
                  )}
                  <div className="flex-grow">
                    <div className="font-medium">{formatarNomeVendedor(vendedor.nome)}</div>
                    <div className="text-xs text-gray-500">{vendedor.codigo ? `Código: ${vendedor.codigo}` : ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(vendedor.total)}</div>
                    <div className="text-xs text-gray-500">{vendedor.vendas} vendas</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                  <div>
                    <span className="text-gray-500">Ticket Médio:</span>
                    <span className="ml-1 font-medium">{formatCurrency(vendedor.ticket_medio)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Meta:</span>
                    <span className="ml-1 font-medium">{formatCurrency(vendedor.meta)}</span>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="flex-grow">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${getProgressColor(vendedor.percentual, darkMode)}`} 
                        style={{ width: `${Math.min(vendedor.percentual, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className={`text-xs font-medium ml-2 ${getTextColor(vendedor.percentual, darkMode)}`}>
                    {vendedor.percentual.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Top Clientes */}
      <div className="mb-4 sm:mb-8 px-2 sm:px-4">
        <TopClientes
          darkMode={darkMode}
          empresaSelecionada={empresaSelecionada}
          dataInicial={dataInicial}
          dataFinal={dataFinal}
          dadosEmCache={dadosEmCache}
          topClientes={topClientes}
        />
      </div>

      {/* Top Produtos */}
      <div className={`${darkMode ? "bg-gray-900" : "bg-white"} rounded-lg shadow p-2 sm:p-6 mx-2 sm:mx-4`}>
        <h2 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"} mb-4`}>Top Produtos</h2>
        {loadingProdutos ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Tabela apenas no desktop */}
            <div className="hidden sm:block overflow-x-auto w-full">
              <table className={`w-full max-w-full text-sm ${darkMode ? "divide-gray-700 text-gray-200" : "divide-gray-200 text-gray-900"}`}> 
                <thead className={darkMode ? "bg-gray-800" : "bg-gray-50"}>
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider break-words whitespace-normal">Produto</th>
                    <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider break-words whitespace-normal">Total Vendido</th>
                    <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider break-words whitespace-normal">Estoque</th>
                    <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider break-words whitespace-normal">Estoque Mínimo</th>
                    <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider break-words whitespace-normal">Status</th>
                  </tr>
                </thead>
                <tbody className={darkMode ? "bg-gray-900 divide-gray-800" : "bg-white divide-gray-200"}>
                  {topProdutos.map((produto, index) => (
                    <tr key={index} className={
                      darkMode
                        ? (index % 2 === 1 ? "bg-gray-800" : "")
                        : (index % 2 === 1 ? "bg-gray-100" : "")
                    }>
                      <td className="px-2 py-2 break-words whitespace-normal text-sm">{produto.PRO_DESCRICAO}</td>
                      <td className="px-2 py-2 break-words whitespace-normal text-sm">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(produto.TOTAL ?? 0))}
                      </td>
                      <td className="px-2 py-2 break-words whitespace-normal text-sm">
                        {Number(produto.ESTOQUE ?? 0).toFixed(2)}
                      </td>
                      <td className="px-2 py-2 break-words whitespace-normal text-sm">
                        {Number(produto.EST_MINIMO ?? 0).toFixed(2)}
                      </td>
                      <td className="px-2 py-2 break-words whitespace-normal">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          Number(produto.ESTOQUE ?? 0) <= Number(produto.EST_MINIMO ?? 0)
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {Number(produto.ESTOQUE ?? 0) <= Number(produto.EST_MINIMO ?? 0) ? 'Estoque Baixo' : 'Estoque OK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Cards no mobile */}
            <div className="md:hidden mt-4">
              <div className="grid grid-cols-1 gap-4">
                {topProdutos.map((produto, index) => (
                  <div key={index} className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow p-4`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className={`text-lg font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                          {produto.PRO_DESCRICAO}
                        </h3>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div>
                            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Total Vendido:</p>
                            <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(produto.TOTAL ?? 0))}
                            </p>
                          </div>
                          <div>
                            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Estoque Atual:</p>
                            <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                              {Number(produto.ESTOQUE ?? 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Estoque Mínimo:</p>
                            <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                              {Number(produto.EST_MINIMO ?? 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Status:</p>
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              Number(produto.ESTOQUE ?? 0) <= Number(produto.EST_MINIMO ?? 0)
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {Number(produto.ESTOQUE ?? 0) <= Number(produto.EST_MINIMO ?? 0) ? 'Estoque Baixo' : 'Estoque OK'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Ações Rápidas */}
      <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-4 sm:p-6 mb-8`}>
        <h2 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-800"} mb-4`}>
          <FiShoppingCart className="inline-block mr-2" />
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Link to="/novo-pedido" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded text-center flex items-center justify-center">
            <FiShoppingCart className="mr-2" />
            <span>Novo Pedido</span>
          </Link>
          <Link to="/clientes" className={`${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"} font-bold py-3 px-4 rounded text-center flex items-center justify-center`}>
            <FiUsers className="mr-2" />
            <span>Gerenciar Clientes</span>
          </Link>
          <Link to="/produtos" className={`${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"} font-bold py-3 px-4 rounded text-center flex items-center justify-center`}>
            <FiPackage className="mr-2" />
            <span>Gerenciar Produtos</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
