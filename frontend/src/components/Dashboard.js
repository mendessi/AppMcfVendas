import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

// Ícones
import { FiUsers, FiPackage, FiShoppingCart, FiDollarSign, FiCalendar, FiAlertCircle, FiAward, FiTrendingUp } from 'react-icons/fi';

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
  const [stats, setStats] = useState({
    totalClientes: 0,
    totalProdutos: 0,
    totalPedidos: 0,
    valorTotalPedidos: 0,
    vendasDia: 0,
    vendasMes: 0,
    vendasNaoAutenticadas: 0,
    vendasAutenticadas: 0,
    percentualCrescimento: 0
  }); // stats.vendasMes já está correto, só garantir atualização ao filtrar
  const [loading, setLoading] = useState(true);
  const [topProdutos, setTopProdutos] = useState([]);
  const [topClientes, setTopClientes] = useState([]);
  const [topVendedores, setTopVendedores] = useState([]);
  const [loadingVendedores, setLoadingVendedores] = useState(true);
  const [vendedoresError, setVendedoresError] = useState(null);
  
  // Estados para o filtro de período
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [filtrandoDados, setFiltrandoDados] = useState(false);

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

  // Função para buscar todos os dados com base no filtro de período
  const fetchAllData = async () => {
    setFiltrandoDados(true);
    
    // Buscar dados reais para cards principais do Dashboard
    await fetchDashboardStats();
    
    // Buscar dados reais para top vendedores
    await fetchTopVendedores();
    
    setFiltrandoDados(false);
  };

  // Buscar dados quando as datas estiverem definidas
  useEffect(() => {
    if (dataInicial && dataFinal) {
      fetchAllData();
    }
  }, [dataInicial, dataFinal]);

  // Handler para o botão de filtrar
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchAllData(); // já recarrega vendasMes do backend com o novo período
  };


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
        return;
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
      
      console.log('Buscando estatísticas do dashboard:', url, 'com cabeçalhos:', headers);
      
      // Fazer a requisição para o backend
      const response = await axios.get(url, { headers });
      
      if (response.status === 200) {
        const dashboardData = response.data;
        console.log('===== DADOS DO DASHBOARD RECEBIDOS =====');
        console.log('Vendas do dia:', dashboardData.vendas_dia);
        console.log('Vendas do mês:', dashboardData.vendas_mes);
        console.log('Total clientes:', dashboardData.total_clientes);
        console.log('Total produtos:', dashboardData.total_produtos);
        console.log('Total pedidos:', dashboardData.total_pedidos);
        console.log('Dados completos:', dashboardData);
        
        // Verificar se os dados estão vindo como números válidos
        const vendasDia = parseFloat(dashboardData.vendas_dia) || 0;
        const vendasMes = parseFloat(dashboardData.vendas_mes) || 0;
        
        console.log('Vendas do dia após parse:', vendasDia);
        console.log('Vendas do mês após parse:', vendasMes);
        
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
        
        // Removido uso de dados mock para produtos. Aguarda implementação do endpoint real para TopProdutos.
        setTopProdutos([]); // ou mantenha vazio até implementar a busca real
      } else {
        console.error('Erro ao buscar dados do dashboard:', response.statusText);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      if (error.response) {
        console.error('Resposta de erro:', error.response.data);
        console.error('Status:', error.response.status);
      }
      setLoading(false);
    }
  };
  
  // Função para buscar top vendedores da API real com o período selecionado
  const fetchTopVendedores = async () => {
    console.log('===== INÍCIO fetchTopVendedores =====');
    setLoadingVendedores(true);
    setVendedoresError(null);
    
    try {
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
      
      console.log('Dashboard - Resposta completa:', response);
      console.log('Dashboard - Status da resposta:', response.status);
      
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
            meta: meta, // Garantir meta mínima de 50.000,00
            total: vendedor.total, // Valor total de vendas
            vendas: vendedor.qtde_vendas, // Quantidade de vendas (novo campo)
            percentual: percentual,
            status: percentual >= 100 ? 'acima' : 'abaixo'
          };
        });
        
        console.log('Dashboard - Dados processados dos vendedores:', vendedores);
        
        setTopVendedores(vendedores);
        console.log(`Dashboard - ${vendedores.length} vendedores processados`);
      } else {
        console.warn('Dashboard - Resposta da API não contém dados de vendedores');
        console.log('Dashboard - Conteúdo da resposta:', response.data);
        setTopVendedores([]);
      }
      
      setLoadingVendedores(false);
    } catch (error) {
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
      setLoadingVendedores(false);
    }
    console.log('===== FIM fetchTopVendedores =====');
  }; // Recarregar quando a empresa selecionada mudar

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className={darkMode ? "text-blue-400" : "text-blue-600"}>Carregando...</div>
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

  return (
    <div>
      {/* Componente flutuante com informações detalhadas da empresa */}
      <EmpresaAtualInfo darkMode={darkMode} />
      
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Dashboard</h1>
          <EmpresaInfo darkMode={darkMode} />
        </div>
      </div>
      
      {/* Filtro de período unificado */}
      <div className={`mb-6 p-4 rounded-lg shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-4">
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            <FiCalendar className="inline-block mr-2" />
            Período do Dashboard
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
                onChange={(e) => setDataInicial(e.target.value)}
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
                onChange={(e) => setDataFinal(e.target.value)}
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
        </div>
      </div>  

      <div className="mb-6">
        <p className={darkMode ? "text-gray-300" : "text-gray-600"}>Bem-vindo, {user?.name || 'master'}!</p>
      </div>

      {/* Cards de Vendas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {/* Card - Vendas do Dia */}
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-4 sm:p-6`}>
          <div className="flex items-center">
            <div className={`p-2 sm:p-3 rounded-full ${darkMode ? "bg-blue-900 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
              <FiDollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className={`text-xs sm:text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Vendas do Dia</p>
              <p className={`text-lg sm:text-2xl font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                {formatCurrency(stats.vendasDia)}
              </p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <Link to="/pedidos" className={`text-xs sm:text-sm ${darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"}`}>Ver detalhes →</Link>
          </div>
        </div>

        {/* Card - Vendas do Mês */}
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-4 sm:p-6`}>
          <div className="flex items-center">
            <div className={`p-2 sm:p-3 rounded-full ${darkMode ? "bg-green-900 text-green-400" : "bg-green-100 text-green-600"}`}>
              <FiCalendar className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className={`text-xs sm:text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Vendas do Mês</p>
              <p className={`text-lg sm:text-2xl font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                {formatCurrency(stats.vendasMes)}
              </p>
              {/* DEBUG: Mostrar valor bruto recebido do backend */}
              <p style={{ fontSize: '10px', color: darkMode ? '#90cdf4' : '#3182ce' }}>
                <b>DEBUG vendas_mes:</b> {stats.vendasMes}
              </p>
              <p className={`text-xs ${stats.percentualCrescimento >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.percentualCrescimento >= 0 ? '+' : ''}{stats.percentualCrescimento}% em relação ao mês anterior
              </p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <Link to="/relatorios" className={`text-xs sm:text-sm ${darkMode ? "text-green-400 hover:text-green-300" : "text-green-600 hover:text-green-800"}`}>Ver relatório mensal →</Link>
          </div>
        </div>

        {/* Card - Vendas Não Autenticadas */}
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-4 sm:p-6`}>
          <div className="flex items-center">
            <div className={`p-2 sm:p-3 rounded-full ${darkMode ? "bg-yellow-900 text-yellow-400" : "bg-yellow-100 text-yellow-600"}`}>
              <FiAlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className={`text-xs sm:text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Vendas Não Autenticadas</p>
              <p className={`text-lg sm:text-2xl font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                {formatCurrency(stats.vendasNaoAutenticadas)}
              </p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <Link to="/vendas-pendentes" className={`text-xs sm:text-sm ${darkMode ? "text-yellow-400 hover:text-yellow-300" : "text-yellow-600 hover:text-yellow-800"}`}>Verificar pendências →</Link>
          </div>
        </div>

        {/* Card - Vendas Autenticadas */}
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-4 sm:p-6`}>
          <div className="flex items-center">
            <div className={`p-2 sm:p-3 rounded-full ${darkMode ? "bg-blue-900 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
              <FiAward className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className={`text-xs sm:text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Vendas Autenticadas</p>
              <p className={`text-lg sm:text-2xl font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                {formatCurrency(stats.vendasAutenticadas)}
              </p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <Link to="/vendas-autenticadas" className={`text-xs sm:text-sm ${darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"}`}>Ver autenticadas →</Link>
          </div>
        </div>

      </div>

      {/* Gráfico de Vendas por Dia (logo abaixo dos cards) */}
      <VendasPorDiaChart 
        empresaSelecionada={empresaSelecionada}
        dataInicial={dataInicial}
        dataFinal={dataFinal}
        darkMode={darkMode}
      />

      {/* Tabela de Vendedores */}
      <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-4 sm:p-6 mb-8`}>
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
          <table className={`min-w-full ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            <thead>
              <tr className={darkMode ? "bg-gray-700" : "bg-gray-100"}>
                <th className="px-4 py-2 text-left">Nome</th>
                <th className="px-4 py-2 text-center">Qtd. Vendas</th>
                <th className="px-4 py-2 text-right">Valor Total</th>
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
                        <div className="font-medium">{vendedor.nome}</div>
                        <div className="text-xs text-gray-500">{vendedor.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{vendedor.vendas}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(vendedor.total)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(vendedor.meta)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 max-w-[150px]">
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
        <div className="sm:hidden space-y-4">
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
              <div key={vendedor.id} className={`p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                <div className="flex items-center mb-2">
                  {index < 3 && (
                    <span className="mr-2">
                      {index === 0 ? <FiAward className="text-yellow-400" /> : 
                       index === 1 ? <FiAward className="text-gray-400" /> : 
                       <FiAward className="text-yellow-700" />}
                    </span>
                  )}
                  <div className="flex-grow">
                    <div className="font-medium">{vendedor.nome}</div>
                    <div className="text-xs text-gray-500">{vendedor.codigo ? `Código: ${vendedor.codigo}` : ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(vendedor.total)}</div>
                    <div className="text-xs text-gray-500">{vendedor.vendas} vendas</div>
                  </div>
                </div>
                
                <div className="flex items-center mt-2">
                  <div className="text-xs mr-2">
                    Meta: {formatCurrency(vendedor.meta)}
                  </div>
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
