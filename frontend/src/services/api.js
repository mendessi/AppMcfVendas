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

// Se estiver acessando externamente, ajustar a URL para usar o mesmo domínio
if (isExternalAccess) {
  // Usar o mesmo hostname, mas sem caminho adicional
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  API_URL = `${protocol}//${hostname}`;
  console.log('Acesso externo detectado, ajustando URL da API para:', API_URL);
}
// Caso contrário, usar a URL padrão para desenvolvimento local
else {
  // Forçar sempre a porta 8000 para desenvolvimento local
  API_URL = 'http://localhost:8000';
  if (window.location.port && window.location.port !== '8000' && window.location.port !== '3000') {
    console.warn('Atenção: O frontend está rodando na porta ' + window.location.port + ', mas a API deve ser acessada em http://localhost:8000');
  }
  console.log('Ambiente de desenvolvimento detectado, usando URL:', API_URL);
}

// Log para debugging
console.log(`Configurando API com base URL: ${API_URL} (${window.location.hostname})`);

// Certificar-se de que a URL não termine com uma barra
if (API_URL.endsWith('/')) {
  API_URL = API_URL.slice(0, -1);
}

// Criar uma instância do axios com configurações padrão
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Interceptador para adicionar o token em todas as requisições
api.interceptors.request.use(
  config => {
    // Obter o token do localStorage
    const token = localStorage.getItem('token');
    
    // Se o token existir, adicionar ao cabeçalho Authorization
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Obter a empresa atual do localStorage
    const empresaAtualStr = localStorage.getItem('empresa_atual');
    if (empresaAtualStr) {
      try {
        const empresaAtual = JSON.parse(empresaAtualStr);
        // Adicionar o código da empresa ao cabeçalho
        if (empresaAtual && empresaAtual.cli_codigo) {
          config.headers['x-empresa-codigo'] = empresaAtual.cli_codigo.toString();
        }
      } catch (error) {
        console.error('Erro ao processar empresa atual:', error);
      }
    }
    
    return config;
  },
  error => {
    console.error('Erro no interceptador de requisição:', error);
    return Promise.reject(error);
  }
);

// Interceptador para tratar erros nas respostas
api.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    if (error.response && error.response.status === 401) {
      console.warn('Sessão expirada ou token inválido');
    }
    
    if (error.response && error.response.status === 403) {
      console.warn('Acesso negado - verifique as permissões');
    }
    
    if (!error.response) {
      console.error('Erro de conexão - possível problema de CORS ou rede');
    }
    
    console.error('Detalhes do erro API:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
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

// Exportar a instância do axios diretamente
export default api;
