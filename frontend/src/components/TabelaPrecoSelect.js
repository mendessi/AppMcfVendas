import React, { useState, useEffect } from 'react';
import { getTabelasPreco } from '../services/api';

const TabelaPrecoSelect = ({ value, onChange, darkMode }) => {
  const [tabelas, setTabelas] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchTabelas = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getTabelasPreco(abortController.signal);
        
        // Só atualiza se não foi cancelado
        if (!abortController.signal.aborted) {
          setTabelas(response.data);
        }
      } catch (error) {
        // Só mostra erro se não foi cancelamento
        if (!abortController.signal.aborted) {
          console.error('Erro ao buscar tabelas de preço:', error);
          setError('Erro ao carregar tabelas de preço');
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchTabelas();

    // Cleanup: cancela a requisição se o componente for desmontado
    return () => {
      abortController.abort();
    };
  }, []);

  return (
    <div className="w-full">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
        className={`w-full rounded-md ${
          darkMode
            ? "bg-gray-600 border-gray-500 text-white"
            : "bg-white border-gray-300 text-gray-700"
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <option value="">{isLoading ? 'Carregando...' : 'Selecione uma tabela de preço'}</option>
        {tabelas.map((tabela) => (
          <option key={tabela.codigo} value={tabela.codigo}>
            {tabela.nome}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default TabelaPrecoSelect; 