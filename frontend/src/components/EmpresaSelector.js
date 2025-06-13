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
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMsg, setErrorModalMsg] = useState('');
  const navigate = useNavigate();
  
  // URL da API - Deteção automática de ambiente
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
  
  const API_URL = getApiUrl();
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
        console.log('Resposta bruta da API:', data);
        
        // Verificar se os dados estão em um array ou em um objeto com propriedade 'empresas'
        const empresasData = Array.isArray(data) ? data : (data.empresas || []);
        console.log('Dados das empresas extraídos:', empresasData);
        
        // Verificar se os dados estão no formato esperado
        const empresasFormatadas = empresasData.map(empresa => {
          console.log('Empresa antes da formatação:', empresa);
          
          // Garantir que todos os campos necessários estejam presentes
          const empresaFormatada = {
            cli_codigo: empresa.cli_codigo || empresa.codigo || empresa.emp_cod || 0,
            cli_nome: empresa.cli_nome || empresa.nome || empresa.emp_nome || '',
            cli_caminho_base: empresa.cli_caminho_base || empresa.caminho_base || empresa.emp_caminho_base || '',
            cli_ip_servidor: empresa.cli_ip_servidor || empresa.ip || empresa.emp_ip || '',
            cli_nome_base: empresa.cli_nome_base || empresa.nome_base || empresa.emp_nome_base || '',
            cli_porta: empresa.cli_porta || empresa.porta || empresa.emp_porta || '3050',
            cli_bloqueadoapp: empresa.cli_bloqueadoapp || 'N'
          };

          console.log('Empresa após formatação:', empresaFormatada);
          return empresaFormatada;
        });
        
        console.log('Todas as empresas formatadas:', empresasFormatadas);
        setEmpresas(empresasFormatadas);
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
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      setTestingConnection(true);
      setConnectionResult(null);
      setSelectedEmpresaForTest(empresa.cli_codigo);
      setError('');

      console.log('Empresa selecionada para teste:', empresa);

      const token = localStorage.getItem('token');
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.defaults.headers.common['Content-Type'] = 'application/json';

      // Garantir que todos os campos necessários estejam presentes
      const dadosEmpresa = {
        cli_codigo: parseInt(empresa.cli_codigo, 10),
        cli_nome: empresa.cli_nome || '',
        cli_caminho_base: empresa.cli_caminho_base || '',
        cli_ip_servidor: empresa.cli_ip_servidor || '',
        cli_nome_base: empresa.cli_nome_base || '',
        cli_porta: empresa.cli_porta || '3050'
      };

      console.log('Dados da empresa para teste:', dadosEmpresa);

      // Validar campos obrigatórios
      if (!dadosEmpresa.cli_caminho_base) {
        console.error('Caminho da base não informado. Dados completos:', {
          empresaOriginal: empresa,
          dadosEmpresa: dadosEmpresa
        });
        throw new Error('Caminho da base de dados não informado');
      }

      if (!dadosEmpresa.cli_ip_servidor) {
        console.error('IP do servidor não informado. Dados completos:', {
          empresaOriginal: empresa,
          dadosEmpresa: dadosEmpresa
        });
        throw new Error('IP do servidor não informado');
      }

      const response = await axios.post(`${API_URL}/testar-conexao-empresa`, dadosEmpresa);
      console.log('Resposta do teste de conexão:', response.data);

      setConnectionResult(response.data);

      if (response.data.sucesso) {
        const empresaData = {
          codigo: empresa.cli_codigo,
          nome: empresa.cli_nome,
          ip: empresa.cli_ip_servidor,
          porta: empresa.cli_porta || "3050",
          caminho_base: empresa.cli_caminho_base,
          nome_base: empresa.cli_nome_base,
          cli_codigo: empresa.cli_codigo,
          cli_nome: empresa.cli_nome,
          cli_ip_servidor: empresa.cli_ip_servidor,
          cli_porta: empresa.cli_porta,
          cli_caminho_base: empresa.cli_caminho_base,
          cli_nome_base: empresa.cli_nome_base
        };

        console.log('Dados da empresa para salvar:', empresaData);

        // Salva no localStorage
        localStorage.setItem('empresaSelecionada', JSON.stringify(empresaData));
        localStorage.setItem('empresa_atual', JSON.stringify(empresaData));
        localStorage.setItem('empresa', empresa.cli_codigo.toString());

        // Atualiza headers do axios
        axios.defaults.headers.common['x-empresa-codigo'] = empresa.cli_codigo.toString();
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Atualiza o estado global (App)
        if (typeof onSelectEmpresa === 'function') {
          onSelectEmpresa(empresaData);
        }

        // Redireciona para o dashboard
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Erro ao testar conexão:', err);
      const msg = err.response?.data?.detail || err.message || 'Erro ao testar conexão';
      setConnectionResult({
        sucesso: false,
        mensagem: msg
      });
      setErrorModalMsg(msg);
      setShowErrorModal(true);
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

  const handleEmpresaSelect = (empresa) => {
    try {
      // Salvar apenas o código da empresa
      localStorage.setItem('empresa', empresa.cli_codigo.toString());
      localStorage.setItem('empresa_atual', empresa.cli_codigo.toString());
      localStorage.setItem('empresa_selecionada', empresa.cli_codigo.toString());
      
      // Configurar headers do axios
      axios.defaults.headers.common['x-empresa-codigo'] = empresa.cli_codigo.toString();
      
      // Salvar objeto completo em outra chave se necessário
      localStorage.setItem('empresa_detalhes', JSON.stringify(empresa));
      
      // Notificar componente pai
      if (onSelectEmpresa) {
        onSelectEmpresa(empresa);
      }
      
      // Registrar no console
      console.log('Empresa selecionada:', {
        codigo: empresa.cli_codigo,
        nome: empresa.cli_nome
      });
    } catch (error) {
      console.error('Erro ao selecionar empresa:', error);
    }
  };

  // Função utilitária para categorizar e formatar mensagens de erro
  function getMensagemErroDetalhada(mensagem) {
    if (!mensagem) return 'Erro desconhecido.';
    if (mensagem.toLowerCase().includes('caminho da base')) {
      return '❗ Caminho da base de dados não informado. Verifique o cadastro da empresa.';
    }
    if (mensagem.toLowerCase().includes('ip do servidor')) {
      return '❗ IP do servidor não informado. Verifique o cadastro da empresa.';
    }
    if (mensagem.toLowerCase().includes('não foi possível conectar') || mensagem.toLowerCase().includes('erro ao conectar') || mensagem.toLowerCase().includes('timeout') || mensagem.toLowerCase().includes('esgotado o tempo')) {
      return '🔌 Não foi possível conectar ao banco de dados. Verifique se o servidor está online, o IP está correto e a rede está liberada.';
    }
    return mensagem;
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mb-4"></div>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-lg`}>Carregando empresas...</p>
      </div>
    );
  }

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
                    onClick={(e) => handleTestConnection(empresa, e)}
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
                              <span><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Testando...</span>
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
              localStorage.removeItem('empresa_selecionada');
              // Usar redirecionamento direto em vez de navigate
              window.location.href = '/';
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Sair
          </button>
        </div>
      </div>
      {/* Modal de erro global, aparece para qualquer erro de conexão */}
      {showErrorModal && (
        <div className="modal-erro-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="modal-erro-content" style={{
            background: '#fff', borderRadius: 12, padding: 24, minWidth: 280, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <span style={{ fontSize: '2.5rem', color: 'red', marginBottom: 8 }}>❌</span>
            <h4 style={{ color: '#e53e3e', marginBottom: 8 }}>Erro de conexão</h4>
            <p style={{ color: '#333', marginBottom: 16, wordBreak: 'break-word', fontSize: 16 }}>{getMensagemErroDetalhada(errorModalMsg)}</p>
            <button className="btn btn-secondary" style={{
              background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 6, padding: '12px 32px', fontWeight: 'bold', fontSize: 18, cursor: 'pointer', width: '100%', maxWidth: 220
            }} onClick={() => setShowErrorModal(false)}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmpresaSelector;
