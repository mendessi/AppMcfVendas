import React, { useState } from 'react';
import apiService from '../services/api';

function ClienteAutocomplete({ value, onChange }) {
  const [input, setInput] = useState(value?.nome || '');
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);

  const handleInput = async (e) => {
    const val = e.target.value;
    setInput(val);
    setShowList(true);
    if (val.length < 2) {
      setClientes([]);
      return;
    }
    setLoading(true);
    try {
      // Ajuste a rota conforme seu backend
      const res = await apiService.api.get(`/clientes?search=${encodeURIComponent(val)}`);
      setClientes(res.data || []);
    } catch (err) {
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (cliente) => {
    setInput(cliente.nome || cliente.CLI_NOME || '');
    setShowList(false);
    onChange(cliente);
  };

  return (
    <div className="relative">
      <input
        type="text"
        className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Buscar cliente..."
        value={input}
        onChange={handleInput}
        onFocus={() => setShowList(true)}
        autoComplete="off"
      />
      {loading && <div className="absolute right-3 top-3 spinner-border animate-spin w-4 h-4 border-2 border-blue-400 rounded-full"></div>}
      {showList && clientes.length > 0 && (
        <ul className="absolute z-10 w-full bg-gray-800 border border-gray-700 rounded-lg mt-1 max-h-52 overflow-y-auto shadow-lg">
          {clientes.map((c) => (
            <li
              key={c.codigo || c.CLI_CODIGO}
              className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer text-gray-200"
              onMouseDown={() => handleSelect(c)}
            >
              {c.codigo || c.CLI_CODIGO} - {c.nome || c.CLI_NOME}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ClienteAutocomplete;
