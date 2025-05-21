import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import './App.css';

// Ícones
import { FiMenu, FiX, FiHome, FiUsers, FiPackage, FiShoppingCart, FiPlusCircle, FiLogOut, FiMoon, FiSun, FiGrid } from 'react-icons/fi';

// Componentes
import Dashboard from './components/Dashboard';
import ClientesList from './components/ClientesList';
import ProdutosList from './components/ProdutosList';
import PedidosList from './components/PedidosList';
import NovoPedido from './components/NovoPedido';
import CatalogoProdutos from './components/CatalogoProdutos';
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
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    const empresaAtual = JSON.parse(localStorage.getItem('empresa_atual'));
    
    if (token && user) {
      console.log('Usuário já está logado:', user);
      setUser(user);
      setIsLoggedIn(true);
      
      // Se já tiver uma empresa selecionada, definir o estado
      if (empresaAtual) {
        console.log('Empresa já selecionada:', empresaAtual);
        setEmpresaSelecionada(empresaAtual);
      }
    }
  }, [darkMode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      console.log('Tentando login na API:', `${API_URL}/login`);
      
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email: username,
          senha: password
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Erro ao fazer login' }));
        throw new Error(errorData.detail || 'Erro ao fazer login');
      }
      
      const data = await response.json();
      console.log('Resposta do login:', data);
      
      // Armazenar o token e dados do usuário
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('usuario_id', data.usuario_id);
      localStorage.setItem('usuario_nome', data.usuario_nome);
      localStorage.setItem('usuario_nivel', data.usuario_nivel);
      
      const userData = {
        id: data.usuario_id,
        name: data.usuario_nome,
        email: username,
        nivel: data.usuario_nivel,
        empresas: data.empresas || []
      };
      
      setUser(userData);
      setIsLoggedIn(true);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Se tiver empresas, mostrar o seletor
      if (data.empresas && data.empresas.length > 0) {
        console.log('Empresas disponíveis:', data.empresas);
      }
      
      console.log('Login bem-sucedido, token armazenado');
    } catch (err) {
      console.error('Erro durante o login:', err);
      setError(err.message || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
    setEmpresaSelecionada(null);
    localStorage.removeItem('token');
    localStorage.removeItem('usuario_id');
    localStorage.removeItem('usuario_nome');
    localStorage.removeItem('user');
    localStorage.removeItem('empresa_atual');
  };

  const handleSelectEmpresa = (empresa) => {
    setEmpresaSelecionada(empresa);
    localStorage.setItem('empresa_atual', JSON.stringify(empresa));
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Tela de Login
  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-8 rounded-lg shadow-md w-full max-w-md`}>
          <h2 className={`text-2xl font-bold text-center ${darkMode ? 'text-blue-400' : 'text-blue-600'} mb-6`}>Força de Vendas</h2>
          
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
  if (!empresaSelecionada) {
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
            <span className="hidden md:inline-block">{user?.name}</span>
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
                      <span>Pedidos</span>
                    </Link>
                  </li>
                  <li className="mb-2">
                    <Link 
                      to="/novo-pedido" 
                      className={`flex items-center px-4 py-3 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300 hover:text-white' : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'}`}
                      onClick={() => window.innerWidth < 768 && toggleSidebar()}
                    >
                      <FiPlusCircle className="mr-3 h-5 w-5" />
                      <span>Novo Pedido</span>
                    </Link>
                  </li>
                  <li className="mb-2">
                    <Link 
                      to="/catalogo" 
                      className={`flex items-center px-4 py-3 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300 hover:text-white' : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'}`}
                      onClick={() => window.innerWidth < 768 && toggleSidebar()}
                    >
                      <FiGrid className="mr-3 h-5 w-5" />
                      <span>Catálogo</span>
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
              <Route path="/" element={<Dashboard user={user} darkMode={darkMode} />} />
              <Route path="/clientes" element={<ClientesList darkMode={darkMode} />} />
              <Route path="/produtos" element={<ProdutosList darkMode={darkMode} />} />
              <Route path="/pedidos" element={<PedidosList darkMode={darkMode} />} />
              <Route path="/novo-pedido" element={<NovoPedido darkMode={darkMode} />} />
              <Route path="/catalogo" element={<CatalogoProdutos darkMode={darkMode} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>

          {/* Rodapé */}
          <footer className={`${darkMode ? 'bg-gray-800' : 'bg-gray-200'} text-${darkMode ? 'white' : 'gray-800'} py-3 sm:py-4 mt-auto text-xs sm:text-sm`}>
            <div className="container mx-auto px-4 text-center">
              <p>&copy; {new Date().getFullYear()} Força de Vendas - Todos os direitos reservados</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
