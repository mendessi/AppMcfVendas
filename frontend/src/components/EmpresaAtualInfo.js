import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaBuilding, FaIdCard, FaInfoCircle } from 'react-icons/fa';

// Componente que exibe discretamente informações da empresa atual
const EmpresaAtualInfo = ({ darkMode = false }) => {
  const [empresaInfo, setEmpresaInfo] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // URL da API
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchEmpresaInfo = async () => {
      try {
        // Verificar se temos um token e uma empresa selecionada
        const token = localStorage.getItem('token');
        const empresaSelecionada = localStorage.getItem('empresa') || localStorage.getItem('empresa_atual');
        
        if (!token) {
          console.log('Token não encontrado, usuário não está autenticado');
          return;
        }
        
        if (!empresaSelecionada) {
          console.log('Nenhuma empresa selecionada ainda');
          setEmpresaInfo({
            sucesso: false,
            mensagem: "Nenhuma empresa selecionada",
            empresa: {
              emp_cod: 0,
              emp_nome: "Selecione uma empresa",
              emp_cnpj: "Acesse o menu de seleção"
            }
          });
          setLoading(false);
          return;
        }

        // Configurar cabeçalhos para a requisição
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };
        
        // Se tivermos o código da empresa, adicionar como cabeçalho
        // Isso ajuda com nossa abordagem híbrida de seleção de empresa
        const empresaObj = JSON.parse(empresaSelecionada);
        if (empresaObj && empresaObj.cli_codigo) {
          config.headers['x-empresa-codigo'] = empresaObj.cli_codigo;
          console.log(`Adicionando cabeçalho x-empresa-codigo: ${empresaObj.cli_codigo}`);
        }

        console.log('Fazendo requisição para obter informações da empresa com config:', config);
        
        // Buscar informações detalhadas da empresa atual
        const response = await axios.get(`${API_URL}/empresa-info-detalhada`, config);
        console.log('Resposta da API:', response.data);
        setEmpresaInfo(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao buscar informações da empresa:', err);
        setError('Não foi possível carregar as informações da empresa');
        setLoading(false);
      }
    };

    fetchEmpresaInfo();
  }, [API_URL]);

  // Se ainda estiver carregando ou ocorreu um erro, não exibimos nada
  if (loading || error) return null;

  // Se não temos dados da empresa, não exibimos nada
  if (!empresaInfo || !empresaInfo.empresa) return null;

  const { emp_cod, emp_nome, emp_cnpj } = empresaInfo.empresa;

  return (
    <div 
      className={`fixed bottom-4 right-4 z-10 rounded-lg shadow-lg overflow-hidden transition-all duration-300 ease-in-out ${
        expanded ? 'w-80' : 'w-auto hover:bg-opacity-90'
      } ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
    >
      {/* Cabeçalho clicável para expandir/recolher */}
      <div 
        className={`p-3 cursor-pointer flex items-center justify-between ${
          darkMode ? 'bg-gray-700' : 'bg-blue-50'
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <FaBuilding className={`mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <span className="font-medium">Empresa Atual</span>
        </div>
        <FaInfoCircle 
          className={`${darkMode ? 'text-blue-400' : 'text-blue-600'} ${
            expanded ? 'transform rotate-180' : ''
          }`}
        />
      </div>

      {/* Conteúdo expandido */}
      {expanded && (
        <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="space-y-3">
            <div className="flex items-start">
              <span className={`font-medium mr-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Código:</span>
              <span>{emp_cod}</span>
            </div>
            
            <div className="flex items-start">
              <span className={`font-medium mr-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Nome:</span>
              <span>{emp_nome}</span>
            </div>
            
            <div className="flex items-start">
              <span className={`font-medium mr-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>CNPJ:</span>
              <span>{emp_cnpj}</span>
            </div>
          </div>
          
          <div className={`mt-3 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p className="italic">Empresa padrão do sistema</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmpresaAtualInfo;
