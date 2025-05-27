import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const EmpresaSelector = ({ onSelectEmpresa, darkMode = true }) => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState(null);
  const [testingSql, setTestingSql] = useState(false);
  const [sqlResult, setSqlResult] = useState(null);
  const [selectedEmpresaForTest, setSelectedEmpresaForTest] = useState(null);
  const navigate = useNavigate();
  
  // URL da API - Usando a nova API Flask
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
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
        
        // Configurar o cabeçalho de autorização para o axios
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Buscar as empresas usando axios com URLs completas
        const response = await axios.get(`${API_URL}/empresas`);
        
        // Os dados já estão no formato JSON com axios
        const data = response.data;
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

  const handleTestConnection = async (empresa, e) => {
    e.preventDefault(); // Impede que o clique propague para o botão de selecionar empresa
    e.stopPropagation();
    
    try {
      setTestingConnection(true);
      setConnectionResult(null);
      setSelectedEmpresaForTest(empresa.cli_codigo);
      setError('');
      
      // Usar o token armazenado no localStorage
      const token = localStorage.getItem('token');
      
      // Configurar o cabeçalho de autorização para o axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.defaults.headers.common['Content-Type'] = 'application/json';
      
      // Preparar dados para o teste de conexão
      const dadosEmpresa = {
        cli_codigo: parseInt(empresa.cli_codigo, 10),
        cli_nome: empresa.cli_nome || '',
        cli_caminho_base: empresa.cli_caminho_base || '',
        cli_ip_servidor: empresa.cli_ip_servidor || '127.0.0.1',
        cli_nome_base: empresa.cli_nome_base || '',
        cli_porta: empresa.cli_porta || '3050'
      };
      
      console.log('Testando conexão para empresa:', dadosEmpresa);
      
      // Chamar o endpoint para testar a conexão
      const response = await axios.post(`${API_URL}/testar-conexao-empresa`, dadosEmpresa);
      
      console.log('Resultado do teste de conexão:', response.data);
      setConnectionResult(response.data);
    } catch (err) {
      console.error('Erro ao testar conexão:', err);
      setConnectionResult({
        sucesso: false,
        mensagem: err.response?.data?.detail || err.message || 'Erro ao testar conexão'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestSql = async (empresa, e) => {
    e.preventDefault(); // Impede que o clique propague para o botão de selecionar empresa
    e.stopPropagation();
    
    try {
      setTestingSql(true);
      setSqlResult(null);
      setSelectedEmpresaForTest(empresa.cli_codigo);
      setError('');
      
      // Usar o token armazenado no localStorage
      const token = localStorage.getItem('token');
      
      // Configurar o cabeçalho de autorização para o axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.defaults.headers.common['Content-Type'] = 'application/json';
      
      // Adiionar o cabeçalho x-empresa-codigo
      axios.defaults.headers.common['x-empresa-codigo'] = empresa.cli_codigo;
      
      // Preparar dados para o teste SQL
      const dadosEmpresa = {
        cli_codigo: parseInt(empresa.cli_codigo, 10),
        cli_nome: empresa.cli_nome || '',
        cli_caminho_base: empresa.cli_caminho_base || '',
        cli_ip_servidor: empresa.cli_ip_servidor || '127.0.0.1',
        cli_nome_base: empresa.cli_nome_base || '',
        cli_porta: empresa.cli_porta || '3050'
      };
      
      console.log('Testando SQL para empresa:', dadosEmpresa);
      
      // Chamar o endpoint para testar a consulta SQL
      const response = await axios.post(`${API_URL}/testar-sql-empresa`, dadosEmpresa);
      
      console.log('Resultado do teste SQL:', response.data);
      setSqlResult(response.data);
    } catch (err) {
      console.error('Erro ao testar SQL:', err);
      setSqlResult({
        sucesso: false,
        mensagem: err.response?.data?.detail || err.message || 'Erro ao testar SQL'
      });
    } finally {
      setTestingSql(false);
    }
  };

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
      // Garantir que o código da empresa seja um número inteiro
      const dadosEmpresa = {
        cli_codigo: parseInt(empresa.cli_codigo, 10), // Converter para inteiro
        cli_nome: empresa.cli_nome || '',
        cli_bloqueadoapp: empresa.cli_bloqueadoapp || 'N',
        cli_mensagem: empresa.cli_mensagem || '',
        cli_caminho_base: empresa.cli_caminho_base || '',
        cli_ip_servidor: empresa.cli_ip_servidor || '127.0.0.1',
        cli_nome_base: empresa.cli_nome_base || '',
        cli_porta: empresa.cli_porta || '3050'
      };
      
      console.log('Enviando dados da empresa formatados:', dadosEmpresa);
      
      // Configurar o cabeçalho de autorização para o axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.defaults.headers.common['Content-Type'] = 'application/json';
      
      // Usar a rota real de seleção de empresa
      try {
        console.log('Fazendo a seleção real da empresa');
        // Primeiro testar com o endpoint simplificado para confirmar CORS
        console.log('Testando com o endpoint simplificado para CORS');
        const testURL = `${API_URL}/teste-selecionar-empresa`;
        console.log('URL de teste:', testURL);
        
        // Configuração detalhada para debug
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          validateStatus: status => status < 500
        };
        
        console.log('Configuração da requisição:', config);
        console.log('Dados enviados:', dadosEmpresa);
        
        // Testar primeiro com o endpoint simplificado
        const response = await axios.post(testURL, dadosEmpresa, config);
        console.log('Resposta do teste:', response);
        
        // Se o teste funcionou, testar com o endpoint real
        //const responseReal = await axios.post(`${API_URL}/selecionar-empresa`, dadosEmpresa, config);
        
        // Verificar se a resposta não é bem-sucedida (códigos 4xx)
        if (response.status >= 400) {
          console.error('Erro na resposta:', response.data);
          throw new Error(response.data.detail || 'Erro ao selecionar empresa: ' + response.status);
        }
      
        // Os dados já estão no formato JSON com axios
        const data = response.data;
        console.log('Empresa selecionada com sucesso:', data);
      } catch (axiosError) {
        console.error('Erro na requisição axios:', axiosError);
        
        // Extrair informações de erro mais detalhadas
        if (axiosError.response) {
          // A requisição foi feita e o servidor respondeu com um status de erro
          console.error('Dados do erro:', axiosError.response.data);
          console.error('Status do erro:', axiosError.response.status);
          console.error('Headers do erro:', axiosError.response.headers);
          throw new Error(axiosError.response.data?.detail || `Erro ${axiosError.response.status}: ${axiosError.message}`);
        } else if (axiosError.request) {
          // A requisição foi feita mas não houve resposta
          console.error('Requisição sem resposta:', axiosError.request);
          throw new Error('Sem resposta do servidor. Verifique sua conexão.');
        } else {
          // Algo aconteceu na configuração da requisição que causou um erro
          console.error('Erro na configuração:', axiosError.message);
          throw new Error(`Erro de configuração: ${axiosError.message}`);
        }
      }
      
      // Notificar o componente pai que a empresa foi selecionada
      if (onSelectEmpresa) {
        onSelectEmpresa(empresa);
      } else {
        console.warn('onSelectEmpresa não foi fornecido como prop');
      }
      
      // Armazena os dados da empresa selecionada localmente
      localStorage.setItem('empresa', JSON.stringify(empresa));
      localStorage.setItem('empresa_atual', JSON.stringify(empresa));
      
      // Atualiza os headers do axios para incluir o contexto da empresa
      const empresaContexto = {
        codigo: empresa.cli_codigo,
        nome: empresa.cli_nome
      };
      localStorage.setItem('empresa_contexto', JSON.stringify(empresaContexto));
      
      // Registrar no console que estamos entrando no sistema
      console.log(`Entrando no sistema com a empresa: ${empresa.cli_nome}`);

      // Redirecionar para o dashboard após pequeno delay para garantir que o contexto foi atualizado
      setTimeout(() => {
        console.log('Redirecionando para o dashboard com a empresa:', empresa.cli_nome);
        // Recarregar a página para garantir que todas as atualizações de contexto sejam aplicadas
        window.location.href = '/';
      }, 300);
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
                  <div
                    onClick={() => handleEmpresaSelect(empresa)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors cursor-pointer ${empresa.cli_bloqueadoapp === 'S' 
                      ? `${darkMode ? 'bg-gray-700' : 'bg-gray-100'} cursor-not-allowed` 
                      : `${darkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-50'} focus:outline-none focus:ring-2 focus:ring-blue-500`}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{empresa.cli_nome}</h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Código: {empresa.cli_codigo}</p>
                        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
                          {empresa.cli_ip_servidor}{empresa.cli_porta ? `:${empresa.cli_porta}` : ''}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {empresa.cli_caminho_base}/{empresa.cli_nome_base}
                        </p>
                        
                        {/* Resultado do teste de conexão */}
                        {selectedEmpresaForTest === empresa.cli_codigo && connectionResult && (
                          <div className={`mt-2 p-2 rounded text-sm ${connectionResult.sucesso ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            <p className="font-medium">
                              {connectionResult.sucesso ? '✓ Conexão bem-sucedida!' : `✗ ${connectionResult.mensagem}`}
                            </p>
                            {connectionResult.sucesso && connectionResult.info_banco && (
                              <div className="text-xs mt-1">
                                <p>Versão Firebird: {connectionResult.info_banco.versao}</p>
                                <p>Usuário: {connectionResult.info_banco.usuario}</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Resultado do teste SQL */}
                        {selectedEmpresaForTest === empresa.cli_codigo && sqlResult && (
                          <div className={`mt-2 p-2 rounded text-sm ${sqlResult.sucesso ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            <p className="font-medium">
                              {sqlResult.sucesso ? '✓ SQL executado com sucesso!' : `✗ ${sqlResult.mensagem}`}
                            </p>
                            {sqlResult.estrutura_bd && (
                              <div className="text-xs mt-1">
                                <p>Tabela EMPRESA: {sqlResult.estrutura_bd.tabela_empresa ? 'Existe' : 'Não existe'}</p>
                                <p>Tabela PARAMET: {sqlResult.estrutura_bd.tabela_paramet ? 'Existe' : 'Não existe'}</p>
                              </div>
                            )}
                            {sqlResult.sucesso && sqlResult.resultado && sqlResult.resultado.length > 0 && (
                              <div className="text-xs mt-2 p-2 bg-white text-gray-800 rounded overflow-auto max-h-40">
                                {sqlResult.resultado.map((item, index) => (
                                  <div key={index} className="mb-1 p-1 border-b">
                                    <p>Código: <span className="font-semibold">{item.emp_cod}</span></p>
                                    <p>Nome: <span className="font-semibold">{item.emp_nome}</span></p>
                                    <p>CNPJ: <span className="font-semibold">{item.emp_cnpj}</span></p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        {/* Botões de Teste */}
                        <div className="flex flex-col space-y-2">
                          {/* Botão de Testar Conexão */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Impede que o clique propague para a div pai
                              handleTestConnection(empresa, e);
                            }}
                            className={`px-3 py-1 text-xs rounded-md ${darkMode ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'} text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            disabled={testingConnection && selectedEmpresaForTest === empresa.cli_codigo}
                          >
                            {testingConnection && selectedEmpresaForTest === empresa.cli_codigo ? (
                              <span>Testando...</span>
                            ) : (
                              <span>Testar Conexão</span>
                            )}
                          </button>
                          
                          {/* Botão de Testar SQL */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Impede que o clique propague para a div pai
                              handleTestSql(empresa, e);
                            }}
                            className={`px-3 py-1 text-xs rounded-md ${darkMode ? 'bg-green-700 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700'} text-white transition-colors focus:outline-none focus:ring-2 focus:ring-green-500`}
                            disabled={testingSql && selectedEmpresaForTest === empresa.cli_codigo}
                          >
                            {testingSql && selectedEmpresaForTest === empresa.cli_codigo ? (
                              <span>Testando SQL...</span>
                            ) : (
                              <span>Testar SQL</span>
                            )}
                          </button>
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
                    </div>
                    {empresa.cli_bloqueadoapp === 'S' && empresa.cli_mensagem && (
                      <div className="mt-2 text-sm text-red-600">
                        {empresa.cli_mensagem}
                      </div>
                    )}
                  </div>
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
