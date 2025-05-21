import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import '../styles/EmpresaSelector.css';

const EmpresaSelector = () => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Token não encontrado. Por favor, faça login novamente.');
          navigate('/login');
          return;
        }

        const response = await fetch(`${API_URL}/empresas`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 401) {
            setError('Sessão expirada. Por favor, faça login novamente.');
            localStorage.removeItem('token');
            navigate('/login');
            return;
          }
          throw new Error(`Erro ao buscar empresas: ${errorData.detail || response.statusText}`);
        }

        const data = await response.json();
        setEmpresas(data);
      } catch (err) {
        console.error('Erro detalhado:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresas();
  }, [navigate]);

  const handleEmpresaSelect = async (empresa) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/selecionar-empresa`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cli_codigo: empresa.cli_codigo })
      });

      if (!response.ok) {
        throw new Error('Erro ao selecionar empresa');
      }

      localStorage.setItem('empresaAtual', JSON.stringify(empresa));
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Carregando empresas...</div>;
  if (error) return <div className="error">Erro: {error}</div>;

  return (
    <div className="empresa-selector">
      <h2>Selecione uma Empresa</h2>
      <div className="empresas-grid">
        {empresas.map((empresa) => (
          <div 
            key={empresa.id} 
            className={`empresa-card ${empresa.cli_bloqueadoapp === 'S' ? 'bloqueado' : ''}`}
          >
            <div className="empresa-nome">{empresa.cli_nome}</div>
            
            <div className="empresa-info">
              <div className="empresa-info-item">
                <i className="fas fa-building"></i>
                <span>Código: {empresa.cli_codigo}</span>
              </div>
              
              {empresa.cli_ip_servidor && (
                <div className="empresa-info-item">
                  <i className="fas fa-server"></i>
                  <span>Servidor: {empresa.cli_ip_servidor}</span>
                </div>
              )}
              
              {empresa.cli_nome_base && (
                <div className="empresa-info-item">
                  <i className="fas fa-database"></i>
                  <span>Base: {empresa.cli_nome_base}</span>
                </div>
              )}
              
              {empresa.cli_porta && (
                <div className="empresa-info-item">
                  <i className="fas fa-plug"></i>
                  <span>Porta: {empresa.cli_porta}</span>
                </div>
              )}
              
              <div className="empresa-info-item">
                <i className="fas fa-user-shield"></i>
                <span>Nível: {empresa.nivel_acesso}</span>
              </div>
            </div>
            
            {empresa.cli_mensagem && (
              <div className="empresa-mensagem">
                <i className="fas fa-info-circle"></i> {empresa.cli_mensagem}
              </div>
            )}
            
            <button 
              onClick={() => handleEmpresaSelect(empresa)}
              className="select-button"
              disabled={empresa.cli_bloqueadoapp === 'S'}
            >
              {empresa.cli_bloqueadoapp === 'S' ? 'Bloqueado' : 'Selecionar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmpresaSelector;
