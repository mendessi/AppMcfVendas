import React, { useState, useEffect } from 'react';
import { getFormasPagamento } from '../services/api';

const FormaPagamentoSelect = ({ value, onChange, darkMode }) => {
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFormasPagamento = async () => {
      try {
        const response = await getFormasPagamento();
        setFormasPagamento(response.data); // Os dados já vêm no formato correto do backend
      } catch (error) {
        console.error('Erro ao buscar formas de pagamento:', error);
        setError('Erro ao carregar formas de pagamento');
      }
    };

    fetchFormasPagamento();
  }, []);

  return (
    <div className="w-full">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-md ${
          darkMode
            ? "bg-gray-600 border-gray-500 text-white"
            : "bg-white border-gray-300 text-gray-700"
        }`}
      >
        <option value="">Selecione uma forma de pagamento</option>
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