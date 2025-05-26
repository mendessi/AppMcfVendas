import React, { useEffect, useState } from 'react';

function SelectDinamico({ label, value, onChange, fetchOptions, optionLabel = 'label', optionValue = 'value', placeholder = 'Selecione', disabled = false }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchOptions()
      .then((opts) => setOptions(opts))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [fetchOptions]);

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
