import React, { useState, useEffect } from 'react';
import { getVendedores } from '../services/api';

const VendedorSelect = ({ value, onChange, darkMode }) => {
  const [vendedores, setVendedores] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVendedores = async () => {
      try {
        const response = await getVendedores();
        setVendedores(response.data); // Os dados já vêm no formato correto do backend
      } catch (error) {
        console.error('Erro ao buscar vendedores:', error);
        setError('Erro ao carregar vendedores');
      }
    };

    fetchVendedores();
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
        <option value="">Selecione um vendedor</option>
        {vendedores.map((vendedor) => (
          <option key={vendedor.codigo} value={vendedor.codigo}>
            {vendedor.nome}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default VendedorSelect; 