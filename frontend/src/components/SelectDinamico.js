import React, { useEffect, useState } from 'react';

function SelectDinamico({ label, value, onChange, fetchOptions, options, optionLabel = 'label', optionValue = 'value', placeholder = 'Selecione', disabled = false }) {
  const [internalOptions, setInternalOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (Array.isArray(options)) {
      setInternalOptions(options);
      setLoading(false);
    } else if (typeof fetchOptions === 'function') {
      setLoading(true);
      fetchOptions()
        .then((opts) => setInternalOptions(opts))
        .catch(() => setInternalOptions([]))
        .finally(() => setLoading(false));
    } else {
      setInternalOptions([]);
      setLoading(false);
    }
  }, [options, fetchOptions]);

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
        {internalOptions.map(opt => (
          <option key={opt[optionValue]} value={opt[optionValue]}>
            {opt[optionLabel]}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SelectDinamico;
