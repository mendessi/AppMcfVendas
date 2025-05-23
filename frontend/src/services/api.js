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
  API_URL = 'http://localhost:8000';
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
  timeout: 15000, // 15 segundos
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
  // Removemos withCredentials global para permitir login local
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
    
    // Detectar se estamos em acesso externo (Cloudflare ou Ngrok)
    const isExternalAccess = 
      window.location.hostname.includes('mendessolucao.site') || 
      window.location.hostname.includes('ngrok.io');
    
    // Detectar se estamos em dispositivo móvel
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    
    // Adicionar cabeçalhos adicionais para acesso externo ou móvel
    if (isExternalAccess || isMobile) {
      config.headers['x-external-access'] = 'true';
      config.headers['x-mobile-device'] = isMobile ? 'true' : 'false';
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
    // Retornar a resposta normalmente se não houver erro
    return response;
  },
  error => {
    // Se o erro for 401 (não autorizado), pode ser que o token expirou
    if (error.response && error.response.status === 401) {
      console.warn('Sessão expirada ou token inválido');
      
      // Opcionalmente, redirecionar para a página de login
      // window.location.href = '/login';
    }
    
    // Se o erro for 403 (proibido), pode ser problema de permissão
    if (error.response && error.response.status === 403) {
      console.warn('Acesso negado - verifique as permissões');
    }
    
    // Se o erro for de conexão, pode ser problema de rede ou CORS
    if (!error.response) {
      console.error('Erro de conexão - possível problema de CORS ou rede');
    }
    
    // Log detalhado do erro para depuração
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

// Funções auxiliares para operações comuns
const apiService = {
  // Login
  login: async (email, senha) => {
    try {
      console.log(`Tentando login com email: ${email} na URL: ${API_URL}`);
      
      // Opções específicas para login que garantem compatibilidade local e externa
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        // Não usar withCredentials para login
        withCredentials: false
      };
      
      const response = await api.post('/login', { email, senha }, config);
      console.log('Login bem-sucedido:', response.status);
      return response.data;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      // Log detalhado para depuração
      if (error.response) {
        console.error('Resposta de erro:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      } else if (error.request) {
        console.error('Sem resposta do servidor:', error.request);
      }
      throw error;
    }
  },
  
  // Obter lista de empresas
  getEmpresas: async (useMobileEndpoint = false) => {
    try {
      // Detectar se estamos em acesso externo
      const isExternalAccess = 
        window.location.hostname.includes('mendessolucao.site') || 
        window.location.hostname.includes('ngrok.io');
      
      // Determinar endpoint correto com base no tipo de acesso
      let endpoint;
      if (isExternalAccess) {
        // Para acesso externo via Cloudflare, usar o endpoint específico
        endpoint = '/external/empresas';
        console.log('Usando endpoint externo para empresas');
      } else if (useMobileEndpoint) {
        // Para dispositivos móveis em acesso local
        endpoint = '/empresas-mobile';
      } else {
        // Acesso local padrão
        endpoint = '/empresas';
      }
      
      console.log(`Buscando empresas no endpoint: ${endpoint}`);
      
      // Adicionar headers específicos para garantir acesso
      const config = {
        headers: {
          'Accept': 'application/json',
        }
      };
      
      const response = await api.get(endpoint, config);
      console.log(`Empresas obtidas com sucesso: ${response.data.length || 0}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      
      // Sequência de fallbacks se o endpoint principal falhar
      try {
        // Primeiro fallback: tentar o endpoint externo se não estávamos usando
        if (!window.location.hostname.includes('mendessolucao.site')) {
          console.log('Tentando endpoint externo /external/empresas como fallback');
          const response = await api.get('/external/empresas');
          return response.data;
        }
        
        // Segundo fallback: endpoint de teste
        console.log('Tentando endpoint alternativo /teste-empresa/listar');
        const response = await api.get('/teste-empresa/listar');
        return response.data;
      } catch (fallbackError) {
        console.error('Erro em todos os endpoints alternativos:', fallbackError);
        throw fallbackError;
      }
    }
  },
  
  // Selecionar empresa
  selectEmpresa: async (empresa) => {
    try {
      console.log('Tentando selecionar empresa:', empresa.cli_codigo);
      
      // Configurar empresa para o formato esperado pelo backend
      const empresaData = {
        cli_codigo: parseInt(empresa.cli_codigo, 10),
        cli_nome: empresa.cli_nome || '',
        cli_bloqueadoapp: empresa.cli_bloqueadoapp || 'N',
        cli_mensagem: empresa.cli_mensagem || '',
        cli_caminho_base: empresa.cli_caminho_base || '',
        cli_ip_servidor: empresa.cli_ip_servidor || '127.0.0.1',
        cli_nome_base: empresa.cli_nome_base || '',
        cli_porta: empresa.cli_porta || '3050'
      };
      
      // Armazenar empresa selecionada no localStorage primeiro (para caso de falha)
      localStorage.setItem('empresa_atual', JSON.stringify(empresa));
      console.log('Empresa armazenada localmente com sucesso');

      // Configurar cabeçalhos mais simples para evitar problemas de CORS
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'x-empresa-codigo': empresa.cli_codigo.toString()
        },
        // Desativar withCredentials para evitar problemas de CORS
        withCredentials: false
      };
      
      // Tentar selecionar empresa com endpoint padrão
      try {
        console.log('Tentando endpoint padrão /selecionar-empresa');
        const response = await api.post('/selecionar-empresa', empresaData, config);
        console.log('Empresa selecionada com sucesso via endpoint padrão');
        return response.data;
      } catch (endpointError) {
        console.warn('Falha no endpoint padrão, tentando alternativa:', endpointError.message);
        
        // Se falhar, tentar o endpoint simplificado
        try {
          console.log('Tentando endpoint alternativo /teste-selecionar');
          const response = await api.post('/teste-selecionar', empresaData, config);
          console.log('Empresa selecionada com sucesso via endpoint alternativo');
          return response.data;
        } catch (fallbackError) {
          console.error('Falha também no endpoint alternativo:', fallbackError.message);
          throw fallbackError;
        }
      }
    } catch (error) {
      console.error('Erro ao selecionar empresa:', error);
      // Log detalhado para depuração
      if (error.response) {
        console.error('Resposta de erro:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      } else if (error.request) {
        console.error('Sem resposta, problema de rede ou CORS:', error.request);
      }
      
      // Mesmo com erro, vamos redirecionar com a empresa já salva no localStorage
      console.log('Redirecionando para dashboard mesmo com erro de API (empresa já está no localStorage)');
      return { 
        sucesso: true, 
        mensagem: "Empresa selecionada localmente (modo offline)",
        empresa: empresa
      };
    }
  },
  
  // Testar conexão com a empresa
  testConnection: async (empresa) => {
    try {
      const response = await api.post('/teste-conexao', empresa);
      return response.data;
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      throw error;
    }
  },
  
  // Testar SQL da empresa
  testSQL: async (empresa) => {
    try {
      const response = await api.post('/teste-sql', empresa);
      return response.data;
    } catch (error) {
      console.error('Erro ao testar SQL:', error);
      throw error;
    }
  },
  
  // Obter informações da empresa atual
  getEmpresaInfo: async () => {
    try {
      const response = await api.get('/empresa-info');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar informações da empresa:', error);
      throw error;
    }
  },
  
  // Obter relatório de top clientes
  getTopClientes: async (dataInicial, dataFinal) => {
    try {
      const response = await api.get(`/relatorios/top-clientes?data_inicial=${dataInicial}&data_final=${dataFinal}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar top clientes:', error);
      throw error;
    }
  }
};

export default apiService;
