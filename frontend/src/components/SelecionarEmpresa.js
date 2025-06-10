import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const SelecionarEmpresa = () => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    carregarEmpresas();
  }, []);

  const carregarEmpresas = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get('/empresas', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setEmpresas(response.data);
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
      setError('Erro ao carregar empresas. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmpresaSelect = (empresa) => {
    localStorage.setItem('empresa_atual', empresa.codigo);
    localStorage.setItem('empresa_nome', empresa.nome);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="mt-2">Carregando empresas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-blue-600 mb-6">Selecione uma Empresa</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          {empresas.map((empresa) => (
            <button
              key={empresa.codigo}
              onClick={() => handleEmpresaSelect(empresa)}
              className="w-full bg-white border border-gray-300 rounded-lg p-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="text-left">
                <h3 className="text-lg font-medium text-gray-900">{empresa.nome}</h3>
                <p className="text-sm text-gray-500">Código: {empresa.codigo}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SelecionarEmpresa; 