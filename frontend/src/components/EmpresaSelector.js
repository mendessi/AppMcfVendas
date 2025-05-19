import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const EmpresaSelector = ({ onSelectEmpresa, darkMode = true }) => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  // URL da API - Usando a nova API Flask
  const API_URL = 'http://localhost:5000';
  console.log('API_URL:', API_URL);

  useEffect(() => {
    // Verificar se o usuário está autenticado
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user) {
      console.log('Nenhum token ou usuário encontrado, redirecionando para login');
      navigate('/login');
      return;
    }
    
    // Busca as empresas do usuário logado
    const fetchEmpresas = async () => {
      try {
        console.log('Tentando buscar empresas de:', `${API_URL}/empresas`);
        
        // Usar o token armazenado no localStorage
        const token = localStorage.getItem('token');
        
        // Buscar as empresas usando fetch
        const response = await fetch(`${API_URL}/empresas`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Verificar se a resposta foi bem-sucedida
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Sessão expirada ou inválida. Por favor, faça login novamente.');
          }
          throw new Error(`Erro ao buscar empresas: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Resposta da API:', data);
        
        // A API já retorna os dados no formato correto
        setEmpresas(data);
      } catch (err) {
        console.error('Erro ao buscar empresas:', err);
        
        if (err.response && err.response.status === 401) {
          // Não autenticado
          console.log('Erro 401: Não autenticado');
          setError('Sessão expirada ou inválida. Por favor, faça login novamente.');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        } else {
          setError(`Erro ao carregar empresas: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresas();
  }, [navigate, API_URL]);

  const handleEmpresaSelect = async (empresa) => {
    try {
      // Verifica se a empresa está bloqueada
      if (empresa.cli_bloqueadoapp === 'S') {
        setError(empresa.cli_mensagem || 'Esta empresa está bloqueada para acesso.');
        return;
      }

      // Usar o token armazenado no localStorage
      const token = localStorage.getItem('token');
      
      // Chamar a API para selecionar a empresa
      // Mapear os campos da empresa para os nomes esperados pela API
      const dadosEmpresa = {
        empresa_codigo: empresa.cli_codigo,
        empresa_nome: empresa.cli_nome,
        cli_bloqueadoapp: empresa.cli_bloqueadoapp,
        cli_mensagem: empresa.cli_mensagem,
        cli_caminho_base: empresa.cli_caminho_base,
        cli_ip_servidor: empresa.cli_ip_servidor,
        cli_nome_base: empresa.cli_nome_base,
        cli_porta: empresa.cli_porta
      };
      
      console.log('Enviando dados da empresa:', dadosEmpresa);
      
      const response = await fetch(`${API_URL}/selecionar-empresa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dadosEmpresa)
      });
      
      // Verificar se a resposta foi bem-sucedida
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.detail || 'Erro ao selecionar empresa');
      }
      
      const data = await response.json();
      console.log('Empresa selecionada com sucesso:', data);
      
      // Notificar o componente pai que a empresa foi selecionada
      if (onSelectEmpresa) {
        onSelectEmpresa(empresa);
      } else {
        console.warn('onSelectEmpresa não foi fornecido como prop');
      }
      
      // Armazena os dados da empresa selecionada localmente
      localStorage.setItem('empresa_atual', JSON.stringify(empresa));
      
      // Registrar no console que estamos entrando no sistema
      console.log(`Entrando no sistema com a empresa: ${empresa.cli_nome}`);

      // Redirecionar diretamente para o dashboard sem mostrar alerta
      navigate('/');
    } catch (err) {
      console.error('Erro ao selecionar empresa:', err);
      setError(err.message || 'Erro ao selecionar empresa. Tente novamente.');
    }
  };



  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mb-4"></div>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-lg`}>Carregando empresas...</p>
      </div>
    );
  }

  // Esta declaração foi removida para evitar duplicação

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} py-12 px-4 sm:px-6 lg:px-8`}>
      <div className={`max-w-md mx-auto ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md overflow-hidden`}>
        <div className="px-4 py-5 sm:px-6 bg-blue-600">
          <h2 className="text-lg font-medium text-white">Selecione uma Empresa</h2>
          <p className="mt-1 text-sm text-blue-100">Escolha a empresa para continuar</p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-4 mt-4">
            {error}
          </div>
        )}
        
        <div className="px-4 py-5 sm:p-6">
          {empresas.length === 0 ? (
            <div className="text-center py-4">
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Nenhuma empresa disponível para este usuário.</p>
            </div>
          ) : (
            <ul className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {empresas.map((empresa) => (
                <li key={empresa.cli_codigo} className="py-4">
                  <button
                    onClick={() => handleEmpresaSelect(empresa)}
                    disabled={empresa.cli_bloqueadoapp === 'S'}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${empresa.cli_bloqueadoapp === 'S' 
                      ? `${darkMode ? 'bg-gray-700' : 'bg-gray-100'} cursor-not-allowed` 
                      : `${darkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-50'} focus:outline-none focus:ring-2 focus:ring-blue-500`}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{empresa.cli_nome}</h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Código: {empresa.cli_codigo}</p>
                      </div>
                      {empresa.cli_bloqueadoapp === 'S' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Bloqueado
                        </span>
                      ) : (
                        <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    {empresa.cli_bloqueadoapp === 'S' && empresa.cli_mensagem && (
                      <div className="mt-2 text-sm text-red-600">
                        {empresa.cli_mensagem}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className={`px-4 py-4 sm:px-6 ${darkMode ? 'bg-gray-700 border-t border-gray-600' : 'bg-gray-50 border-t border-gray-200'}`}>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('usuario_id');
              localStorage.removeItem('usuario_nome');
              localStorage.removeItem('usuario_nivel');
              localStorage.removeItem('user');
              localStorage.removeItem('empresa');
              localStorage.removeItem('empresa_atual');
              // Usar redirecionamento direto em vez de navigate
              window.location.href = '/';
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmpresaSelector;
