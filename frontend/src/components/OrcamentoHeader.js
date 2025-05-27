import React from 'react';
import ClienteAutocomplete from './ClienteAutocomplete';
import SelectDinamico from './SelectDinamico';

function OrcamentoHeader({ cliente, setCliente, tabela, setTabela, formaPagamento, setFormaPagamento, vendedor, setVendedor, dataOrcamento, validade, setValidade, especie, setEspecie, desconto, setDesconto, observacao, setObservacao, ESPECIE_OPCOES, vendedores, tabelas, formasPagamento, inputClassName, selectClassName }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-300 mb-2">Cliente</label>
          <ClienteAutocomplete value={cliente} onChange={setCliente} />
        </div>
        <div>
          <label className="block text-gray-300 mb-2">Tabela de Preço</label>
          <SelectDinamico
            label=""
            value={tabela}
            onChange={setTabela}
            options={tabelas.map(t => ({ value: t.codigo || t.TAB_CODIGO, label: t.nome || t.TAB_NOME }))}
            placeholder="Selecione a tabela"
          />
        </div>
      </div>
      <div>
        <label className="block text-gray-300 mb-2">Forma de Pagamento</label>
        <SelectDinamico
          label=""
          value={formaPagamento}
          onChange={setFormaPagamento}
          options={formasPagamento.map(f => ({ value: f.codigo || f.FPG_CODIGO, label: f.nome || f.FPG_NOME }))}
          placeholder="Selecione a forma de pagamento"
        />
      </div>
      <div>
        <label className="block text-gray-300 mb-2">Vendedor</label>
        <SelectDinamico
          label=""
          value={vendedor}
          onChange={setVendedor}
          options={vendedores.map(v => ({ value: v.codigo || v.VEN_CODIGO, label: v.nome || v.VEN_NOME }))}
          placeholder="Selecione o vendedor"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-gray-300 mb-2">Data Orçamento</label>
          <input
            type="date"
            value={dataOrcamento}
            readOnly
            className={`${inputClassName} w-full`}
          />
        </div>
        <div>
          <label className="block text-gray-300 mb-2">Validade</label>
          <input
            type="date"
            value={validade}
            onChange={e => setValidade(e.target.value)}
            className={`${inputClassName} w-full`}
          />
        </div>
        <div>
          <label className="block text-gray-300 mb-2">Espécie</label>
          <select
            value={especie}
            onChange={e => setEspecie(e.target.value)}
            className={`${selectClassName} w-full`}
          >
            {ESPECIE_OPCOES.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-300 mb-2">Desconto</label>
          <input
            type="number"
            value={desconto}
            onChange={e => setDesconto(parseFloat(e.target.value) || 0)}
            className={`${inputClassName} w-full`}
          />
        </div>
        <div className="md:col-span-1">
          <label className="block text-gray-300 mb-2">Observação</label>
          <textarea
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            className={`${inputClassName} w-full min-h-[38px]`}
            rows="1"
          />
        </div>
      </div>
    </div>
  );
}

export default OrcamentoHeader;
