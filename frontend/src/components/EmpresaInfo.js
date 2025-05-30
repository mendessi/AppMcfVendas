import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

const EmpresaInfo = ({ darkMode }) => {
  const [empresaInfo, setEmpresaInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmpresaInfo = async () => {
      try {
        const token = localStorage.getItem('token');
        const empresaCodigo = localStorage.getItem('empresa_atual');

        if (!empresaCodigo) {
          console.error('Código da empresa não encontrado no localStorage');
          return;
        }

        const response = await axios.get(`${API_URL}/info-empresa-atual`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-empresa-codigo': empresaCodigo
          }
        });

        setEmpresaInfo(response.data);
      } catch (error) {
        console.error('Erro ao buscar informações da empresa:', error);
        setError('Erro ao carregar informações da empresa');
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresaInfo();
  }, []);

  // Se estiver carregando, não mostrar nada
  if (loading) return null;

  // Se houver erro ou não houver informações, não mostrar nada
  if (error || !empresaInfo || !empresaInfo.emp_nome) return null;

  return (
    <div className={`mx-2 px-3 py-1 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-blue-50'}`}>
      <div className="text-xs font-medium">
        <span className={darkMode ? 'text-gray-300' : 'text-blue-800'}>
          {empresaInfo.nome_abreviado || empresaInfo.emp_nome}
        </span>
      </div>
      {empresaInfo.emp_cnpj && (
        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          CNPJ: {empresaInfo.emp_cnpj}
        </div>
      )}
    </div>
  );
};

export default EmpresaInfo;
