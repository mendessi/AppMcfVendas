// Configuração da API
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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
    dashboard: '/dashboard',
    clientes: '/clientes',
    produtos: '/produtos',
    pedidos: '/pedidos',
    novoPedido: '/novo-pedido'
}; 