import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';

function ClienteAutocomplete({ value, onChange }) {
  const [input, setInput] = useState(value?.cli_nome || '');
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (value) {
      setInput(value.cli_nome || '');
    }
  }, [value]);

  const handleInput = async (e) => {
    const val = e.target.value;
    setInput(val);
    setShowList(true);
    setError(null);

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (val.length < 2) {
      setClientes([]);
      return;
    }

    // Adicionar debounce de 500ms
    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const empresaAtual = JSON.parse(localStorage.getItem('empresa_atual'));
        console.log('Buscando clientes com termo:', val);
        console.log('Headers da requisição:', {
          Authorization: token,
          'x-empresa-codigo': empresaAtual?.cli_codigo
        });

        const response = await api.get(`/relatorios/clientes?q=${encodeURIComponent(val)}`);
        console.log('Resposta da API:', response.data);

        if (!response.data || !Array.isArray(response.data)) {
          console.error('Resposta inválida da API:', response.data);
          setError('Erro ao buscar clientes: resposta inválida');
          setClientes([]);
          return;
        }

        setClientes(response.data);
      } catch (err) {
        console.error('Erro ao buscar clientes:', err);
        setError(err.message || 'Erro ao buscar clientes');
        setClientes([]);
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSelect = (cliente) => {
    console.log('=== CLIENTE SELECIONADO NO AUTOCOMPLETE ===');
    console.log('Cliente selecionado (objeto bruto):', cliente);
    console.log('Tipo do objeto:', typeof cliente);
    console.log('Campos disponíveis:', Object.keys(cliente));
    console.log('cli_nome:', cliente.cli_nome);
    console.log('CLI_NOME:', cliente.CLI_NOME);
    console.log('nome:', cliente.nome);
    console.log('label:', cliente.label);
    
    // Garante que o cliente tenha pelo menos o campo cli_nome
    const clienteFormatado = {
      ...cliente,
      cli_nome: cliente.cli_nome || cliente.CLI_NOME || cliente.nome || cliente.label || 'Cliente não informado',
      cli_codigo: cliente.cli_codigo || cliente.CLI_CODIGO || cliente.codigo || null
    };
    
    console.log('Cliente formatado para envio:', clienteFormatado);
    
    setInput(clienteFormatado.cli_nome);
    setShowList(false);
    onChange(clienteFormatado);
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
      {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
      {showList && clientes.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-96 overflow-auto">
          {clientes.map((c, idx) => (
            <div
              key={c.cli_codigo ? c.cli_codigo : `cliente-${idx}`}
              className="p-2 hover:bg-blue-700 cursor-pointer border-b border-gray-700 last:border-b-0"
              onClick={() => handleSelect(c)}
            >
              <div className="font-bold text-gray-100">{c.cli_nome || '[Sem nome]'}</div>
              <div className="text-sm text-gray-400">
                {c.cli_cgc && `CNPJ: ${c.cli_cgc}`}
                {c.cli_cpf && `CPF: ${c.cli_cpf}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ClienteAutocomplete;
