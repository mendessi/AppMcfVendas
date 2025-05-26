import React from 'react';
import ClienteAutocomplete from './ClienteAutocomplete';
import SelectDinamico from './SelectDinamico';
import apiService from '../services/api';

function OrcamentoHeader({ cliente, setCliente, tabela, setTabela, formaPagamento, setFormaPagamento, vendedor, setVendedor, dataOrcamento, validade, setValidade, especie, setEspecie, desconto, setDesconto, observacao, setObservacao, ESPECIE_OPCOES }) {
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
          fetchOptions={async () => {
            const res = await apiService.api.get('/tabelas');
            // Ajuste para o formato [{value, label}]
            return (res.data || []).map(t => ({ value: t.codigo || t.TAB_CODIGO, label: t.nome || t.TAB_NOME }));
          }}
          placeholder="Selecione a tabela"
        />
      </div>
      <div>
        <SelectDinamico
          label="Forma de Pagamento"
          value={formaPagamento}
          onChange={setFormaPagamento}
          fetchOptions={async () => {
            const res = await apiService.api.get('/formapag');
            return (res.data || []).map(f => ({ value: f.codigo || f.FPG_CODIGO, label: f.nome || f.FPG_NOME }));
          }}
          placeholder="Selecione a forma de pagamento"
        />
      </div>
      <div>
        <SelectDinamico
          label="Vendedor"
          value={vendedor}
          onChange={setVendedor}
          fetchOptions={async () => {
            const res = await apiService.api.get('/vendedores');
            return (res.data || []).map(v => ({ value: v.codigo || v.VEN_CODIGO, label: v.nome || v.VEN_NOME }));
          }}
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
