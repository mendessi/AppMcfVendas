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
  const [errorMsg, setErrorMsg] = useState(null);
  const [filtroAutenticacao, setFiltroAutenticacao] = useState('todas'); // 'todas', 'autenticadas', 'nao_autenticadas'
  
  // ===== NOVOS ESTADOS PARA FILTRO DE VENDEDOR =====
  const [vendedores, setVendedores] = useState([]);
  const [vendedorSelecionado, setVendedorSelecionado] = useState('');
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [filtroVendedorBloqueado, setFiltroVendedorBloqueado] = useState(false);

  // ===== CSS PARA DROPDOWN VENDEDORES =====
  const dropdownStyles = `
    .vendedor-dropdown option {
      padding: 8px 12px !important;
      margin: 2px 0 !important;
      ${darkMode ? `
        background-color: #374151 !important;
        color: #ffffff !important;
        border: 1px solid #4b5563 !important;
      ` : `
        background-color: #ffffff !important;
        color: #1f2937 !important;
        border: 1px solid #d1d5db !important;
      `}
    }
    .vendedor-dropdown option:hover {
      ${darkMode ? `
        background-color: #4b5563 !important;
        color: #60a5fa !important;
      ` : `
        background-color: #f3f4f6 !important;
        color: #1d4ed8 !important;
      `}
    }
    .vendedor-dropdown:focus {
      outline: 2px solid #3b82f6 !important;
      outline-offset: 2px !important;
    }
  `;

  // Inserir estilos CSS no head
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = dropdownStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, [darkMode, dropdownStyles]);

  // Remover busca automática ao abrir no mobile
  useEffect(() => {
    buscarVendedores(); // Buscar vendedores primeiro
    verificarUsuarioLogado(); // Verificar nível do usuário
    buscarPedidos(); // Sempre busca pedidos ao abrir a tela, independente do tamanho da tela
    // eslint-disable-next-line
  }, []);

  // ===== FUNÇÃO PARA VERIFICAR USUÁRIO LOGADO =====
  const verificarUsuarioLogado = () => {
    try {
      const userString = localStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        setUsuarioAtual(user);
        
        // Se é VENDEDOR, bloqueia o filtro e seleciona automaticamente
        if (user.nivel === 'VENDEDOR') {
          setFiltroVendedorBloqueado(true);
          setVendedorSelecionado(user.codigo_vendedor || '');
          console.log('🎯 USUÁRIO VENDEDOR detectado:', user.codigo_vendedor);
        } else {
          setFiltroVendedorBloqueado(false);
          console.log('🎯 USUÁRIO ADMIN/GERENTE detectado:', user.nivel);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar usuário logado:', error);
    }
  };

  // ===== FUNÇÃO PARA BUSCAR VENDEDORES =====
  const buscarVendedores = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const empresaCodigo = obterEmpresaCodigo();
      if (!empresaCodigo) return;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-empresa-codigo': empresaCodigo.toString()
      };

      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/relatorios/listar_vendedores`, { headers });

      if (response.ok) {
        const data = await response.json();
        setVendedores(data);
        console.log('🎯 VENDEDORES carregados:', data.length);
      } else {
        console.error('Erro ao buscar vendedores:', response.status);
      }
    } catch (error) {
      console.error('Erro ao buscar vendedores:', error);
    }
  };

  // ===== FUNÇÃO HELPER PARA OBTER CÓDIGO DA EMPRESA =====
  const obterEmpresaCodigo = () => {
    // Tentar obter do localStorage 'empresa_detalhes' (objeto completo)
    const empresaDetalhes = localStorage.getItem('empresa_detalhes');
    if (empresaDetalhes) {
      try {
        const empObj = JSON.parse(empresaDetalhes);
        return empObj?.cli_codigo;
      } catch (e) {
        console.log('Erro ao parsear empresa_detalhes:', e.message);
      }
    }

    // Se não encontrou, tentar das outras chaves
    const empresaSelecionada = localStorage.getItem('empresa') || 
                             localStorage.getItem('empresa_atual') || 
                             localStorage.getItem('empresa_selecionada');
    
    if (empresaSelecionada) {
      try {
        const empObj = JSON.parse(empresaSelecionada);
        return empObj?.cli_codigo || empObj?.codigo;
      } catch {
        return empresaSelecionada;
      }
    }
    return null;
  };

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
      
      const empresaCodigo = obterEmpresaCodigo();
      
      // Validar se temos um código de empresa válido
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
      
      // ===== MONTAR QUERY STRING COM FILTROS =====
      const params = new URLSearchParams();
      if (dataInicial && dataFinal) {
        params.append('data_inicial', dataInicial);
        params.append('data_final', dataFinal);
      }
      
      // ===== INCLUIR FILTRO DE VENDEDOR =====
      if (vendedorSelecionado && vendedorSelecionado !== 'todos') {
        params.append('vendedor_codigo', vendedorSelecionado);
        console.log('🎯 VENDAS - Aplicando filtro de vendedor:', vendedorSelecionado);
      }
      
      let url = `${apiUrl}/relatorios/vendas`;
      if (params.toString()) {
        url += `?${params.toString()}`;
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
      
      // ===== PROCESSAR RESPOSTA ATUALIZADA =====
      let vendas = [];
      if (data.vendas) {
        // Resposta nova (com objeto)
        vendas = data.vendas;
        console.log('🎯 RESPOSTA NOVA - Total:', data.total_registros, 'Filtro aplicado:', data.filtro_vendedor_aplicado);
      } else if (Array.isArray(data)) {
        // Resposta antiga (array direto)
        vendas = data;
        console.log('🎯 RESPOSTA ANTIGA - Total:', data.length);
      }
      
      // Mapear os dados para o formato esperado pelo front
      const pedidosFormatados = vendas.map(venda => ({
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
        vendedor_codigo: venda.ven_codigo || '',
        itens: [], // será preenchido ao expandir
      }));
      setPedidos(pedidosFormatados);
      setFilteredPedidos(pedidosFormatados);
      // Diagnóstico: mostrar todos os nomes de clientes carregados
      console.log('Clientes carregados:', pedidosFormatados.map(p => p.cliente_nome));
      
      // Aplicar o filtro de autenticação
      aplicarFiltros(pedidosFormatados, searchTerm, filtroAutenticacao);
    } catch (error) {
      setPedidos([]);
      setFilteredPedidos([]);
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
    
    setFilteredPedidos(resultado);
  };
  
  // Efeito para atualizar os filtros quando o termo de busca ou filtro de autenticação mudar
  useEffect(() => {
    aplicarFiltros(pedidos, searchTerm, filtroAutenticacao);
  }, [searchTerm, filtroAutenticacao, pedidos]);

  // ===== EFEITO PARA RE-BUSCAR QUANDO VENDEDOR MUDAR =====
  useEffect(() => {
    // Só re-busca se já carregou uma vez e o vendedor mudou
    // Evita busca dupla no carregamento inicial
    if (!loading && vendedorSelecionado !== '' && pedidos.length >= 0) {
      console.log('🎯 VENDEDOR ALTERADO - Re-buscando vendas para:', vendedorSelecionado || 'TODOS');
      buscarPedidos();
    }
    // eslint-disable-next-line
  }, [vendedorSelecionado]);

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
          
          // Obter código da empresa usando a mesma abordagem do buscarPedidos
          let empresaCodigo = localStorage.getItem('empresa_detalhes');
          
          if (empresaCodigo) {
            try {
              const empObj = JSON.parse(empresaCodigo);
              empresaCodigo = empObj?.cli_codigo;
            } catch {
              empresaCodigo = null;
            }
          }
          
          // Se não encontrou, tentar das outras chaves
          if (!empresaCodigo) {
            const empresaSelecionada = localStorage.getItem('empresa') || 
                                     localStorage.getItem('empresa_atual') || 
                                     localStorage.getItem('empresa_selecionada');
            
            if (empresaSelecionada) {
              try {
                const empObj = JSON.parse(empresaSelecionada);
                empresaCodigo = empObj?.cli_codigo || empObj?.codigo;
              } catch {
                empresaCodigo = empresaSelecionada;
              }
            }
          }
          
          // Validar se temos um código de empresa válido
          if (!empresaCodigo || empresaCodigo === '0' || empresaCodigo === 0) {
            console.error('Nenhuma empresa válida selecionada para buscar itens');
            return;
          }
          
          const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-empresa-codigo': empresaCodigo.toString()
          };
          
          const apiUrl = process.env.REACT_APP_API_URL || '';
          const response = await fetch(`${apiUrl}/relatorios/vendas/${pedidoId}/itens`, { headers });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro ao buscar itens:', errorData);
            throw new Error(errorData.detail || 'Erro ao buscar itens do pedido');
          }
          
          const itens = await response.json();
          setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, itens } : p));
        } catch (e) {
          console.error('Erro completo ao buscar itens:', e);
          // Opcionalmente mostrar erro para o usuário
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
        <div>
          <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Vendedor</label>
          <select
            className={`
              vendedor-dropdown
              p-2 border rounded w-full min-w-[200px]
              ${darkMode 
                ? "bg-gray-700 border-gray-600 text-white" 
                : "bg-white border-gray-300 text-gray-700"
              } 
              ${filtroVendedorBloqueado ? 'cursor-not-allowed opacity-75' : ''}
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              text-sm font-medium
              hover:border-gray-400
              transition-all duration-200
            `}
            style={{
              // Estilos para as opções do dropdown
              fontSize: '14px',
              fontWeight: '500',
              lineHeight: '1.5',
              ...(darkMode ? {
                colorScheme: 'dark'
              } : {})
            }}
            value={vendedorSelecionado}
            onChange={e => setVendedorSelecionado(e.target.value)}
            disabled={filtroVendedorBloqueado}
            title={filtroVendedorBloqueado ? 'Como VENDEDOR, você só pode ver suas próprias vendas' : 'Selecione um vendedor ou "Todos"'}
          >
            {!filtroVendedorBloqueado && (
              <option 
                value=""
                className={darkMode ? "bg-gray-700 text-white" : "bg-white text-gray-700"}
              >
                📋 Todos os vendedores
              </option>
            )}
            {vendedores.map(vendedor => (
              <option 
                key={vendedor.VEN_CODIGO} 
                value={vendedor.VEN_CODIGO}
                className={darkMode ? "bg-gray-700 text-white font-medium" : "bg-white text-gray-700 font-medium"}
              >
                👤 {vendedor.VEN_NOME} (#{vendedor.VEN_CODIGO})
              </option>
            ))}
          </select>
          {filtroVendedorBloqueado && usuarioAtual && (
            <p className={`text-xs mt-1 ${darkMode ? "text-yellow-400" : "text-yellow-600"}`}>
              🔒 Filtro automático: {usuarioAtual.nivel}
            </p>
          )}
          {/* Debug info */}
          <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            {vendedores.length} vendedor(es) ativo(s)
          </p>
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Autenticação</label>
          <select
            className={`p-2 border rounded ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-700"}`}
            value={filtroAutenticacao}
            onChange={e => setFiltroAutenticacao(e.target.value)}
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
        <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Listar Vendas</h1>
        <Link to="/novo-pedido" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full sm:w-auto">
          Nova Venda
        </Link>
      </div>

      {/* Totalizador */}
      <div className={`mb-6 p-4 rounded-lg shadow-md ${darkMode ? "bg-gray-700" : "bg-white"}`}>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
              Resumo: <span className="font-bold">{filteredPedidos.length}</span> pedidos encontrados
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:flex md:gap-4">
            <div className={`p-2 rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              <p className={`text-xs md:text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Autenticadas</p>
              <p className={`text-lg md:text-xl font-bold ${darkMode ? "text-green-300" : "text-green-600"}`}>
                {filteredPedidos.filter(p => p.autenticada).length}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              <p className={`text-xs md:text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Não Autenticadas</p>
              <p className={`text-lg md:text-xl font-bold ${darkMode ? "text-red-300" : "text-red-600"}`}>
                {filteredPedidos.filter(p => !p.autenticada).length}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              <p className={`text-xs md:text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Valor Total</p>
              <p className={`text-lg md:text-xl font-bold ${darkMode ? "text-blue-300" : "text-blue-600"}`}>
                {formatCurrency(filteredPedidos.reduce((total, p) => total + (parseFloat(p.valor_total) || 0), 0))}
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
                          {expandedPedido === pedido.id ? '🙈' : '👁️'}
                        </button>
                      </td>
                    </tr>
                    {expandedPedido === pedido.id && (
                      <tr>
                        <td colSpan="10" className={`px-6 py-4 ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                          <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>
                            <h3 className="font-bold mb-2">Itens do Pedido #{pedido.id}</h3>
                            {pedido.itens && pedido.itens.length > 0 ? (
                              <table className="w-full text-xs mt-2 border border-gray-300 rounded">
                                <thead>
                                  <tr className={`${darkMode ? "bg-gray-600" : "bg-gray-200"}`}>
                                    <th className="px-2 py-1 text-center border-r">Código</th>
                                    <th className="px-2 py-1 text-left border-r">Descrição</th>
                                    <th className="px-2 py-1 text-center border-r">Marca</th>
                                    <th className="px-2 py-1 text-center border-r">Unidade</th>
                                    <th className="px-2 py-1 text-center border-r">Qtd</th>
                                    <th className="px-2 py-1 text-center border-r">Preço Unit.</th>
                                    <th className="px-2 py-1 text-center border-r">Total</th>
                                    <th className="px-2 py-1 text-center">Estoque</th>
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
                                    const total = (parseFloat(nitem.PRO_QUANTIDADE) || 0) * (parseFloat(nitem.PRO_VENDA) || 0);
                                    return (
                                      <tr key={idx} className={`border-b ${darkMode ? "border-gray-600" : "border-gray-200"} hover:${darkMode ? "bg-gray-650" : "bg-gray-100"}`}>
                                        <td className="px-2 py-1 text-center border-r">{nitem.PRO_CODIGO}</td>
                                        <td className="px-2 py-1 text-left border-r">{nitem.PRO_DESCRICAO}</td>
                                        <td className="px-2 py-1 text-center border-r">{nitem.PRO_MARCA || '-'}</td>
                                        <td className="px-2 py-1 text-center border-r">{nitem.UNI_CODIGO || '-'}</td>
                                        <td className="px-2 py-1 text-center border-r">{parseFloat(nitem.PRO_QUANTIDADE).toFixed(2)}</td>
                                        <td className="px-2 py-1 text-center border-r">{formatCurrency(nitem.PRO_VENDA)}</td>
                                        <td className="px-2 py-1 text-center font-semibold border-r text-green-600">{formatCurrency(total.toFixed(2))}</td>
                                        <td className="px-2 py-1 text-center">{parseFloat(nitem.ESTOQUE_ATUAL || 0).toFixed(2)}</td>
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
                      {expandedPedido === pedido.id ? '🙈' : '👁️'}
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
                      {pedido.itens && pedido.itens.length > 0 ? (
                        <div className="space-y-2">
                          {pedido.itens.map((item, index) => {
                            // Normaliza as chaves para garantir compatibilidade maiúsculo/minúsculo
                            const norm = (obj) => {
                              const novo = {};
                              Object.keys(obj).forEach(k => novo[k.toUpperCase()] = obj[k]);
                              return novo;
                            };
                            const nitem = norm(item);
                            const total = (parseFloat(nitem.PRO_QUANTIDADE) || 0) * (parseFloat(nitem.PRO_VENDA) || 0);
                            
                            return (
                              <div key={index} className={`p-3 rounded ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <span className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                                      {nitem.PRO_DESCRICAO}
                                    </span>
                                    <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"} mt-1`}>
                                      Código: {nitem.PRO_CODIGO} | Marca: {nitem.PRO_MARCA || '-'}
                                    </div>
                                  </div>
                                  <span className={`font-bold ${darkMode ? "text-white" : "text-gray-900"} ml-2 text-green-600`}>
                                    {formatCurrency(total.toFixed(2))}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className={darkMode ? "text-gray-400" : "text-gray-500"}>
                                    Qtd: {parseFloat(nitem.PRO_QUANTIDADE).toFixed(2)} {nitem.UNI_CODIGO || ''}
                                  </div>
                                  <div className={darkMode ? "text-gray-400" : "text-gray-500"}>
                                    Preço: {formatCurrency(nitem.PRO_VENDA)}
                                  </div>
                                  <div className={darkMode ? "text-gray-400" : "text-gray-500"}>
                                    Estoque: {parseFloat(nitem.ESTOQUE_ATUAL || 0).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div className="flex justify-between font-bold mt-2 pt-2 border-t border-dashed border-gray-300">
                            <span className={darkMode ? "text-white" : "text-gray-900"}>Total do Pedido:</span>
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
