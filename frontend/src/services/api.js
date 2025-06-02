import axios from 'axios';

// Função para obter a URL da API baseada no ambiente
const getApiUrl = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // Log para debug
  console.log('Ambiente detectado:', {
    hostname,
    protocol,
    userAgent: navigator.userAgent,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  });

  // Verificar se estamos em localhost (desenvolvimento)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const apiUrl = 'http://localhost:8000';
    console.log('Desenvolvimento local, usando:', apiUrl);
    return apiUrl;
  }
  
  // Se estiver em ngrok (para tunelamento)
  if (hostname.includes('ngrok.io')) {
    // Usar o mesmo protocolo (http ou https)
    const apiUrl = `${protocol}//api.${hostname.split('.').slice(1).join('.')}`;
    console.log('Ngrok detectado, usando:', apiUrl);
    return apiUrl;
  }
  
  // Verificação específica para mendessolucao.site
  if (hostname.includes('mendessolucao.site')) {
    const apiUrl = `${protocol}//api.mendessolucao.site`;
    console.log('Produção Mendes detectada, usando:', apiUrl);
    return apiUrl;
  }

  // Se chegar aqui, estamos em produção (domínio desconhecido)
  // Assumimos que a API está em 'api.' + mesmo domínio
  const apiUrl = `${protocol}//api.${hostname}`;
  console.log('Produção detectada, usando:', apiUrl);
  return apiUrl;
};

// Obter a URL base da API
const API_URL = getApiUrl();

// Criar uma instância do axios com configurações padrão
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptador para adicionar o token em todas as requisições
api.interceptors.request.use(
  (config) => {
    // Adicionar token de autenticação
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Adicionar código da empresa
    const empresaAtual = localStorage.getItem('empresa_atual');
    if (empresaAtual) {
      config.headers['x-empresa-codigo'] = empresaAtual;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptador para tratar erros nas respostas
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Melhorar retry logic com configuração mais conservadora
api.interceptors.response.use(null, async (error) => {
  const config = error.config;
  
  // Não fazer retry para requisições canceladas (AbortController)
  if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
    return Promise.reject(error);
  }
  
  // Se não tiver config ou já tentou 2 vezes (reduzido de 3), rejeita
  if (!config || config.__retryCount >= 2) {
    return Promise.reject(error);
  }
  
  // Só fazer retry para erros de rede ou timeout, não para 4xx/5xx
  const isRetryableError = !error.response || 
    error.response.status >= 500 || 
    error.code === 'ECONNABORTED' ||
    error.code === 'NETWORK_ERROR';
    
  if (!isRetryableError) {
    return Promise.reject(error);
  }
  
  // Incrementa contador de tentativas
  config.__retryCount = config.__retryCount || 0;
  config.__retryCount++;
  
  // Delay mais conservador: 2s, 4s (máximo)
  const delay = Math.min(2000 * config.__retryCount, 4000);
  await new Promise(resolve => setTimeout(resolve, delay));
  
  console.log(`Tentativa ${config.__retryCount} para ${config.url}`);
  
  // Tenta novamente
  return api(config);
});

// Funções para buscar dados de tabelas, vendedores e formas de pagamento
export const getTabelasPreco = async (signal) => {
  const empresaCodigo = localStorage.getItem('empresa_atual');
  return api.get('/relatorios/listar_tabelas', {
    params: {
      search: '',
      empresa: empresaCodigo
    },
    headers: {
      'x-empresa-codigo': empresaCodigo
    },
    signal
  });
};

export const getVendedores = async (signal) => {
  const empresaCodigo = localStorage.getItem('empresa_atual');
  if (!empresaCodigo) {
    console.error('[API] Código da empresa não encontrado no localStorage');
    throw new Error('Código da empresa não encontrado');
  }
  
  console.log('[API] Buscando vendedores para empresa:', empresaCodigo);
  
  try {
    const response = await api.get('/relatorios/listar_vendedores', {
      params: {
        search: '',
        empresa: empresaCodigo
      },
      headers: {
        'x-empresa-codigo': empresaCodigo
      },
      signal
    });
    
    console.log('[API] Resposta da busca de vendedores:', response.data);
    return response;
  } catch (error) {
    console.error('[API] Erro ao buscar vendedores:', error);
    throw error;
  }
};

export const getFormasPagamento = async (signal) => {
  const empresaCodigo = localStorage.getItem('empresa_atual');
  return api.get('/relatorios/listar_formas_pagamento', {
    params: {
      search: '',
      empresa: empresaCodigo
    },
    headers: {
      'x-empresa-codigo': empresaCodigo
    },
    signal
  });
};

// Exportar a instância do axios diretamente
export default api;
