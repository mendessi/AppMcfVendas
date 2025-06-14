import React, { useState, useEffect, useRef } from 'react'; // Corrigido: adiciona useRef
import api, { getVendedores } from '../services/api';

const VendedorSelect = ({ value, onChange, darkMode }) => {
  const [vendedores, setVendedores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cache simples em memória para evitar múltiplas chamadas à API durante a sessão
  const vendedoresCache = useRef(null);

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
          // Verifica se já existe cache
          if (vendedoresCache.current) {
            console.log('[VENDEDORES] Usando cache em memória:', vendedoresCache.current);
            setVendedores(vendedoresCache.current);
            setIsLoading(false);
            return;
          }
          // Se não houver cache, faz a chamada à API normalmente
          console.log('[VENDEDORES] Iniciando chamada à API...');
          const response = await getVendedores();
          
          console.log('[VENDEDORES] Resposta da API:', response.data);

          if (isVendedor && codigoVendedor) {
            // Garantir que o código do vendedor seja uma string para comparação
            const vendedorData = response.data.find(v => String(v.codigo).trim() === String(codigoVendedor).trim());
            if (vendedorData) {
              console.log('[VENDEDORES] Dados do vendedor encontrados:', vendedorData);
              setVendedores([vendedorData]);
              vendedoresCache.current = [vendedorData]; // Salva no cache
              onChange(vendedorData); // Enviar o objeto completo do vendedor
            } else {
              console.error('[VENDEDORES] Dados do vendedor não encontrados na resposta');
              setError('Dados do vendedor não encontrados');
            }
          } else {
            // Se não for vendedor, usar todos os vendedores
            console.log('[VENDEDORES] Carregando lista completa:', response.data);
            setVendedores(response.data || []);
            vendedoresCache.current = response.data || []; // Salva no cache
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
        value={value?.codigo || value || ''}
        onChange={(e) => {
          const vendedorSelecionado = vendedores.find(v => v.codigo === e.target.value);
          onChange(vendedorSelecionado || e.target.value);
        }}
        disabled={isLoading || isVendedor}
        className={`w-full rounded-md ${
          darkMode
            ? "bg-gray-600 border-gray-500 text-white"
            : "bg-white border-gray-300 text-gray-700"
        } ${(isLoading || isVendedor) ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <option value="">{isLoading ? 'Carregando...' : 'Selecione um vendedor'}</option>
        {vendedores.map((vendedor) => (
          <option key={vendedor.codigo} value={vendedor.codigo}>
            {vendedor.nome || `Vendedor ${vendedor.codigo}`} {vendedor.desconto_maximo ? `(Máx: ${vendedor.desconto_maximo}%)` : ''}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default VendedorSelect; 