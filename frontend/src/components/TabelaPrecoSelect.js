import React, { useState, useEffect } from 'react';
import { getTabelasPreco } from '../services/api';

const TabelaPrecoSelect = ({ value, onChange, darkMode }) => {
  const [tabelas, setTabelas] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTabelas = async () => {
      try {
        const response = await getTabelasPreco();
        setTabelas(response.data); // Os dados já vêm no formato correto do backend
      } catch (error) {
        console.error('Erro ao buscar tabelas de preço:', error);
        setError('Erro ao carregar tabelas de preço');
      }
    };

    fetchTabelas();
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
        <option value="">Selecione uma tabela de preço</option>
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