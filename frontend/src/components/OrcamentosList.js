import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { Link } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiSearch, FiCalendar, FiChevronDown, FiChevronUp, FiEye, FiPrinter } from 'react-icons/fi';
import api from '../services/api';

const OrcamentosList = ({ darkMode }) => {
  const [orcamentos, setOrcamentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedOrcamento, setExpandedOrcamento] = useState(null);
  
  // Cache keys
  const CACHE_KEY_FILTERS = 'orcamentos_filtros_cache';
  const CACHE_KEY_DATA = 'orcamentos_data_cache';
  const CACHE_KEY_TIMESTAMP = 'orcamentos_timestamp_cache';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  
  // Função para carregar filtros do cache
  const loadFiltersFromCache = () => {
    try {
      const cachedFilters = localStorage.getItem(CACHE_KEY_FILTERS);
      if (cachedFilters) {
        return JSON.parse(cachedFilters);
      }
    } catch (error) {
      console.error('Erro ao carregar filtros do cache:', error);
    }
    
    // Filtros padrão se não houver cache
    const hoje = new Date();
    return {
      cliente: '',
      data_inicio: hoje.toISOString().slice(0, 10),
      data_fim: hoje.toISOString().slice(0, 10),
      status: 'todos'
    };
  };

  const [filtros, setFiltros] = useState(loadFiltersFromCache());

  // Função para verificar se o cache é válido
  const isCacheValid = () => {
    try {
      const timestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP);
      if (!timestamp) return false;
      
      const cacheTime = parseInt(timestamp);
      const now = Date.now();
      const isValid = (now - cacheTime) < CACHE_DURATION;
      
      console.log('🔍 DEBUG - Cache válido:', isValid, 'Idade:', (now - cacheTime) / 1000, 'segundos');
      return isValid;
    } catch (error) {
      console.error('Erro ao verificar cache:', error);
      return false;
    }
  };

  // Função para carregar dados do cache
  const loadDataFromCache = () => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY_DATA);
      const cachedFilters = localStorage.getItem(CACHE_KEY_FILTERS);
      
      if (cachedData && cachedFilters && isCacheValid()) {
        const data = JSON.parse(cachedData);
        const filters = JSON.parse(cachedFilters);
        
        console.log('🔍 DEBUG - Carregando do cache:', data.length, 'orçamentos');
        setOrcamentos(data);
        setFiltros(filters);
        setIsLoading(false);
        return true;
      }
    } catch (error) {
      console.error('Erro ao carregar dados do cache:', error);
    }
    return false;
  };

  // Função para salvar no cache
  const saveToCache = (data, filters) => {
    try {
      localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(data));
      localStorage.setItem(CACHE_KEY_FILTERS, JSON.stringify(filters));
      localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());
      console.log('🔍 DEBUG - Dados salvos no cache:', data.length, 'orçamentos');
    } catch (error) {
      console.error('Erro ao salvar no cache:', error);
    }
  };

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

  // Função para atualizar filtros e salvar no cache
  const updateFiltros = (newFiltros) => {
    setFiltros(newFiltros);
    // Salvar filtros no cache imediatamente
    try {
      localStorage.setItem(CACHE_KEY_FILTERS, JSON.stringify(newFiltros));
    } catch (error) {
      console.error('Erro ao salvar filtros no cache:', error);
    }
  };

  useEffect(() => {
    // Tentar carregar do cache primeiro
    const cacheLoaded = loadDataFromCache();
    
    // Se não conseguiu carregar do cache, fazer requisição
    if (!cacheLoaded) {
      buscarOrcamentos();
    }
  }, []);

  const buscarOrcamentos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const empresa = localStorage.getItem('empresa_atual');
      
      const params = new URLSearchParams();
      
      // Sempre enviar as datas se estiverem preenchidas
      if (filtros.data_inicio) {
        params.append('data_inicial', filtros.data_inicio);
        console.log('🔍 DEBUG - Data inicial enviada:', filtros.data_inicio);
      }
      if (filtros.data_fim) {
        params.append('data_final', filtros.data_fim);
        console.log('🔍 DEBUG - Data final enviada:', filtros.data_fim);
      }
      
      console.log('🔍 DEBUG - Parâmetros da requisição:', params.toString());

      const response = await api.get(`/orcamentos?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-empresa-codigo': empresa
        }
      });

      console.log('🔍 DEBUG - Orçamentos recebidos:', response.data);
      setOrcamentos(response.data);
      saveToCache(response.data, filtros);
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

  const toggleOrcamentoDetails = async (orcamentoNumero) => {
    if (expandedOrcamento === orcamentoNumero) {
      setExpandedOrcamento(null);
    } else {
      setExpandedOrcamento(orcamentoNumero);
      // Buscar itens do orçamento se ainda não carregou
      const orcamento = orcamentos.find(o => o.numero === orcamentoNumero);
      if (orcamento && (!orcamento.itens || orcamento.itens.length === 0)) {
        try {
          const token = localStorage.getItem('token');
          const empresa = localStorage.getItem('empresa_atual');
          
          const response = await api.get(`/orcamentos/${orcamentoNumero}/itens`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'x-empresa-codigo': empresa
            }
          });
          
          const itens = response.data;
          setOrcamentos(prev => prev.map(o => 
            o.numero === orcamentoNumero ? { ...o, itens } : o
          ));
        } catch (error) {
          console.error('Erro ao buscar itens do orçamento:', error);
          // Continuar mesmo com erro
        }
      }
    }
  };

  const formatarData = (data) => {
    if (!data) return '';
    
    // Se a data já vier formatada como "DD/MM/YYYY"
    if (typeof data === 'string' && data.includes('/')) {
      return data;
    }
    
    // Se vier como string ISO ou outro formato
    try {
      const dataObj = new Date(data);
      if (isNaN(dataObj.getTime())) {
        // Se não conseguir parsear, retornar a string original
        return data;
      }
      return dataObj.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return data;
    }
  };

  const formatarValor = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Função para obter a classe do badge de status
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'autorizado':
        return darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800';
      case 'em análise':
      case 'não autorizado':
        return darkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800';
      default:
        return darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800';
    }
  };

  // Função para filtrar orçamentos
  const orcamentosFiltrados = orcamentos.filter(orcamento => {
    // Filtro por cliente
    if (filtros.cliente) {
      const clienteMatch = orcamento.cliente_nome?.toLowerCase().includes(filtros.cliente.toLowerCase());
      if (!clienteMatch) return false;
    }
    
    // Filtro por status
    if (filtros.status === 'autorizados' && orcamento.status !== 'Autorizado') {
      return false;
    }
    if (filtros.status === 'nao_autorizados' && orcamento.status !== 'Em análise') {
      return false;
    }
    
    return true;
  });

  // Função para calcular totalizadores baseado nos orçamentos filtrados
  const calcularTotalizadores = () => {
    const autorizados = orcamentosFiltrados.filter(o => o.status === 'Autorizado');
    const naoAutorizados = orcamentosFiltrados.filter(o => o.status === 'Em análise');
    const total = orcamentosFiltrados.length;
    
    // Calcular valores monetários
    const valorAutorizados = autorizados.reduce((sum, o) => sum + (parseFloat(o.valor_total) || 0), 0);
    const valorNaoAutorizados = naoAutorizados.reduce((sum, o) => sum + (parseFloat(o.valor_total) || 0), 0);
    const valorTotal = orcamentosFiltrados.reduce((sum, o) => sum + (parseFloat(o.valor_total) || 0), 0);
    
    return {
      total,
      autorizados: autorizados.length,
      naoAutorizados: naoAutorizados.length,
      valorTotal,
      valorAutorizados,
      valorNaoAutorizados
    };
  };

  const totalizadores = calcularTotalizadores();

  // Função para imprimir orçamento
  const handleImprimir = async (numeroOrcamento) => {
    try {
      // Obter token e empresa como nas outras requisições
      const token = localStorage.getItem('token');
      const empresaCodigo = localStorage.getItem('empresa_atual');
      
      if (!token) {
        alert('Você precisa estar logado para imprimir o orçamento.');
        return;
      }
      
      // Fazer a requisição com os cabeçalhos corretos
      const response = await api.get(`/orcamentos/${numeroOrcamento}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaCodigo,
          'Content-Type': 'application/json'
        },
        responseType: 'text' // Porque esperamos HTML
      });
      
      // Abrir nova janela com o HTML retornado
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(response.data);
        printWindow.document.close();
      } else {
        alert('Por favor, permita pop-ups para imprimir o orçamento.');
      }
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      if (error.response?.status === 401) {
        alert('Sessão expirada. Faça login novamente.');
      } else {
        alert('Erro ao gerar PDF do orçamento: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  if (isLoading) {
    return (
      <div className={`p-6 ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner darkMode={darkMode} message="Carregando orçamentos..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
        <div className="flex justify-center items-center h-64">
          <div className={`text-lg ${darkMode ? "text-red-400" : "text-red-600"}`}>{error}</div>
        </div>
      </div>
    );
  }

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                onChange={(e) => updateFiltros({ ...filtros, cliente: e.target.value })}
                placeholder="Buscar por cliente..."
                className={`pl-10 w-full rounded-md border ${
                  darkMode
                    ? "bg-gray-600 border-gray-500 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-700 placeholder-gray-500"
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
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
                onChange={(e) => updateFiltros({ ...filtros, data_inicio: e.target.value })}
                className={`pl-10 w-full rounded-md border ${
                  darkMode
                    ? "bg-gray-600 border-gray-500 text-white"
                    : "bg-white border-gray-300 text-gray-700"
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
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
                onChange={(e) => updateFiltros({ ...filtros, data_fim: e.target.value })}
                className={`pl-10 w-full rounded-md border ${
                  darkMode
                    ? "bg-gray-600 border-gray-500 text-white"
                    : "bg-white border-gray-300 text-gray-700"
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              Status
            </label>
            <select
              value={filtros.status}
              onChange={(e) => updateFiltros({ ...filtros, status: e.target.value })}
              className={`w-full rounded-md border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300 text-gray-700"
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="todos">Todos</option>
              <option value="autorizados">Autorizados</option>
              <option value="nao_autorizados">Não Autorizados</option>
            </select>
          </div>
        </div>
        
        {/* Botão Buscar */}
        <div className="mt-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {isCacheValid() && (
              <div className={`text-xs px-2 py-1 rounded-full ${
                darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
              }`}>
                📦 Cache ativo
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                clearCache();
                buscarOrcamentos();
              }}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                darkMode
                  ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            >
              🔄 Atualizar
            </button>
            <button
              onClick={buscarOrcamentos}
              disabled={isLoading}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                isLoading
                  ? darkMode
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : darkMode
                    ? 'bg-blue-700 text-white hover:bg-blue-600'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>
      </div>

      {/* Totalizadores */}
      <div className={`mb-6 p-4 rounded-lg shadow-md ${darkMode ? "bg-gray-700" : "bg-white"}`}>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
              Resumo: <span className="font-bold">{orcamentosFiltrados.length}</span> orçamentos encontrados
              {isCacheValid() && (
                <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                  darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'
                }`}>
                  📦 Cache
                </span>
              )}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            {/* Card Autorizados */}
            <div className={`p-3 rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              <p className={`text-xs md:text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Autorizados</p>
              <p className={`text-lg md:text-xl font-bold ${darkMode ? "text-green-300" : "text-green-600"}`}>
                {totalizadores.autorizados}
              </p>
              <p className={`text-xs md:text-sm font-semibold ${darkMode ? "text-green-400" : "text-green-700"}`}>
                {formatarValor(totalizadores.valorAutorizados)}
              </p>
            </div>
            
            {/* Card Não Autorizados */}
            <div className={`p-3 rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              <p className={`text-xs md:text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Não Autorizados</p>
              <p className={`text-lg md:text-xl font-bold ${darkMode ? "text-yellow-300" : "text-yellow-600"}`}>
                {totalizadores.naoAutorizados}
              </p>
              <p className={`text-xs md:text-sm font-semibold ${darkMode ? "text-yellow-400" : "text-yellow-700"}`}>
                {formatarValor(totalizadores.valorNaoAutorizados)}
              </p>
            </div>
            
            {/* Card Total */}
            <div className={`p-3 rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              <p className={`text-xs md:text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Total Geral</p>
              <p className={`text-lg md:text-xl font-bold ${darkMode ? "text-blue-300" : "text-blue-600"}`}>
                {totalizadores.total}
              </p>
              <p className={`text-xs md:text-sm font-semibold ${darkMode ? "text-blue-400" : "text-blue-700"}`}>
                {formatarValor(totalizadores.valorTotal)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Filtros rápidos de Status */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => updateFiltros({ ...filtros, status: 'todos' })}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filtros.status === 'todos'
                ? darkMode 
                  ? 'bg-blue-700 text-white' 
                  : 'bg-blue-600 text-white'
                : darkMode 
                  ? 'bg-gray-600 text-gray-300 hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-blue-600 hover:text-white'
            }`}
          >
            Todos ({totalizadores.total})
          </button>
          <button
            onClick={() => updateFiltros({ ...filtros, status: 'autorizados' })}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filtros.status === 'autorizados'
                ? darkMode 
                  ? 'bg-green-700 text-white' 
                  : 'bg-green-600 text-white'
                : darkMode 
                  ? 'bg-gray-600 text-gray-300 hover:bg-green-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-green-600 hover:text-white'
            }`}
          >
            Autorizados ({totalizadores.autorizados})
          </button>
          <button
            onClick={() => updateFiltros({ ...filtros, status: 'nao_autorizados' })}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filtros.status === 'nao_autorizados'
                ? darkMode 
                  ? 'bg-yellow-700 text-white' 
                  : 'bg-yellow-600 text-white'
                : darkMode 
                  ? 'bg-gray-600 text-gray-300 hover:bg-yellow-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-yellow-600 hover:text-white'
            }`}
          >
            Não Autorizados ({totalizadores.naoAutorizados})
          </button>
        </div>
      </div>

      {/* Lista de Orçamentos */}
      {orcamentos.length === 0 ? (
        <div className={`text-center py-8 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
          Nenhum orçamento encontrado
        </div>
      ) : (
        <>
          {/* Cards para Mobile */}
          <div className="md:hidden space-y-4">
            {orcamentosFiltrados.length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Nenhum orçamento encontrado
              </div>
            ) : (
              orcamentosFiltrados.map((orcamento) => (
                <div key={orcamento.id} className={`rounded-lg shadow-md p-4 ${darkMode ? "bg-gray-700" : "bg-white"}`}>
                  {/* Cabeçalho do Card */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                        Orçamento #{orcamento.numero}
                      </h3>
                      <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                        {formatarData(orcamento.data)}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(orcamento.status)}`}>
                      {orcamento.status}
                    </span>
                  </div>
                  
                  {/* Informações do Cliente */}
                  <div className="mb-3">
                    <p className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      {orcamento.cliente_nome}
                    </p>
                    {orcamento.vendedor && (
                      <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Vendedor: {orcamento.vendedor}
                      </p>
                    )}
                  </div>
                  
                  {/* Grid de Informações */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                      <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Forma Pagto</p>
                      <p className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        {orcamento.forma_pagamento || '-'}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Tabela</p>
                      <p className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        {orcamento.tabela || '-'}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Desconto</p>
                      <p className={`text-sm font-medium ${darkMode ? "text-green-300" : "text-green-700"}`}>
                        {formatarValor(orcamento.desconto || 0)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Valor Total */}
                  <div className="flex justify-between items-center mb-4">
                    <span className={`text-lg font-bold ${darkMode ? "text-green-400" : "text-green-600"}`}>
                      {formatarValor(orcamento.valor_total)}
                    </span>
                  </div>
                  
                  {/* Ações */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleOrcamentoDetails(orcamento.numero)}
                      className={`flex-1 flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded ${
                        expandedOrcamento === orcamento.numero
                          ? darkMode ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white'
                          : darkMode ? 'bg-gray-600 text-gray-300 hover:bg-blue-700' : 'bg-gray-200 text-gray-700 hover:bg-blue-600 hover:text-white'
                      } transition-colors duration-200`}
                    >
                      {expandedOrcamento === orcamento.numero ? <FiChevronUp className="mr-1" /> : <FiChevronDown className="mr-1" />}
                      {expandedOrcamento === orcamento.numero ? 'Ocultar' : 'Detalhes'}
                    </button>
                    
                    <button
                      onClick={() => handleImprimir(orcamento.numero)}
                      className={`px-3 py-2 border border-transparent text-sm font-medium rounded hover:${
                        darkMode ? 'bg-green-700' : 'bg-green-700'
                      } ${darkMode ? 'text-green-300 hover:text-white' : 'text-green-600 hover:text-white'} transition-colors duration-200`}
                      title="Imprimir orçamento"
                    >
                      <FiPrinter />
                    </button>
                  </div>
                  
                  {/* Detalhes Expandidos */}
                  {expandedOrcamento === orcamento.numero && (
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <h4 className={`font-medium mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
                        Itens do Orçamento
                      </h4>
                      
                      {orcamento.itens && orcamento.itens.length > 0 ? (
                        <div className="space-y-2">
                          {orcamento.itens.map((item, index) => (
                            <div key={index} className={`p-3 rounded ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                              <div className="flex justify-between items-start mb-1">
                                <p className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                                  {item.codigo}
                                </p>
                                <p className={`text-sm font-bold ${darkMode ? "text-green-400" : "text-green-600"}`}>
                                  {formatarValor((item.quantidade || 0) * (item.valor || item.valor_unitario || 0))}
                                </p>
                              </div>
                              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"} mb-2`}>
                                {item.descricao}
                              </p>
                              <div className="flex justify-between text-xs">
                                <span className={darkMode ? "text-gray-400" : "text-gray-600"}>
                                  Qtd: {item.quantidade}
                                </span>
                                <span className={darkMode ? "text-gray-400" : "text-gray-600"}>
                                  Unit: {formatarValor(item.valor || item.valor_unitario || 0)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                          Nenhum item encontrado para este orçamento.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          
          {/* Tabela para Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className={`min-w-full divide-y ${
              darkMode ? "divide-gray-700" : "divide-gray-200"
            }`}>
              <thead className={darkMode ? "bg-gray-700" : "bg-gray-50"}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>N°</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>Data</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>Cliente</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>Vendedor</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>Forma Pagto</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>Tabela</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>Valor</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>Desconto</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>Status</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>Ações</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? "divide-gray-600" : "divide-gray-200"}`}>
                {orcamentosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="10" className={`px-6 py-4 text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      Nenhum orçamento encontrado
                    </td>
                  </tr>
                ) : (
                  orcamentosFiltrados.map((orcamento) => (
                    <React.Fragment key={orcamento.id}>
                      <tr className={`hover:${darkMode ? 'bg-gray-700' : 'bg-gray-50'} cursor-pointer ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">{orcamento.numero}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">{formatarData(orcamento.data)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">{orcamento.cliente_nome}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">{orcamento.vendedor || '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">{orcamento.forma_pagamento || '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">{orcamento.tabela || '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">{formatarValor(orcamento.valor_total)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">{formatarValor(orcamento.desconto || 0)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(orcamento.status)}`}>
                            {orcamento.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleOrcamentoDetails(orcamento.numero)}
                              className={`inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded hover:${
                                darkMode ? 'bg-blue-700' : 'bg-blue-700'
                              } ${darkMode ? 'text-blue-300 hover:text-white' : 'text-blue-600 hover:text-white'} transition-colors duration-200`}
                              title="Ver detalhes"
                            >
                              {expandedOrcamento === orcamento.numero ? <FiChevronUp /> : <FiChevronDown />}
                              <FiEye className="ml-1" />
                            </button>
                            
                            <button
                              onClick={() => handleImprimir(orcamento.numero)}
                              className={`inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded hover:${
                                darkMode ? 'bg-green-700' : 'bg-green-700'
                              } ${darkMode ? 'text-green-300 hover:text-white' : 'text-green-600 hover:text-white'} transition-colors duration-200`}
                              title="Imprimir orçamento"
                            >
                              <FiPrinter />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Linha expandida com itens do orçamento */}
                      {expandedOrcamento === orcamento.numero && (
                        <tr className={darkMode ? "bg-gray-800" : "bg-gray-100"}>
                          <td colSpan="9" className="px-4 py-4">
                            <div className="space-y-4">
                              <h4 className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                                Itens do Orçamento #{orcamento.numero}
                              </h4>
                              
                              {orcamento.itens && orcamento.itens.length > 0 ? (
                                <div className="overflow-x-auto">
                                  <table className={`min-w-full divide-y ${darkMode ? "divide-gray-600" : "divide-gray-200"}`}>
                                    <thead className={darkMode ? "bg-gray-700" : "bg-gray-50"}>
                                      <tr>
                                        <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>Código</th>
                                        <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>Descrição</th>
                                        <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>Qtd</th>
                                        <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>Valor Unit.</th>
                                        <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}>Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className={`divide-y ${darkMode ? "divide-gray-600" : "divide-gray-200"}`}>
                                      {orcamento.itens.map((item, index) => (
                                        <tr key={index} className={darkMode ? "text-gray-100" : "text-gray-900"}>
                                          <td className="px-3 py-2 text-xs">{item.codigo}</td>
                                          <td className="px-3 py-2 text-xs">{item.descricao}</td>
                                          <td className="px-3 py-2 text-xs">{item.quantidade}</td>
                                          <td className="px-3 py-2 text-xs">{formatarValor(item.valor || item.valor_unitario || 0)}</td>
                                          <td className="px-3 py-2 text-xs">{formatarValor((item.quantidade || 0) * (item.valor || item.valor_unitario || 0))}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                                  Nenhum item encontrado para este orçamento.
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default OrcamentosList;
