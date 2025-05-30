import axios from 'axios';

// Detectar se estamos em acesso externo (Cloudflare ou Ngrok)
const isExternalAccess = 
  window.location.hostname.includes('mendessolucao.site') || 
  window.location.hostname.includes('ngrok.io');

// Detectar se estamos em dispositivo móvel
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
);

// Determinar a URL base da API baseado no ambiente
let API_URL;

// Se estiver acessando externamente, SEMPRE usar o domínio da API
if (isExternalAccess) {
  // Forçar para o domínio da API em produção
  API_URL = 'https://api.mendessolucao.site';
  console.log('Acesso externo detectado, usando API em:', API_URL);
}
// Caso contrário, usar a URL padrão para desenvolvimento local
else {
  // Forçar sempre a porta 8000 para desenvolvimento local
  API_URL = 'http://localhost:8000';
  console.log('Ambiente de desenvolvimento detectado, usando API em:', API_URL);
}

// Log para debugging
console.log(`Configurando API com base URL: ${API_URL} (${window.location.hostname})`);

// Certificar-se de que a URL não termine com uma barra
if (API_URL.endsWith('/')) {
  API_URL = API_URL.slice(0, -1);
}

// Criar uma instância do axios com configurações padrão
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || API_URL,
  timeout: 30000 // Aumentado de 10s para 30s para operações do Firebird
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
  return api.get('/relatorios/listar_vendedores', {
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
