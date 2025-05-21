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
        // Obter o token de autenticação do localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('Nenhum token encontrado, não buscaremos dados da empresa');
          setLoading(false);
          return;
        }

        // Verificar se há uma empresa selecionada (tentar todas as possíveis keys)
        const keys = ['empresa', 'empresa_atual', 'empresaSelecionada'];
        let empresaData = null;
        
        for (const key of keys) {
          const data = localStorage.getItem(key);
          if (data) {
            console.log(`Encontramos dados da empresa na chave '${key}':`, data);
            empresaData = data;
            break;
          }
        }
        
        console.log('Todas as chaves no localStorage:', Object.keys(localStorage));
        
        if (!empresaData) {
          console.log('Nenhuma empresa encontrada em nenhuma chave do localStorage');
          setLoading(false);
          return;
        }

        // Obter o código da empresa
        const empresa = JSON.parse(empresaData);
        const empresaCodigo = empresa.cli_codigo;
        console.log('Código da empresa para API:', empresaCodigo);

        // Configuração completa com token e código da empresa
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-empresa-codigo': empresaCodigo
          }
        };

        console.log('Fazendo requisição para:', `${API_URL}/info-empresa-atual`);
        console.log('Com configuração:', config);

        // Fazer a requisição para obter informações da empresa atual
        const response = await axios.get(`${API_URL}/info-empresa-atual`, config);
        
        console.log('Resposta da API:', response.data);
        
        // Se a requisição for bem-sucedida, atualizar o estado
        setEmpresaInfo(response.data);
      } catch (error) {
        console.error('Erro ao buscar informações da empresa:', error);
        if (error.response) {
          console.log('Resposta de erro:', error.response.data);
          console.log('Status:', error.response.status);
        }
        setError('Não foi possível carregar informações da empresa');
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
