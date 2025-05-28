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
      <label className="block text-gray-300 mb-1">{label}</label>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled || loading}
        className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-gray-100"
      >
        <option value="">{loading ? 'Carregando...' : placeholder}</option>
        {options.map(opt => (
          <option key={opt[optionValue]} value={opt[optionValue]}>
            {opt[optionLabel]}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SelectDinamico;
