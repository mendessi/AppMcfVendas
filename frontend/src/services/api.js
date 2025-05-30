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
  timeout: 10000
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

// Adicionar retry logic para melhorar performance em mobile
api.interceptors.response.use(null, async (error) => {
  const config = error.config;
  
  // Se não tiver config ou já tentou 3 vezes, rejeita
  if (!config || config.__retryCount >= 3) {
    return Promise.reject(error);
  }
  
  // Incrementa contador de tentativas
  config.__retryCount = config.__retryCount || 0;
  config.__retryCount++;
  
  // Espera um tempo exponencial antes de tentar novamente
  const delay = Math.min(1000 * Math.pow(2, config.__retryCount), 10000);
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Tenta novamente
  return api(config);
});

// Funções para buscar dados de tabelas, vendedores e formas de pagamento
export const getTabelasPreco = async () => {
  const empresaCodigo = localStorage.getItem('empresa_atual');
  return api.get('/relatorios/listar_tabelas', {
    params: {
      search: '',
      empresa: empresaCodigo
    },
    headers: {
      'x-empresa-codigo': empresaCodigo
    }
  });
};

export const getVendedores = async () => {
  const empresaCodigo = localStorage.getItem('empresa_atual');
  return api.get('/relatorios/listar_vendedores', {
    params: {
      search: '',
      empresa: empresaCodigo
    },
    headers: {
      'x-empresa-codigo': empresaCodigo
    }
  });
};

export const getFormasPagamento = async () => {
  const empresaCodigo = localStorage.getItem('empresa_atual');
  return api.get('/relatorios/listar_formas_pagamento', {
    params: {
      search: '',
      empresa: empresaCodigo
    },
    headers: {
      'x-empresa-codigo': empresaCodigo
    }
  });
};

// Exportar a instância do axios diretamente
export default api;
