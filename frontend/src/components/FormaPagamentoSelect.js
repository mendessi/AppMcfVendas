import React, { useState, useEffect } from 'react';
import { getFormasPagamento } from '../services/api';

const FormaPagamentoSelect = ({ value, onChange, darkMode }) => {
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchFormasPagamento = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getFormasPagamento(abortController.signal);
        
        // Só atualiza se não foi cancelado
        if (!abortController.signal.aborted) {
          setFormasPagamento(response.data);
        }
      } catch (error) {
        // Só mostra erro se não foi cancelamento
        if (!abortController.signal.aborted) {
          console.error('Erro ao buscar formas de pagamento:', error);
          setError('Erro ao carregar formas de pagamento');
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchFormasPagamento();

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
        <option value="">{isLoading ? 'Carregando...' : 'Selecione uma forma de pagamento'}</option>
        {formasPagamento.map((forma) => (
          <option key={forma.codigo} value={forma.codigo}>
            {forma.nome}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default FormaPagamentoSelect; 