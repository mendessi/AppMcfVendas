import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import { API_URL, AUTH_CONFIG, ROUTES } from './config';

// Ícones
import { FiMenu, FiX, FiHome, FiUsers, FiPackage, FiShoppingCart, FiPlusCircle, FiLogOut, FiMoon, FiSun, FiGrid, FiClipboard } from 'react-icons/fi';
import OrcamentoForm from './OrcamentoForm';
import OrcamentosList from './components/OrcamentosList';

// Componentes
import Dashboard from './components/Dashboard';
import ClientesList from './components/ClientesList';
import ProdutosList from './components/ProdutosList';
import PedidosList from './components/PedidosList';
import NovoPedido from './components/NovoPedido';

import EmpresaSelector from './components/EmpresaSelector';

// Componente principal da aplicação
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

// Componente que contém a lógica da aplicação
function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] = useState(null);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(true); // Modo dark ativado por padrão

  // Verificar se o usuário está logado ao carregar a página
  useEffect(() => {
    // Aplicar modo dark
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Verificar se o usuário já está logado
    const token = localStorage.getItem(AUTH_CONFIG.tokenKey);
    const user = JSON.parse(localStorage.getItem(AUTH_CONFIG.userKey));
    
    // Verificar se há uma empresa selecionada
    const empresaAtual = localStorage.getItem('empresa_atual');
    const empresaDetalhes = localStorage.getItem('empresa_detalhes');

    if (token && user) {
      // VERIFICAR SE OS DADOS DO USUÁRIO ESTÃO COMPLETOS (COM NÍVEL)
      if (!user.nivel) {
        console.log('Dados do usuário estão incompletos (sem nível). Forçando novo login...');
        // Limpar dados antigos e forçar novo login
        localStorage.removeItem(AUTH_CONFIG.tokenKey);
        localStorage.removeItem(AUTH_CONFIG.userKey);
        localStorage.removeItem('usuario_id');
        localStorage.removeItem('usuario_nome');
        localStorage.removeItem(AUTH_CONFIG.empresaKey);
        localStorage.removeItem('empresa_detalhes');
        setUser(null);
        setIsLoggedIn(false);
        setEmpresaSelecionada(null);
        return;
      }
      
      console.log('Usuário já está logado:', user);
      setUser(user);
      setIsLoggedIn(true);
      
      // Configurar o token no header padrão para requisições
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      if (empresaAtual) {
        // Configurar o header com o código da empresa
        axios.defaults.headers.common['x-empresa-codigo'] = empresaAtual;
        
        // Se precisar dos detalhes da empresa, usar o objeto salvo
        if (empresaDetalhes) {
          try {
            const detalhes = JSON.parse(empresaDetalhes);
            setEmpresaSelecionada(detalhes);
          } catch (error) {
            console.error('Erro ao carregar detalhes da empresa:', error);
          }
        }
      }
    }
  }, [darkMode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        console.log('Tentando login na API:', `${API_URL}${ROUTES.login}`);
        
        // Usar axios para o login - simplificando para resolver problemas de conexão
        const response = await axios.post(`${API_URL}${ROUTES.login}`, {
            email: username,
            senha: password
        }, {
            // Remover withCredentials para simplificar o processo
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // Axios já retorna os dados no formato JSON
        const data = response.data;
        console.log('Resposta de login:', data);
        
        if (!data.access_token) {
            throw new Error('Token de acesso não recebido');
        }
        
        localStorage.setItem(AUTH_CONFIG.tokenKey, data.access_token);
        localStorage.setItem('usuario_id', data.usuario_id);
        localStorage.setItem('usuario_nome', data.usuario_nome);
        
        const userData = {
            id: data.usuario_id,
            name: data.usuario_nome,
            username: username,
            nivel: data.usuario_nivel,
            codigo_vendedor: data.codigo_vendedor || null
        };
        
        console.log('Dados do usuário:', userData);
        
        setUser(userData);
        setIsLoggedIn(true);
        localStorage.setItem(AUTH_CONFIG.userKey, JSON.stringify(userData));
        console.log('Login bem-sucedido, token armazenado');
    } catch (err) {
        console.error('Erro durante o login:', err);
        
        // Tratar erros do axios de forma mais detalhada
        if (err.response) {
            // O servidor respondeu com um status de erro
            const errorMsg = err.response.data.detail || err.response.data.message || 'Erro de autenticação';
            console.error('Erro do servidor:', errorMsg, 'Status:', err.response.status);
            setError(errorMsg);
        } else if (err.request) {
            // A requisição foi feita mas não houve resposta (CORS ou problemas de rede)
            console.error('Sem resposta do servidor:', err.request);
            setError('Não foi possível conectar ao servidor. Verifique sua conexão ou contate o suporte.');
        } else {
            // Erro na configuração da requisição
            console.error('Erro na requisição:', err.message);
            setError(err.message || 'Erro ao fazer login. Verifique suas credenciais e tente novamente.');
        }
    } finally {
        setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
    setEmpresaSelecionada(null);
    localStorage.removeItem(AUTH_CONFIG.tokenKey);
    localStorage.removeItem('usuario_id');
    localStorage.removeItem('usuario_nome');
    localStorage.removeItem(AUTH_CONFIG.userKey);
    localStorage.removeItem(AUTH_CONFIG.empresaKey);
  };

  const handleSelectEmpresa = (empresa) => {
    console.log('Empresa selecionada no App:', empresa);
    setEmpresaSelecionada(empresa);
    
    // Armazenar o código da empresa em todos os formatos esperados
    const empresaCodigo = empresa.cli_codigo.toString();
    localStorage.setItem(AUTH_CONFIG.empresaKey, empresaCodigo);
    localStorage.setItem('empresa', empresaCodigo);
    localStorage.setItem('empresa_atual', empresaCodigo);
    localStorage.setItem('empresa_selecionada', empresaCodigo);
    
    // Armazenar os detalhes completos da empresa em uma chave separada
    localStorage.setItem('empresa_detalhes', JSON.stringify(empresa));
    
    // Configurar o axios com o token e o código da empresa
    const token = localStorage.getItem(AUTH_CONFIG.tokenKey);
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.defaults.headers.common['x-empresa-codigo'] = empresaCodigo;
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Variáveis para controlar o fluxo de navegação
  const isFullyAuthenticated = isLoggedIn && empresaSelecionada;
  
  // Tela de Login
  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-8 rounded-lg shadow-md w-full max-w-md`}>
          {/* Logo da Empresa */}
          <div className="flex justify-center items-center mb-6">
            <img 
              src={darkMode ? "/images/logo-escuro.png" : "/images/logo-claro.png"}
              alt="Logo da Empresa"
              className="max-w-[250px] max-h-[100px] w-auto h-auto object-contain transition-opacity duration-300"
              onError={(e) => {
                e.target.style.display = 'none';
                // Se não encontrar a imagem, mostrar um texto alternativo
                const parent = e.target.parentElement;
                if (!parent.querySelector('.logo-fallback')) {
                  const fallback = document.createElement('div');
                  fallback.className = `logo-fallback text-center font-bold text-2xl ${darkMode ? 'text-green-400' : 'text-green-600'}`;
                  fallback.textContent = 'VISÃO360';
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
          
          <div className="text-center mb-6">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'} mb-2`}>
              Bem-vindo ao Visão360
            </h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Faça login para acessar sua área
            </p>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className={`block ${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm font-bold mb-2`} htmlFor="username">
                Usuário
              </label>
              <input
                id="username"
                type="text"
                className={`shadow appearance-none border rounded w-full py-2 px-3 ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-700'} leading-tight focus:outline-none focus:shadow-outline`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            
            <div className="mb-6">
              <label className={`block ${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm font-bold mb-2`} htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                type="password"
                className={`shadow appearance-none border rounded w-full py-2 px-3 ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-700'} leading-tight focus:outline-none focus:shadow-outline`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className={`${loading ? 'opacity-50 cursor-not-allowed' : ''} w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline`}
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <button
              onClick={toggleDarkMode}
              className={`text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
            >
              {darkMode ? <FiSun className="inline mr-1" /> : <FiMoon className="inline mr-1" />}
              {darkMode ? 'Modo Claro' : 'Modo Escuro'}
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Se o usuário está logado mas não selecionou empresa, mostrar o seletor de empresas
  if (isLoggedIn && !empresaSelecionada) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Selecione uma Empresa</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-md ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
              >
                {darkMode ? <FiSun className="h-5 w-5" /> : <FiMoon className="h-5 w-5" />}
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md flex items-center"
              >
                <FiLogOut className="mr-2" />
                Sair
              </button>
            </div>
          </div>
          <EmpresaSelector onSelectEmpresa={handleSelectEmpresa} darkMode={darkMode} />
        </div>
      </div>
    );
  }
  
  // Aplicativo principal após o login e seleção de empresa
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-800'}`}>
      {/* Barra superior */}
      <header className={`fixed top-0 left-0 right-0 z-10 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className={`p-2 rounded-md ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            >
              {sidebarOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
            </button>
            <h1 className="ml-4 text-xl font-semibold">Força de Vendas</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="inline-block">
              {user?.username && (
                <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2`}>
                  <span className="truncate max-w-[120px] sm:max-w-none">{user.username}</span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                    user?.nivel === 'VENDEDOR' 
                      ? darkMode ? 'bg-green-700 text-green-200' : 'bg-green-100 text-green-800'
                      : user?.nivel === 'MASTER' || user?.nivel === 'admin'
                      ? darkMode ? 'bg-blue-700 text-blue-200' : 'bg-blue-100 text-blue-800'
                      : darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
                  }`}>
                    Nível: {user?.nivel || 'N/A'}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-md ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            >
              {darkMode ? <FiSun className="h-5 w-5" /> : <FiMoon className="h-5 w-5" />}
            </button>
            <button
              onClick={handleLogout}
              className={`p-2 rounded-md ${darkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-200 text-red-600'}`}
            >
              <FiLogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex pt-14">
        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 z-30 transition duration-300 ease-in-out ${darkMode ? 'bg-gray-800' : 'bg-white'} pt-14 w-64 shadow-lg`}
        >
          <div className="h-full overflow-y-auto py-4 px-3 flex flex-col justify-between">
            <div className="space-y-8">
              {/* Logo da Empresa */}
              <div className="flex justify-center items-center py-4">
                <img 
                  src={darkMode ? "/images/logo-escuro.png" : "/images/logo-claro.png"}
                  alt="Logo da Empresa"
                  className="max-w-[200px] max-h-[80px] w-auto h-auto object-contain transition-opacity duration-300"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    // Se não encontrar a imagem, mostrar um texto alternativo
                    const parent = e.target.parentElement;
                    if (!parent.querySelector('.logo-fallback')) {
                      const fallback = document.createElement('div');
                      fallback.className = `logo-fallback text-center font-bold text-lg ${darkMode ? 'text-blue-400' : 'text-blue-600'}`;
                      fallback.textContent = 'LOGO';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              </div>
              
              <div>
                <div className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-2">Empresa</div>
                <div className={`px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="font-medium">{empresaSelecionada?.cli_nome}</div>
                  <div className="text-sm text-gray-500">Código: {empresaSelecionada?.cli_codigo}</div>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-2">Menu</div>
                <ul>
                  <li className="mb-2">
                    <Link 
                      to="/" 
                      className={`flex items-center px-4 py-3 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300 hover:text-white' : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'}`}
                      onClick={() => window.innerWidth < 768 && toggleSidebar()}
                    >
                      <FiHome className="mr-3 h-5 w-5" />
                      <span>Dashboard</span>
                    </Link>
                  </li>
                  <li className="mb-2">
                    <Link 
                      to="/clientes" 
                      className={`flex items-center px-4 py-3 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300 hover:text-white' : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'}`}
                      onClick={() => window.innerWidth < 768 && toggleSidebar()}
                    >
                      <FiUsers className="mr-3 h-5 w-5" />
                      <span>Clientes</span>
                    </Link>
                  </li>
                  <li className="mb-2">
                    <Link 
                      to="/produtos" 
                      className={`flex items-center px-4 py-3 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300 hover:text-white' : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'}`}
                      onClick={() => window.innerWidth < 768 && toggleSidebar()}
                    >
                      <FiPackage className="mr-3 h-5 w-5" />
                      <span>Produtos</span>
                    </Link>
                  </li>
                  <li className="mb-2">
                    <Link 
                      to="/pedidos" 
                      className={`flex items-center px-4 py-3 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300 hover:text-white' : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'}`}
                      onClick={() => window.innerWidth < 768 && toggleSidebar()}
                    >
                      <FiShoppingCart className="mr-3 h-5 w-5" />
                      <span>Listar Vendas</span>
                    </Link>
                  </li>
                  <li className="mb-2">
                    <Link 
                      to="/novo-pedido" 
                      className={`flex items-center px-4 py-3 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300 hover:text-white' : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'}`}
                      onClick={() => window.innerWidth < 768 && toggleSidebar()}
                    >
                      <FiPlusCircle className="mr-3 h-5 w-5" />
                      <span>Nova Venda</span>
                    </Link>
                  </li>
                  <li className="mb-2">
                    <Link 
                      to="/orcamento" 
                      className={`flex items-center px-4 py-3 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300 hover:text-white' : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'}`}
                      onClick={() => window.innerWidth < 768 && toggleSidebar()}
                    >
                      <FiClipboard className="mr-3 h-5 w-5" />
                      <span>Orçamento</span>
                    </Link>
                  </li>
                  <li className="mb-2">
                    <Link 
                      to="/orcamentos" 
                      className={`flex items-center px-4 py-3 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300 hover:text-white' : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'}`}
                      onClick={() => window.innerWidth < 768 && toggleSidebar()}
                    >
                      <FiClipboard className="mr-3 h-5 w-5" />
                      <span>Listar Orçamentos</span>
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'ml-0'}`}>
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Dashboard user={user} darkMode={darkMode} empresaSelecionada={empresaSelecionada} />} />
              <Route path="/clientes" element={<ClientesList darkMode={darkMode} empresaSelecionada={empresaSelecionada} />} />
              <Route path="/produtos" element={<ProdutosList darkMode={darkMode} empresaSelecionada={empresaSelecionada} />} />
              <Route path="/pedidos" element={<PedidosList darkMode={darkMode} empresaSelecionada={empresaSelecionada} />} />
              <Route path="/novo-pedido" element={<NovoPedido darkMode={darkMode} empresaSelecionada={empresaSelecionada} />} />
              <Route path="/orcamento" element={<OrcamentoForm darkMode={darkMode} />} />
              <Route path="/orcamentos" element={<OrcamentosList darkMode={darkMode} />} />
              
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>

          {/* Rodapé */}
          <footer className={`${darkMode ? 'bg-gray-800' : 'bg-gray-200'} text-${darkMode ? 'white' : 'gray-800'} py-3 sm:py-4 mt-auto text-xs sm:text-sm`}>
            <div className="container mx-auto px-4 text-center">
              <p>&copy; {new Date().getFullYear()} Solução Informática Todos os direitos reservados</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
