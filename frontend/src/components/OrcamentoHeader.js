import React, { useCallback } from 'react';
import ClienteAutocomplete from './ClienteAutocomplete';
import SelectDinamico from './SelectDinamico';
import api from '../services/api';

function OrcamentoHeader({ cliente, setCliente, tabela, setTabela, formaPagamento, setFormaPagamento, vendedor, setVendedor, dataOrcamento, validade, setValidade, especie, setEspecie, desconto, setDesconto, observacao, setObservacao, ESPECIE_OPCOES }) {
  // Funções de busca memorizadas
  const fetchTabelas = useCallback(async () => {
    try {
      console.log('Buscando tabelas de preço...');
      const token = localStorage.getItem('token');
      const empresaSelecionada = localStorage.getItem('empresa') || localStorage.getItem('empresa_atual') || localStorage.getItem('empresa_selecionada') || localStorage.getItem('empresaSelecionadaCodigo');
      let empresaCodigo = null;
      if (empresaSelecionada) {
        try {
          const empObj = JSON.parse(empresaSelecionada);
          empresaCodigo = empObj?.cli_codigo || empObj?.codigo;
        } catch {
          empresaCodigo = empresaSelecionada;
        }
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      if (empresaCodigo) headers['x-empresa-codigo'] = empresaCodigo;

      const res = await api.get('/relatorios/listar_tabelas', { headers });
      console.log('Resposta tabelas de preço:', res.data);
      return (res.data || []).map(t => ({ value: t.codigo || t.TAB_CODIGO, label: t.nome || t.TAB_NOME }));
    } catch (error) {
      console.error('Erro ao buscar tabelas de preço:', error);
      return [];
    }
  }, []);

  const fetchFormasPagamento = useCallback(async () => {
    try {
      console.log('Buscando formas de pagamento...');
      const token = localStorage.getItem('token');
      const empresaSelecionada = localStorage.getItem('empresa') || localStorage.getItem('empresa_atual') || localStorage.getItem('empresa_selecionada') || localStorage.getItem('empresaSelecionadaCodigo');
      let empresaCodigo = null;
      if (empresaSelecionada) {
        try {
          const empObj = JSON.parse(empresaSelecionada);
          empresaCodigo = empObj?.cli_codigo || empObj?.codigo;
        } catch {
          empresaCodigo = empresaSelecionada;
        }
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      if (empresaCodigo) headers['x-empresa-codigo'] = empresaCodigo;

      const res = await api.get('/relatorios/listar_formas_pagamento', { headers });
      console.log('Resposta formas de pagamento:', res.data);
      return (res.data || []).map(f => ({ value: f.codigo || f.FPG_CODIGO, label: f.nome || f.FPG_NOME }));
    } catch (error) {
      console.error('Erro ao buscar formas de pagamento:', error);
      return [];
    }
  }, []);

  const fetchVendedores = useCallback(async () => {
    try {
      console.log('Buscando vendedores...');
      const token = localStorage.getItem('token');
      const empresaSelecionada = localStorage.getItem('empresa') || localStorage.getItem('empresa_atual') || localStorage.getItem('empresa_selecionada') || localStorage.getItem('empresaSelecionadaCodigo');
      let empresaCodigo = null;
      if (empresaSelecionada) {
        try {
          const empObj = JSON.parse(empresaSelecionada);
          empresaCodigo = empObj?.cli_codigo || empObj?.codigo;
        } catch {
          empresaCodigo = empresaSelecionada;
        }
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      if (empresaCodigo) headers['x-empresa-codigo'] = empresaCodigo;

      const res = await api.get('/relatorios/listar_vendedores', { headers });
      console.log('Resposta vendedores:', res.data);
      return (res.data || []).map(v => ({ value: v.codigo || v.VEN_CODIGO, label: v.nome || v.VEN_NOME }));
    } catch (error) {
      console.error('Erro ao buscar vendedores:', error);
      return [];
    }
  }, []);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-gray-300 mb-1">Cliente</label>
        <ClienteAutocomplete value={cliente} onChange={setCliente} />
      </div>
      <div>
        <SelectDinamico
          label="Tabela de Preço"
          value={tabela}
          onChange={setTabela}
          fetchOptions={fetchTabelas}
          placeholder="Selecione a tabela"
        />
      </div>
      <div>
        <SelectDinamico
          label="Forma de Pagamento"
          value={formaPagamento}
          onChange={setFormaPagamento}
          fetchOptions={fetchFormasPagamento}
          placeholder="Selecione a forma de pagamento"
        />
      </div>
      <div>
        <SelectDinamico
          label="Vendedor"
          value={vendedor}
          onChange={setVendedor}
          fetchOptions={fetchVendedores}
          placeholder="Selecione o vendedor"
        />
      </div>
      <div>
        <label className="block text-gray-300 mb-1">Data Orçamento</label>
        <input type="date" value={dataOrcamento} readOnly className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-gray-100" />
      </div>
      <div>
        <label className="block text-gray-300 mb-1">Validade</label>
        <input type="date" value={validade} onChange={e => setValidade(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-gray-100" />
      </div>
      <div>
        <label className="block text-gray-300 mb-1">Espécie</label>
        <select value={especie} onChange={e => setEspecie(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-gray-100">
          {ESPECIE_OPCOES.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-300 mb-1">Desconto</label>
          <input type="number" value={desconto} onChange={e => setDesconto(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-gray-100" />
        </div>
        <div>
          <label className="block text-gray-300 mb-1">Observação</label>
          <input type="text" value={observacao} onChange={e => setObservacao(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-gray-100" />
        </div>
      </div>
    </div>
  );
}

export default OrcamentoHeader;
