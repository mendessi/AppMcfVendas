// Configuração da API
const getApiUrl = () => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Verificar se estamos em localhost (desenvolvimento)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8000';
    }
    
    // Verificação específica para mendessolucao.site
    if (hostname.includes('mendessolucao.site')) {
        return `${protocol}//api.mendessolucao.site`;
    }
    
    // Se chegar aqui, estamos em produção (domínio desconhecido)
    // Assumimos que a API está em 'api.' + mesmo domínio
    return `${protocol}//api.${hostname}`;
};

export const API_URL = getApiUrl();

// Versão do aplicativo (incrementar após cada deploy)
export const APP_VERSION = '5.5.0.1';

// Configuração de atualização
export const UPDATE_CONFIG = {
    versionKey: 'app_version',
    lastCheckKey: 'version_last_check',
    checkInterval: 3600000 // 1 hora em milissegundos
};

// Configuração de autenticação
export const AUTH_CONFIG = {
    tokenKey: 'token',
    userKey: 'user',
    empresaKey: 'empresa_atual'
};

// Configuração de rotas
export const ROUTES = {
    login: '/login',
    empresas: '/empresas',
    buscarCodigoVendedor: '/buscar-codigo-vendedor',
    dashboard: '/dashboard',
    clientes: '/clientes',
    produtos: '/produtos',
    pedidos: '/pedidos',
    novoPedido: '/novo-pedido'
}; 