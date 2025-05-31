// Configuração da API
const getApiUrl = () => {
    // Se estamos acessando via Cloudflare Tunnel
    if (window.location.hostname === 'app.mendessolucao.site') {
        return 'https://api.mendessolucao.site';
    }
    // Padrão para desenvolvimento local
    return process.env.REACT_APP_API_URL || 'http://localhost:8000';
};

export const API_URL = getApiUrl();

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