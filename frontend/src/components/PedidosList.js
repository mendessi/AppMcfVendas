import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const PedidosList = ({ darkMode }) => {
  const [pedidos, setPedidos] = useState([]);
  const [pedidosFiltrados, setPedidosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPedido, setExpandedPedido] = useState(null);
  const [dataInicial, setDataInicial] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().slice(0, 10);
  });
  const [dataFinal, setDataFinal] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().slice(0, 10);
  });
  const [errorMsg, setErrorMsg] = useState(null);
  const [filtroAutenticacao, setFiltroAutenticacao] = useState('todas'); // 'todas', 'autenticadas', 'nao_autenticadas'

  // Cache keys
  const CACHE_KEY_FILTERS = 'pedidos_filtros_cache';
  const CACHE_KEY_DATA = 'pedidos_data_cache';
  const CACHE_KEY_TIMESTAMP = 'pedidos_timestamp_cache';
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
      dataInicial: hoje.toISOString().slice(0, 10),
      dataFinal: hoje.toISOString().slice(0, 10),
      clienteFiltro: '',
      autenticacaoFiltro: 'todas'
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
      
      console.log('🔍 DEBUG - Cache pedidos válido:', isValid, 'Idade:', (now - cacheTime) / 1000, 'segundos');
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
        
        console.log('🔍 DEBUG - Carregando pedidos do cache:', data.length, 'pedidos');
        setPedidos(data);
        setPedidosFiltrados(data);
        setFiltros(filters);
        setLoading(false);
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
      console.log('🔍 DEBUG - Pedidos salvos no cache:', data.length, 'pedidos');
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
      console.log('🔍 DEBUG - Cache de pedidos limpo');
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

  // Remover busca automática ao abrir no mobile
  useEffect(() => {
    // Tentar carregar do cache primeiro
    const cacheLoaded = loadDataFromCache();
    
    // Se não conseguiu carregar do cache, fazer requisição
    if (!cacheLoaded) {
      buscarPedidos(); // Sempre busca pedidos ao abrir a tela, independente do tamanho da tela
    }
    // eslint-disable-next-line
  }, []);

  // Busca só será feita ao clicar em "Buscar" no mobile
  const buscarPedidos = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = localStorage.getItem('token');
      
      console.log('🔍 DEBUG - Token:', token ? 'Presente' : 'Ausente');
      
      // Verificar se o token existe
      if (!token) {
        setErrorMsg('Token de autenticação não encontrado. Redirecionando para login...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }
      
      // Tentar obter a empresa de várias fontes no localStorage
      let empresaCodigo = null;
      
      // 1. Tentar obter do localStorage 'empresa_detalhes' (objeto completo)
      const empresaDetalhes = localStorage.getItem('empresa_detalhes');
      if (empresaDetalhes) {
        try {
          const empObj = JSON.parse(empresaDetalhes);
          empresaCodigo = empObj?.cli_codigo;
          console.log('🔍 DEBUG - Empresa de empresa_detalhes:', empObj);
        } catch (e) {
          console.log('🔍 DEBUG - Erro ao parsear empresa_detalhes:', e.message);
        }
      }
      
      // 2. Se não encontrou, tentar das outras chaves (como string ou objeto)
      if (!empresaCodigo) {
        const empresaSelecionada = localStorage.getItem('empresa') || 
                                 localStorage.getItem('empresa_atual') || 
                                 localStorage.getItem('empresa_selecionada');
        
        console.log('🔍 DEBUG - Empresa localStorage raw:', empresaSelecionada);
        
        if (empresaSelecionada) {
          try {
            // Tentar como JSON primeiro
            const empObj = JSON.parse(empresaSelecionada);
            empresaCodigo = empObj?.cli_codigo || empObj?.codigo;
            console.log('🔍 DEBUG - Empresa parseada como JSON:', empObj);
          } catch {
            // Se falhar, usar como string diretamente
            empresaCodigo = empresaSelecionada;
            console.log('🔍 DEBUG - Empresa como string:', empresaCodigo);
          }
        }
      }
      
      // 3. Validar se temos um código de empresa válido
      if (!empresaCodigo || empresaCodigo === '0' || empresaCodigo === 0) {
        setErrorMsg('Nenhuma empresa válida selecionada. Mostrando seleção de empresa...');
        console.log('🚨 DEBUG - Empresa inválida ou ausente:', empresaCodigo);
        // Limpar empresa do localStorage para forçar seleção
        localStorage.removeItem('empresa');
        localStorage.removeItem('empresa_atual');
        localStorage.removeItem('empresa_selecionada');
        localStorage.removeItem('empresa_detalhes');
        setTimeout(() => {
          window.location.reload(); // Recarregar para mostrar seletor de empresas
        }, 2000);
        return;
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-empresa-codigo': empresaCodigo.toString() // Garantir que seja string
      };
      
      console.log('🔍 DEBUG - Headers finais:', headers);
      console.log('🔍 DEBUG - Empresa código final:', empresaCodigo);
      
      const apiUrl = process.env.REACT_APP_API_URL || '';
      // Montar query string de datas
      let url = `${apiUrl}/relatorios/vendas`;
      if (filtros.dataInicial && filtros.dataFinal) {
        url += `?data_inicial=${filtros.dataInicial}&data_final=${filtros.dataFinal}`;
      }
      
      console.log('🔍 DEBUG - URL final:', url);
      
      const response = await fetch(url, { headers });
      
      console.log('🔍 DEBUG - Response status:', response.status);
      console.log('🔍 DEBUG - Response ok:', response.ok);
      
      if (!response.ok) {
        // Tentar obter o detalhe do erro da resposta
        let errorDetail = 'Erro desconhecido';
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || `Erro ${response.status}: ${response.statusText}`;
        } catch {
          errorDetail = `Erro ${response.status}: ${response.statusText}`;
        }
        
        console.error('🚨 ERRO na API:', errorDetail);
        
        // Se for erro 401 (Unauthorized), redirecionar para login
        if (response.status === 401) {
          console.log('Token expirado, limpando localStorage e redirecionando...');
          localStorage.removeItem('token');
          localStorage.removeItem('usuario_id');
          localStorage.removeItem('usuario_nome');
          localStorage.removeItem('user');
          setErrorMsg('Sessão expirada. Redirecionando para login...');
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
          return;
        }
        
        // Se for erro 400 sobre empresa, redirecionar para seleção de empresa
        if (response.status === 400 && errorDetail.includes('empresa')) {
          console.log('Problema com empresa selecionada, limpando e recarregando...');
          setErrorMsg('Problema com a empresa selecionada. Mostrando seleção de empresa...');
          // Limpar empresa do localStorage para forçar seleção
          localStorage.removeItem('empresa');
          localStorage.removeItem('empresa_atual');
          localStorage.removeItem('empresa_selecionada');
          localStorage.removeItem('empresa_detalhes');
          setTimeout(() => {
            window.location.reload(); // Recarregar para mostrar seletor de empresas
          }, 2000);
          return;
        }
        
        throw new Error(errorDetail);
      }
      
      const data = await response.json();
      console.log('✅ DEBUG - Dados recebidos:', data);
      
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
      setPedidosFiltrados(pedidosFormatados);
      // Diagnóstico: mostrar todos os nomes de clientes carregados
      console.log('Clientes carregados:', pedidosFormatados.map(p => p.cliente_nome));
      
      // Aplicar o filtro de autenticação
      aplicarFiltros(pedidosFormatados, filtros.clienteFiltro, filtros.autenticacaoFiltro);
      
      // Salvar dados no cache
      saveToCache(pedidosFormatados, filtros);
    } catch (error) {
      setPedidos([]);
      setPedidosFiltrados([]);
      setErrorMsg(`Erro ao buscar pedidos: ${error.message}`);
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

  const normalize = (str) => {
    return (str || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  };
  
  // Função para aplicar todos os filtros
  const aplicarFiltros = (listaPedidos, termo, filtroAuth) => {
    // Filtrar pelo termo de busca
    let resultado = listaPedidos;
    
    if (termo) {
      const termoBusca = normalize(termo);
      resultado = resultado.filter(p => {
        return normalize(p.cliente_nome).includes(termoBusca) || 
          normalize(p.id.toString()).includes(termoBusca) || 
          normalize(p.status).includes(termoBusca);
      });
    }
    
    // Filtrar por autenticação
    if (filtroAuth === 'autenticadas') {
      resultado = resultado.filter(p => p.autenticada);
    } else if (filtroAuth === 'nao_autenticadas') {
      resultado = resultado.filter(p => !p.autenticada);
    }
    
    setPedidosFiltrados(resultado);
  };
  
  // Efeito para atualizar os filtros quando os filtros mudarem
  useEffect(() => {
    aplicarFiltros(pedidos, filtros.clienteFiltro, filtros.autenticacaoFiltro);
  }, [filtros.clienteFiltro, filtros.autenticacaoFiltro, pedidos]);

  const togglePedidoDetails = async (pedidoId) => {
    if (expandedPedido === pedidoId) {
      setExpandedPedido(null);
    } else {
      setExpandedPedido(pedidoId);
      // Buscar itens do pedido se ainda não carregou
      const pedido = pedidos.find(p => p.id === pedidoId);
      if (pedido && (!pedido.itens || pedido.itens.length === 0)) {
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
          const response = await fetch(`${apiUrl}/relatorios/vendas/${pedidoId}/itens`, { headers });
          if (!response.ok) throw new Error('Erro ao buscar itens do pedido');
          const itens = await response.json();
          setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, itens } : p));
        } catch (e) {
          // Tratar erro se necessário
        }
      }
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

  if (errorMsg) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className={darkMode ? "text-red-400" : "text-red-600"}>{errorMsg}</div>
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
            value={filtros.dataInicial}
            onChange={e => updateFiltros({...filtros, dataInicial: e.target.value})}
          />
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Data final</label>
          <input
            type="date"
            className={`p-2 border rounded ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-700"}`}
            value={filtros.dataFinal}
            onChange={e => updateFiltros({...filtros, dataFinal: e.target.value})}
          />
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Autenticação</label>
          <select
            className={`p-2 border rounded ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-700"}`}
            value={filtros.autenticacaoFiltro}
            onChange={e => updateFiltros({...filtros, autenticacaoFiltro: e.target.value})}
          >
            <option value="todas">Todas</option>
            <option value="autenticadas">Autenticadas</option>
            <option value="nao_autenticadas">Não Autenticadas</option>
          </select>
        </div>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-5"
          onClick={buscarPedidos}
          disabled={loading}
        >Buscar</button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div className="flex items-center gap-3">
          <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Listar Vendas</h1>
          {isCacheValid() && (
            <span className={`px-2 py-1 text-xs rounded-full ${darkMode ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-800"}`}>
              📦 Cache
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              clearCache();
              buscarPedidos();
            }}
            className={`px-3 py-2 rounded font-medium ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
          >
            🔄 Atualizar
          </button>
          <Link to="/novo-pedido" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full sm:w-auto">
            Nova Venda
          </Link>
        </div>
      </div>

      {/* Totalizador */}
      <div className={`mb-6 p-4 rounded-lg shadow-md ${darkMode ? "bg-gray-700" : "bg-white"}`}>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
              Resumo: <span className="font-bold">{pedidosFiltrados.length}</span> pedidos encontrados
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:flex md:gap-4">
            <div className={`p-2 rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              <p className={`text-xs md:text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Autenticadas</p>
              <p className={`text-lg md:text-xl font-bold ${darkMode ? "text-green-300" : "text-green-600"}`}>
                {pedidosFiltrados.filter(p => p.autenticada).length}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              <p className={`text-xs md:text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Não Autenticadas</p>
              <p className={`text-lg md:text-xl font-bold ${darkMode ? "text-red-300" : "text-red-600"}`}>
                {pedidosFiltrados.filter(p => !p.autenticada).length}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              <p className={`text-xs md:text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Valor Total</p>
              <p className={`text-lg md:text-xl font-bold ${darkMode ? "text-blue-300" : "text-blue-600"}`}>
                {formatCurrency(pedidosFiltrados.reduce((total, p) => total + (parseFloat(p.valor_total) || 0), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por cliente, número do pedido ou status..."
          className={`w-full p-2 border rounded ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-700"}`}
          value={filtros.clienteFiltro}
          onChange={(e) => updateFiltros({...filtros, clienteFiltro: e.target.value})}
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
              {pedidosFiltrados.length > 0 ? (
                pedidosFiltrados.map((pedido) => (
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
                        <td colSpan="10" className={`px-6 py-4 ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                          <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>
                            <h3 className="font-bold mb-2">Itens do Pedido #{pedido.id}</h3>
                            {pedido.itens && pedido.itens.length > 0 ? (
                              <table className="w-full text-xs mt-2">
                                <thead>
                                  <tr>
                                    <th>Código</th>
                                    <th>Descrição</th>
                                    <th>Marca</th>
                                    <th>Unidade</th>
                                    <th>Qtd</th>
                                    <th>Preço</th>
                                    <th>Estoque</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pedido.itens.map((item, idx) => {
                                    // Normaliza as chaves para garantir compatibilidade maiúsculo/minúsculo
                                    const norm = (obj) => {
                                      const novo = {};
                                      Object.keys(obj).forEach(k => novo[k.toUpperCase()] = obj[k]);
                                      return novo;
                                    };
                                    const nitem = norm(item);
                                    return (
                                      <tr key={idx}>
                                        <td>{nitem.PRO_CODIGO}</td>
                                        <td>{nitem.PRO_DESCRICAO}</td>
                                        <td>{nitem.PRO_MARCA}</td>
                                        <td>{nitem.UNI_CODIGO}</td>
                                        <td>{nitem.PRO_QUANTIDADE}</td>
                                        <td>{formatCurrency(nitem.PRO_VENDA)}</td>
                                        <td>{nitem.ESTOQUE_ATUAL}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            ) : (
                              <span>Nenhum item encontrado.</span>
                            )}
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
        {pedidosFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {pedidosFiltrados.map((pedido) => (
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
