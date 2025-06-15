import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Toast from './Toast';

const EmpresaSelector = ({ onSelectEmpresa, darkMode = true }) => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [testingConnection, setTestingConnection] = useState({});
  const [connectionResult, setConnectionResult] = useState({});
  const [testingSql, setTestingSql] = useState(false);
  const [sqlResult, setSqlResult] = useState(null);
  const [selectedEmpresaForTest, setSelectedEmpresaForTest] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMsg, setErrorModalMsg] = useState('');
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastPosition, setToastPosition] = useState(null);
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

  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  const handleTestConnection = async (empresa, e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }

    // Capturar a posição do clique
    if (e) {
      setToastPosition({ x: e.clientX, y: e.clientY });
    }

    setSelectedEmpresaForTest(empresa.cli_codigo);
    setTestingConnection(prev => ({ ...prev, [empresa.cli_codigo]: true }));
    setConnectionResult(prev => ({ ...prev, [empresa.cli_codigo]: null }));
    setError('');
    setShowLoadingModal(true);

    try {
      const token = localStorage.getItem('token');
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.defaults.headers.common['Content-Type'] = 'application/json';

      const dadosEmpresa = {
        cli_codigo: parseInt(empresa.cli_codigo, 10),
        cli_nome: empresa.cli_nome || '',
        cli_caminho_base: empresa.cli_caminho_base || '',
        cli_ip_servidor: empresa.cli_ip_servidor || '',
        cli_nome_base: empresa.cli_nome_base || '',
        cli_porta: empresa.cli_porta || '3050'
      };

      if (!dadosEmpresa.cli_caminho_base) {
        throw new Error('Caminho da base de dados não informado');
      }
      if (!dadosEmpresa.cli_ip_servidor) {
        throw new Error('IP do servidor não informado');
      }

      const response = await axios.post(`${API_URL}/testar-conexao-empresa`, dadosEmpresa);
      setConnectionResult(prev => ({ ...prev, [empresa.cli_codigo]: response.data }));

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
        localStorage.setItem('empresaSelecionada', JSON.stringify(empresaData));
        localStorage.setItem('empresa_atual', JSON.stringify(empresaData));
        localStorage.setItem('empresa', empresa.cli_codigo.toString());
        axios.defaults.headers.common['x-empresa-codigo'] = empresa.cli_codigo.toString();
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        if (typeof onSelectEmpresa === 'function') {
          onSelectEmpresa(empresaData);
        }
        navigate('/dashboard', { replace: true });
      } else {
        setToastMsg(getMensagemErroDetalhada(response.data.mensagem));
        setShowErrorModal(false);
        return;
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Erro ao testar conexão';
      setConnectionResult(prev => ({ ...prev, [empresa.cli_codigo]: { sucesso: false, mensagem: msg } }));
      setErrorModalMsg(msg);
      setToastMsg(getMensagemErroDetalhada(msg));
      setShowErrorModal(false);
    } finally {
      setTestingConnection(prev => ({ ...prev, [empresa.cli_codigo]: false }));
      setShowLoadingModal(false);
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

  // Filtrar empresas pelo nome digitado
  const empresasFiltradas = empresas.filter(empresa =>
    empresa.cli_nome?.toLowerCase().includes(filtroEmpresa.toLowerCase())
  );

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mb-4"></div>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-lg`}>Carregando empresas...</p>
      </div>
    );
  }

  return (
    <div className="empresa-selector-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', paddingTop: 32 }}>
      <h2 style={{ color: '#fff', fontWeight: 'bold', fontSize: 28, marginBottom: 16 }}>Selecione uma Empresa</h2>
      <div style={{ background: '#2563eb', color: '#fff', borderRadius: 12, padding: 20, minWidth: 350, maxWidth: 420, marginBottom: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
        <h3 style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 4 }}>Selecione uma Empresa</h3>
        <div style={{ fontSize: 15, color: '#e0e6f0' }}>Escolha a empresa para continuar</div>
      </div>
      {/* Campo de filtro */}
      <input
        type="text"
        placeholder="Filtrar por nome da empresa..."
        value={filtroEmpresa}
        onChange={e => setFiltroEmpresa(e.target.value)}
        style={{
          width: 350,
          maxWidth: '90vw',
          padding: 10,
          borderRadius: 8,
          border: '1px solid #ccc',
          marginBottom: 24,
          fontSize: 16,
          outline: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          background: darkMode ? '#23272f' : '#fff',
          color: darkMode ? '#e0e6f0' : '#222',
        }}
      />
      <div style={{ width: 350, maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {empresasFiltradas.length === 0 ? (
          <div style={{ color: '#ccc', textAlign: 'center', marginTop: 32 }}>Nenhuma empresa encontrada</div>
        ) : (
          empresasFiltradas.map((empresa) => (
            <div
              key={empresa.cli_codigo}
              className="empresa-card"
              style={{ background: '#23272f', borderRadius: 10, padding: 18, marginBottom: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer', position: 'relative' }}
              onClick={(e) => handleTestConnection(empresa, e)}
            >
              <h3 style={{ fontWeight: 'bold', fontSize: 18, color: '#fff', marginBottom: 4 }}>{empresa.cli_nome}</h3>
              <p style={{ color: '#b3b3b3', fontSize: 13, marginBottom: 2 }}>Código: {empresa.cli_codigo}</p>
              <p style={{ color: '#b3b3b3', fontSize: 13, marginBottom: 2 }}>{empresa.cli_ip_servidor}:{empresa.cli_porta}</p>
              <p style={{ color: '#b3b3b3', fontSize: 13, marginBottom: 8 }}>{empresa.cli_caminho_base}/{empresa.cli_nome_base}</p>
              {/* Botões de Teste */}
              <div className="flex flex-col space-y-2" onClick={e => e.stopPropagation()}>
                {/* Botão de Testar Conexão */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Impede que o clique propague para a div pai
                    handleTestConnection(empresa, e);
                  }}
                  className={`px-3 py-1 text-xs rounded-md ${darkMode ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'} text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  disabled={!!testingConnection[empresa.cli_codigo] || empresa.cli_bloqueadoapp === 'S'}
                >
                  {testingConnection[empresa.cli_codigo] ? (
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
          ))
        )}
      </div>
      {showLoadingModal && (
        <div className="modal-loading-dark" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-loading-content-dark" style={{
            padding: 32, minWidth: 260, maxWidth: '90vw', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>
              <span className="loading-dots">
                <span style={{ animation: 'bounce 1s infinite' }}>•</span>
                <span style={{ animation: 'bounce 1s infinite 0.2s' }}>•</span>
                <span style={{ animation: 'bounce 1s infinite 0.4s' }}>•</span>
              </span>
            </div>
            <div style={{ fontWeight: 'bold', color: '#4fc3f7', fontSize: 22, marginBottom: 8 }}>Aguarde</div>
            <div style={{ color: '#e0e6f0', fontSize: 16 }}>Verificando conexão...</div>
          </div>
        </div>
      )}
      {toastMsg && (
        <Toast
          message={toastMsg}
          onClose={() => {
            setToastMsg('');
            setToastPosition(null);
          }}
          darkMode={darkMode}
          position={toastPosition}
        />
      )}
    </div>
  );
};

export default EmpresaSelector;
