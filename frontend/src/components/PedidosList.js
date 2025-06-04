import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const PedidosList = ({ darkMode }) => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const CACHE_KEY_FILTERS = 'pedidos_filtros_cache';
  const CACHE_KEY_DATA = 'pedidos_data_cache';
  const CACHE_KEY_TIMESTAMP = 'pedidos_timestamp_cache';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  const [dadosEmCache, setDadosEmCache] = useState(false);

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
      searchTerm: '',
      dataInicial: hoje.toISOString().slice(0, 10),
      dataFinal: hoje.toISOString().slice(0, 10),
      filtroAutenticacao: 'todas',
      vendedorSelecionado: ''
    };
  };

  // Estado dos filtros, inicializando do cache
  const [filtros, setFiltros] = useState(loadFiltersFromCache());

  // Salvar filtros no cache sempre que algum filtro mudar
  useEffect(() => {
    const filtrosParaSalvar = {
      searchTerm: filtros.searchTerm,
      dataInicial: filtros.dataInicial,
      dataFinal: filtros.dataFinal,
      filtroAutenticacao: filtros.filtroAutenticacao,
      vendedorSelecionado: filtros.vendedorSelecionado
    };
    localStorage.setItem(CACHE_KEY_FILTERS, JSON.stringify(filtrosParaSalvar));
  }, [filtros.searchTerm, filtros.dataInicial, filtros.dataFinal, filtros.filtroAutenticacao, filtros.vendedorSelecionado]);

  // Função para verificar se o cache é válido
  const isCacheValid = () => {
    try {
      const timestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP);
      if (!timestamp) return false;
      const cacheTime = parseInt(timestamp);
      const now = Date.now();
      return (now - cacheTime) < CACHE_DURATION;
    } catch (error) {
      return false;
    }
  };

  // Função para carregar dados do cache
  const loadDataFromCache = () => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY_DATA);
      if (cachedData && isCacheValid()) {
        const data = JSON.parse(cachedData);
        setPedidos(data);
        setDadosEmCache(true);
        setLoading(false);
        return true;
      }
    } catch (error) {
      // Ignorar erro
    }
    setDadosEmCache(false);
    return false;
  };

  // Função para salvar dados no cache
  const saveToCache = (data) => {
    try {
      localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(data));
      localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());
      setDadosEmCache(true);
    } catch (error) {
      // Ignorar erro
    }
  };

  // useEffect para tentar carregar do cache ao abrir a tela
  useEffect(() => {
    if (!loadDataFromCache()) {
      buscarPedidos();
    }
    // eslint-disable-next-line
  }, []);

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
      console.log('🎯 Iniciando busca de vendedores...');
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('🎯 Token não encontrado. Não é possível buscar vendedores.');
        return;
      }

      const empresaCodigo = obterEmpresaCodigo();
      if (!empresaCodigo) {
        console.error('🎯 Empresa não encontrada. Não é possível buscar vendedores.');
        return;
      }

      console.log('🎯 Empresa código para busca de vendedores:', empresaCodigo);

      // Usando o cliente api importado em vez de fetch diretamente
      try {
        const response = await api.get('/vendedores', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-empresa-codigo': empresaCodigo.toString()
          }
        });

        console.log('🎯 Resposta da API de vendedores:', response);
        
        if (response && response.data) {
          console.log('🎯 Dados dos vendedores recebidos:', response.data);
          
          // Filtrar apenas vendedores ativos (VEN_ATIVO = 1) ou com valor nulo
          const vendedoresAtivos = response.data.filter(vendedor => {
            // Verificar diferentes formatos de campo
            const ativo = vendedor.VEN_ATIVO ?? vendedor.ven_ativo ?? vendedor.ativo;
            
            // Incluir vendedores com VEN_ATIVO = 1 ou com valor nulo/undefined
            const resultado = ativo === 1 || ativo === '1' || ativo === null || ativo === undefined;
            
            if (!resultado) {
              console.log('🎯 Vendedor inativo filtrado:', vendedor);
            }
            return resultado;
          });
          
          console.log('🎯 Total de vendedores:', response.data.length);
          console.log('🎯 Vendedores ativos:', vendedoresAtivos.length);
          
          setVendedores(vendedoresAtivos);
        } else {
          console.error('🎯 Resposta vazia ou sem propriedade data');
        }
      } catch (apiError) {
        console.error('🎯 Erro na chamada à API:', apiError.response ? apiError.response.status : apiError.message);
        console.error('🎯 Detalhes do erro:', apiError);
        
        // Tentativa alternativa com endpoint diferente
        try {
          console.log('🎯 Tentando endpoint alternativo...');
          const altResponse = await api.get('/relatorios/listar_vendedores', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'x-empresa-codigo': empresaCodigo.toString()
            }
          });
          
          if (altResponse && altResponse.data) {
            console.log('🎯 Dados dos vendedores recebidos (alt):', altResponse.data);
            
            // Filtrar apenas vendedores ativos (VEN_ATIVO = 1) ou com valor nulo
            const vendedoresAtivos = altResponse.data.filter(vendedor => {
              // Verificar diferentes formatos de campo
              const ativo = vendedor.VEN_ATIVO ?? vendedor.ven_ativo ?? vendedor.ativo;
              
              // Incluir vendedores com VEN_ATIVO = 1 ou com valor nulo/undefined
              const resultado = ativo === 1 || ativo === '1' || ativo === null || ativo === undefined;
              
              if (!resultado) {
                console.log('🎯 Vendedor inativo filtrado (alt):', vendedor);
              }
              return resultado;
            });
            
            console.log('🎯 Total de vendedores (alt):', altResponse.data.length);
            console.log('🎯 Vendedores ativos (alt):', vendedoresAtivos.length);
            
            setVendedores(vendedoresAtivos);
          }
        } catch (altError) {
          console.error('🎯 Erro também no endpoint alternativo:', altError.message);
        }
      }
    } catch (error) {
      console.error('🎯 Erro geral ao buscar vendedores:', error);
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
    setDadosEmCache(false);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMsg('Token de autenticação não encontrado. Redirecionando para login...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }
      const empresaCodigo = obterEmpresaCodigo();
      if (!empresaCodigo || empresaCodigo === '0' || empresaCodigo === 0) {
        setErrorMsg('Nenhuma empresa válida selecionada. Mostrando seleção de empresa...');
        localStorage.removeItem('empresa');
        localStorage.removeItem('empresa_atual');
        localStorage.removeItem('empresa_selecionada');
        localStorage.removeItem('empresa_detalhes');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }
      // Montar query string com filtros
      const params = new URLSearchParams();
      if (dataInicial && dataFinal) {
        params.append('data_inicial', dataInicial);
        params.append('data_final', dataFinal);
      }
      if (vendedorSelecionado && vendedorSelecionado !== 'todos') {
        params.append('vendedor_codigo', vendedorSelecionado);
      }
      let url = `/relatorios/vendas`;
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      // Chamada usando api (axios)
      const response = await api.get(url);
      const data = response.data;
      let vendas = [];
      if (data.vendas) {
        vendas = data.vendas;
      } else if (Array.isArray(data)) {
        vendas = data;
      }
      setPedidos(vendas);
      saveToCache(vendas);
      setLoading(false);
    } catch (error) {
      let errorDetail = 'Erro desconhecido';
      if (error.response && error.response.data) {
        errorDetail = error.response.data.detail || error.response.data.mensagem || error.message;
      } else if (error.message) {
        errorDetail = error.message;
      }
      setErrorMsg(`Erro ao buscar pedidos: ${errorDetail}`);
      setLoading(false);
    }
  };

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
      resultado = resultado.filter(p => p.autenticacao_data && String(p.autenticacao_data).trim() !== "");
    } else if (filtroAuth === 'nao_autenticadas') {
      resultado = resultado.filter(p => !p.autenticacao_data || String(p.autenticacao_data).trim() === "");
    }
    
    setPedidos(resultado);
  };
  
  // Efeito para atualizar os filtros quando o termo de busca ou filtro de autenticação mudar
  useEffect(() => {
    aplicarFiltros(pedidos, filtros.searchTerm, filtros.filtroAutenticacao);
  }, [filtros.searchTerm, filtros.filtroAutenticacao, pedidos]);

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
          let empresaCodigo = localStorage.getItem('empresa_detalhes');
          if (empresaCodigo) {
            try {
              const empObj = JSON.parse(empresaCodigo);
              empresaCodigo = empObj?.cli_codigo;
            } catch {
              empresaCodigo = null;
            }
          }
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
          if (!empresaCodigo || empresaCodigo === '0' || empresaCodigo === 0) {
            console.error('Nenhuma empresa válida selecionada para buscar itens');
            return;
          }
          // Chamada usando api (axios)
          const response = await api.get(`/relatorios/vendas/${pedidoId}/itens`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'x-empresa-codigo': empresaCodigo.toString(),
              'Content-Type': 'application/json'
            }
          });
          const itens = response.data;
          setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, itens } : p));
        } catch (e) {
          let errorDetail = 'Erro desconhecido';
          if (e.response && e.response.data) {
            errorDetail = e.response.data.detail || e.response.data.mensagem || e.message;
          } else if (e.message) {
            errorDetail = e.message;
          }
          console.error('Erro ao buscar itens:', errorDetail);
          // Opcionalmente mostrar erro para o usuário
        }
      }
    }
  };

  const getStatusBadgeClass = (status) => {
    if (!status) return darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800';
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
        <LoadingSpinner darkMode={darkMode} message="Carregando pedidos..." />
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
            className={`p-2 border rounded ${darkMode ? "bg-gray-800 border-blue-500 font-medium" : "bg-white border-gray-300 text-gray-700"} ${filtroVendedorBloqueado ? 'cursor-not-allowed opacity-90' : ''}`}
            value={vendedorSelecionado}
            onChange={e => setVendedorSelecionado(e.target.value)}
            disabled={filtroVendedorBloqueado}
            title={filtroVendedorBloqueado ? 'Como VENDEDOR, você só pode ver suas próprias vendas' : 'Selecione um vendedor ou "Todos"'}
            style={{
              color: darkMode ? 'white' : '#333', 
              fontWeight: '500',
              background: darkMode ? '#1f2937' : 'white',
              borderWidth: '2px'
            }}
          >
            {!filtroVendedorBloqueado && 
              <option 
                value="" 
                style={{
                  color: darkMode ? 'white' : '#333',
                  background: darkMode ? '#1f2937' : 'white',
                  fontWeight: '500'
                }}
              >
                Todos
              </option>
            }
            {console.log('🎯 Renderizando vendedores:', vendedores)}
            {vendedores && vendedores.length > 0 ? (
              vendedores.map((vendedor, index) => {
                console.log('🎯 Renderizando vendedor:', index, vendedor);
                // Verifica se os campos estão em maiúsculo ou minúsculo
                const codigo = vendedor.VEN_CODIGO || vendedor.ven_codigo || vendedor.codigo || '';
                const nome = vendedor.VEN_NOME || vendedor.ven_nome || vendedor.nome || 'Vendedor ' + codigo;
                
                return (
                  <option 
                    key={codigo || index} 
                    value={codigo}
                    style={{
                      color: darkMode ? 'white' : '#333',
                      background: darkMode ? '#1f2937' : 'white',
                      fontWeight: '500'
                    }}
                  >
                    {nome}
                  </option>
                );
              })
            ) : (
              <option value="" disabled style={{fontStyle: 'italic'}}>Nenhum vendedor encontrado</option>
            )}
          </select>
          {filtroVendedorBloqueado && usuarioAtual && (
            <p className={`text-xs mt-1 ${darkMode ? "text-yellow-400" : "text-yellow-600"}`}>
              🔒 Filtro automático: {usuarioAtual.nivel}
            </p>
          )}
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Autenticação</label>
          <select
            className={`p-2 border rounded ${darkMode ? "bg-gray-800 border-blue-500 font-medium" : "bg-white border-gray-300 text-gray-700"}`}
            value={filtroAutenticacao}
            onChange={e => setFiltroAutenticacao(e.target.value)}
            style={{
              color: darkMode ? 'white' : '#333', 
              fontWeight: '500',
              background: darkMode ? '#1f2937' : 'white',
              borderWidth: '2px'
            }}
          >
            <option 
              value="todas"
              style={{
                color: darkMode ? 'white' : '#333',
                background: darkMode ? '#1f2937' : 'white',
                fontWeight: '500'
              }}
            >
              Todas
            </option>
            <option 
              value="autenticadas"
              style={{
                color: darkMode ? 'white' : '#333',
                background: darkMode ? '#1f2937' : 'white',
                fontWeight: '500'
              }}
            >
              Autenticadas
            </option>
            <option 
              value="nao_autenticadas"
              style={{
                color: darkMode ? 'white' : '#333',
                background: darkMode ? '#1f2937' : 'white',
                fontWeight: '500'
              }}
            >
              Não Autenticadas
            </option>
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
              Resumo: <span className="font-bold">{pedidos.length}</span> pedidos encontrados
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:flex md:gap-4">
            <div className={`p-2 rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              <p className={`text-xs md:text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Autenticadas</p>
              <p className={`text-lg md:text-xl font-bold ${darkMode ? "text-green-300" : "text-green-600"}`}>
                {pedidos.filter(p => p.autenticada).length}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              <p className={`text-xs md:text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Não Autenticadas</p>
              <p className={`text-lg md:text-xl font-bold ${darkMode ? "text-red-300" : "text-red-600"}`}>
                {pedidos.filter(p => !p.autenticada).length}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              <p className={`text-xs md:text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Valor Total</p>
              <p className={`text-lg md:text-xl font-bold ${darkMode ? "text-blue-300" : "text-blue-600"}`}>
                {formatCurrency(pedidos.reduce((total, p) => total + (parseFloat(p.valor_total) || 0), 0))}
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
          value={filtros.searchTerm}
          onChange={(e) => setFiltros(prev => ({ ...prev, searchTerm: e.target.value }))}
        />
      </div>

      {dadosEmCache && (
        <div className={`mb-4 p-2 rounded text-xs font-semibold ${darkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'}`}>Exibindo dados em cache (atualize para buscar do servidor)</div>
      )}

      {/* Versão para desktop */}
      <div className="hidden md:block">
  <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow w-full`}>
    <div className="w-full overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200" style={{minWidth: '1200px'}}>
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
  Tabela
</th>
<th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
  -
</th>
<th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
  Vendedor
</th>
<th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
  Ações
</th>
                

              </tr>
            </thead>
            <tbody className={`${darkMode ? "bg-gray-800" : "bg-white"} divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`} style={{overflowX: 'auto'}} >
              {pedidos.length > 0 ? (
                pedidos.map((pedido) => (
                  <React.Fragment key={pedido.id}>
                    <tr className={darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>#{pedido.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{pedido.cliente_nome || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{pedido.data ? formatDate(pedido.data) : '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
  <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{pedido.autenticacao_data ? formatDate(pedido.autenticacao_data) : '-'}</div>
</td>
<td className="px-6 py-4 whitespace-nowrap">
  {pedido.autenticacao_data && String(pedido.autenticacao_data).trim() !== "" ? (
    <span style={{ color: 'green', fontWeight: 'bold' }}>AUTENTICADA</span>
  ) : (
    <span style={{ color: 'red', fontWeight: 'bold' }}>NÃO AUTENTICADA</span>
  )}
</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(pedido.status || '')}`}>
                          {pedido.status || 'Indefinido'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{pedido.forma_pagamento || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{pedido.tabela_preco || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{pedido.vendedor || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{pedido.valor_total !== undefined ? formatCurrency(pedido.valor_total) : '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          className={darkMode ? "text-blue-400 hover:text-blue-300 mr-3" : "text-blue-600 hover:text-blue-900 mr-3"}
                          onClick={() => togglePedidoDetails(pedido.id)}
                          title={expandedPedido === pedido.id ? 'Ocultar itens' : 'Ver itens'}
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
        </div> {/* fecha div overflow-x-auto */}
      </div> {/* fecha div container visual */}
    </div> {/* fecha div md:block */}
    {/* Versão para dispositivos móveis - cards */}
      <div className="md:hidden">
        {pedidos.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {pedidos.map((pedido) => (
              <div key={pedido.id} className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow p-4`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`text-lg font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>Pedido #{pedido.id}</h3>
                    <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"} mt-1`}>{pedido.cliente_nome || '-'}</p>
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"} mt-1`}>Data: {pedido.data ? formatDate(pedido.data) : '-'}</p>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Autenticação: {pedido.autenticacao_data ? formatDate(pedido.autenticacao_data) : '-'}</p>
                    <p className={`text-xs ${pedido.autenticada ? (darkMode ? 'text-green-300' : 'text-green-800') : (darkMode ? 'text-red-300' : 'text-red-800')}`}>Status: {pedido.autenticada ? 'Autenticada' : 'Não Autenticada'}</p>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Forma Pgto: {pedido.forma_pagamento || '-'}</p>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Vendedor: {pedido.vendedor || '-'}</p>
                  </div>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(pedido.status || '')}`}>
                    {pedido.status || 'Indefinido'}
                  </span>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <div>
                    <span className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase`}>Valor Total:</span>
                    <p className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{pedido.valor_total !== undefined ? formatCurrency(pedido.valor_total) : '-'}</p>
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
                            <span className={darkMode ? "text-white" : "text-gray-900"}>{pedido.valor_total !== undefined ? formatCurrency(pedido.valor_total) : '-'}</span>
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
