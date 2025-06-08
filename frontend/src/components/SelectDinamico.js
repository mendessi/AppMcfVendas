import React, { useState, useEffect, useCallback, useRef } from 'react';

function SelectDinamico({ 
  label, 
  value, 
  onChange, 
  fetchOptions, 
  optionLabel = 'label', 
  optionValue = 'value', 
  placeholder = 'Selecione', 
  disabled = false 
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const optionsFetched = useRef(false);

  // Função para carregar as opções
  const carregarOpcoes = useCallback(async () => {
    if (optionsFetched.current) return;
    
    setLoading(true);
    try {
      const opts = await fetchOptions();
      setOptions(opts);
      optionsFetched.current = true;
    } catch (error) {
      console.error('Erro ao carregar opções:', error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [fetchOptions]);

  // Carrega as opções apenas uma vez
  useEffect(() => {
    carregarOpcoes();
  }, [carregarOpcoes]);

  return (
    <div>
      <label className="block text-gray-300 mb-1 text-base font-semibold">{label}</label>
      <div className="relative">
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled || loading}
          className="w-full px-4 py-4 rounded-2xl border border-blue-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-lg text-lg font-medium appearance-none cursor-pointer"
          style={{ minHeight: 56 }}
        >
          <option value="">{loading ? 'Carregando...' : placeholder}</option>
          {options.map(opt => (
            <option key={opt[optionValue]} value={opt[optionValue]} className="py-4 px-4 text-base">
              {opt[optionLabel]}
            </option>
          ))}
        </select>
        <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </span>
      </div>
    </div>
  );
}

export default SelectDinamico;
