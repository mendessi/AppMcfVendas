import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const EmpresaContext = createContext();

export const EmpresaProvider = ({ children }) => {
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const empresaSalva = localStorage.getItem('empresa');

    if (token) {
      api.get('/empresas', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then(response => {
          setEmpresas(response.data);
          if (empresaSalva) {
            const empresa = response.data.find(e => e.codigo === empresaSalva);
            if (empresa) {
              setEmpresaSelecionada(empresa);
            }
          }
        })
        .catch(error => {
          console.error('Erro ao carregar empresas:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const selecionarEmpresa = (empresa) => {
    localStorage.setItem('empresa', empresa.codigo);
    setEmpresaSelecionada(empresa);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <EmpresaContext.Provider value={{ empresas, empresaSelecionada, selecionarEmpresa }}>
      {children}
    </EmpresaContext.Provider>
  );
};

export const useEmpresa = () => {
  const context = useContext(EmpresaContext);
  if (!context) {
    throw new Error('useEmpresa must be used within an EmpresaProvider');
  }
  return context;
};

export default EmpresaContext; 