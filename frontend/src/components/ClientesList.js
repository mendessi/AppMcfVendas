import React, { useState, useEffect } from 'react';

const ClientesList = ({ darkMode }) => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClientes, setFilteredClientes] = useState([]);

  useEffect(() => {
    // Em um ambiente real, você faria uma chamada à API aqui
    // Por enquanto, vamos simular dados
    const fetchClientes = async () => {
      try {
        // Simular uma chamada de API
        setTimeout(() => {
          const mockClientes = [
            { id: 1, nome: 'Supermercado Silva', cnpj_cpf: '12.345.678/0001-90', endereco: 'Rua das Flores, 123', telefone: '(11) 98765-4321', email: 'contato@supermercadosilva.com.br' },
            { id: 2, nome: 'Farmácia Saúde', cnpj_cpf: '23.456.789/0001-01', endereco: 'Av. Principal, 456', telefone: '(11) 91234-5678', email: 'atendimento@farmaciasaude.com.br' },
            { id: 3, nome: 'Padaria Pão Quente', cnpj_cpf: '34.567.890/0001-12', endereco: 'Rua do Comércio, 789', telefone: '(11) 92345-6789', email: 'contato@padariapaoquente.com.br' },
            { id: 4, nome: 'Açougue Boi Feliz', cnpj_cpf: '45.678.901/0001-23', endereco: 'Rua da Carne, 101', telefone: '(11) 93456-7890', email: 'vendas@boifeliz.com.br' },
            { id: 5, nome: 'Mercado Central', cnpj_cpf: '56.789.012/0001-34', endereco: 'Av. do Centro, 202', telefone: '(11) 94567-8901', email: 'contato@mercadocentral.com.br' },
          ];
          setClientes(mockClientes);
          setFilteredClientes(mockClientes);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        setLoading(false);
      }
    };

    fetchClientes();
  }, []);

  useEffect(() => {
    // Filtrar clientes com base no termo de pesquisa
    const results = clientes.filter(cliente =>
      cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.cnpj_cpf.includes(searchTerm) ||
      cliente.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClientes(results);
  }, [searchTerm, clientes]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className={darkMode ? "text-blue-400" : "text-blue-600"}>Carregando clientes...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Clientes</h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Novo Cliente
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por nome, CNPJ/CPF ou email..."
          className={`w-full p-2 border rounded ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-700"}`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Versão para desktop */}
      <div className="hidden md:block">
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow overflow-hidden`}>
          <table className="min-w-full divide-y divide-gray-700">
            <thead className={darkMode ? "bg-gray-900" : "bg-gray-50"}>
              <tr>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  Nome
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  CNPJ/CPF
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  Telefone
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  Email
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className={`${darkMode ? "bg-gray-800" : "bg-white"} divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
              {filteredClientes.length > 0 ? (
                filteredClientes.map((cliente) => (
                  <tr key={cliente.id} className={darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.nome}</div>
                      <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{cliente.endereco}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.cnpj_cpf}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.telefone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className={darkMode ? "text-blue-400 hover:text-blue-300 mr-3" : "text-blue-600 hover:text-blue-900 mr-3"}>Editar</button>
                      <button className={darkMode ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-900"}>Excluir</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className={`px-6 py-4 text-center text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Nenhum cliente encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Versão para dispositivos móveis - cards */}
      <div className="md:hidden">
        {filteredClientes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredClientes.map((cliente) => (
              <div key={cliente.id} className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow p-4`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`text-lg font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.nome}</h3>
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"} mt-1`}>{cliente.endereco}</p>
                  </div>
                  <div className="flex">
                    <button className={`${darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-900"} mr-3`}>Editar</button>
                    <button className={darkMode ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-900"}>Excluir</button>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-1 gap-2">
                  <div>
                    <span className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase`}>CNPJ/CPF:</span>
                    <p className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.cnpj_cpf}</p>
                  </div>
                  <div>
                    <span className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase`}>Telefone:</span>
                    <p className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.telefone}</p>
                  </div>
                  <div>
                    <span className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase`}>Email:</span>
                    <p className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.email}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow p-6 text-center`}>
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Nenhum cliente encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientesList;
