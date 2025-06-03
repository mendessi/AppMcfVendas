import React, { useState, useEffect } from 'react';
import axios from 'axios';

const camposIniciais = {
  cli_nome: '',
  apelido: '',
  contato: '',
  cpf: '',
  cnpj: '',
  endereco: '',
  numero: '',
  bairro: '',
  cidade: '',
  uf: '',
  tel_whatsapp: '',
  email: ''
};

export default function ClientesNewForm({ modoEdicao = false, dadosIniciais = {}, onSuccess, cli_codigo, darkMode = false }) {
  const [form, setForm] = useState({ ...camposIniciais, ...dadosIniciais });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    if (modoEdicao && cli_codigo) {
      setLoading(true);
      axios.get(`/relatorios/clientes-new?q=&cli_codigo=${cli_codigo}`)
        .then(res => {
          if (res.data && res.data.length > 0) {
            setForm({ ...camposIniciais, ...res.data[0] });
          }
        })
        .catch(() => setErro('Erro ao carregar dados do cliente.'))
        .finally(() => setLoading(false));
    }
  }, [modoEdicao, cli_codigo]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setLoading(true);
    try {
      // Validação básica
      if (!form.cli_nome) throw new Error('Nome do cliente é obrigatório.');
      if (!form.cnpj && !form.cpf) throw new Error('Informe o CPF ou CNPJ.');
      let resp;
      if (modoEdicao && cli_codigo) {
        resp = await axios.put(`/relatorios/clientes-new/${cli_codigo}`, form);
      } else {
        resp = await axios.post('/relatorios/clientes-new', form);
      }
      setSucesso(resp.data.mensagem || 'Operação realizada com sucesso!');
      if (onSuccess) onSuccess(resp.data);
    } catch (err) {
      setErro(err.response?.data?.detail || err.message || 'Erro ao salvar cliente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`max-w-xl mx-auto p-4 rounded shadow ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}
    >
      <h2 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{modoEdicao ? 'Editar Cliente' : 'Novo Cliente'}</h2>
      {erro && <div className={`p-2 mb-2 rounded ${darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'}`}>{erro}</div>}
      {sucesso && <div className={`p-2 mb-2 rounded ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'}`}>{sucesso}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={darkMode ? 'text-gray-300' : ''}>Nome *</label>
          <input name="cli_nome" value={form.cli_nome} onChange={handleChange} className={`input ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`} required />
        </div>
        <div>
          <label className={darkMode ? 'text-gray-300' : ''}>Apelido</label>
          <input name="apelido" value={form.apelido} onChange={handleChange} className={`input ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`} />
        </div>
        <div>
          <label className={darkMode ? 'text-gray-300' : ''}>Contato</label>
          <input name="contato" value={form.contato} onChange={handleChange} className={`input ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`} />
        </div>
        <div>
          <label className={darkMode ? 'text-gray-300' : ''}>CPF</label>
          <input name="cpf" value={form.cpf} onChange={handleChange} className={`input ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`} />
        </div>
        <div>
          <label className={darkMode ? 'text-gray-300' : ''}>CNPJ</label>
          <input name="cnpj" value={form.cnpj} onChange={handleChange} className={`input ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`} />
        </div>
        <div>
          <label className={darkMode ? 'text-gray-300' : ''}>Endereço</label>
          <input name="endereco" value={form.endereco} onChange={handleChange} className={`input ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`} />
        </div>
        <div>
          <label className={darkMode ? 'text-gray-300' : ''}>Número</label>
          <input name="numero" value={form.numero} onChange={handleChange} className={`input ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`} />
        </div>
        <div>
          <label className={darkMode ? 'text-gray-300' : ''}>Bairro</label>
          <input name="bairro" value={form.bairro} onChange={handleChange} className={`input ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`} />
        </div>
        <div>
          <label className={darkMode ? 'text-gray-300' : ''}>Cidade</label>
          <input name="cidade" value={form.cidade} onChange={handleChange} className={`input ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`} />
        </div>
        <div>
          <label className={darkMode ? 'text-gray-300' : ''}>UF</label>
          <input name="uf" value={form.uf} onChange={handleChange} className={`input ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`} maxLength={2} />
        </div>
        <div>
          <label className={darkMode ? 'text-gray-300' : ''}>WhatsApp</label>
          <input name="tel_whatsapp" value={form.tel_whatsapp} onChange={handleChange} className={`input ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`} />
        </div>
        <div>
          <label className={darkMode ? 'text-gray-300' : ''}>Email</label>
          <input name="email" value={form.email} onChange={handleChange} className={`input ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`} type="email" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className={`btn btn-primary ${darkMode ? 'bg-blue-700 hover:bg-blue-800 text-white' : ''}`}
          disabled={loading}
        >
          {loading ? 'Salvando...' : (modoEdicao ? 'Salvar Alterações' : 'Cadastrar')}
        </button>
      </div>
    </form>
  );
} 