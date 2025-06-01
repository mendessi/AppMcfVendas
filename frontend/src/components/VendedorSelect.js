import React, { useState, useEffect } from 'react';
import api, { getVendedores } from '../services/api';

const VendedorSelect = ({ value, onChange, darkMode }) => {
  const [vendedores, setVendedores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVendedores = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Obter dados do usuário e empresa do localStorage
        const userData = JSON.parse(localStorage.getItem('user'));
        const empresaCodigo = localStorage.getItem('empresa_atual');
        
        console.log('[VENDEDORES] Dados do usuário:', userData);
        console.log('[VENDEDORES] Código da empresa:', empresaCodigo);

        if (!empresaCodigo) {
          throw new Error('Código da empresa não encontrado');
        }

        const isVendedor = userData?.nivel?.toUpperCase() === 'VENDEDOR';
        const codigoVendedor = userData?.codigo_vendedor;

        console.log('[VENDEDORES] É vendedor?', isVendedor);
        console.log('[VENDEDORES] Código do vendedor:', codigoVendedor);

        try {
          // Se for vendedor, buscar apenas seus dados
          console.log('[VENDEDORES] Iniciando chamada à API...');
          const response = await getVendedores();
          
          console.log('[VENDEDORES] Resposta da API:', response.data);

          if (isVendedor && codigoVendedor) {
            // Garantir que o código do vendedor seja uma string para comparação
            const vendedorData = response.data.find(v => String(v.codigo).trim() === String(codigoVendedor).trim());
            if (vendedorData) {
              console.log('[VENDEDORES] Dados do vendedor encontrados:', vendedorData);
              setVendedores([vendedorData]);
              onChange(vendedorData.codigo); // Pré-selecionar o vendedor
            } else {
              console.error('[VENDEDORES] Dados do vendedor não encontrados na resposta');
              setError('Dados do vendedor não encontrados');
            }
          } else {
            // Se não for vendedor, usar todos os vendedores
            console.log('[VENDEDORES] Carregando lista completa:', response.data);
            setVendedores(response.data || []);
          }
        } catch (apiError) {
          console.error('[VENDEDORES] Erro na chamada da API:', apiError);
          throw new Error(`Erro ao comunicar com o servidor: ${apiError.message}`);
        }
      } catch (err) {
        console.error('[VENDEDORES] Erro ao carregar vendedores:', err);
        setError(err.message || 'Erro ao carregar vendedores');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendedores();
  }, [onChange]);

  // Verificar se o usuário é vendedor
  const userData = JSON.parse(localStorage.getItem('user'));
  const isVendedor = userData?.nivel?.toUpperCase() === 'VENDEDOR';

  return (
    <div className="w-full">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading || isVendedor} // Desabilitar se for vendedor
        className={`w-full rounded-md ${
          darkMode
            ? "bg-gray-600 border-gray-500 text-white"
            : "bg-white border-gray-300 text-gray-700"
        } ${(isLoading || isVendedor) ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <option value="">{isLoading ? 'Carregando...' : 'Selecione um vendedor'}</option>
        {vendedores.map((vendedor) => (
          <option key={vendedor.codigo} value={vendedor.codigo}>
            {vendedor.nome || `Vendedor ${vendedor.codigo}`}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default VendedorSelect; 