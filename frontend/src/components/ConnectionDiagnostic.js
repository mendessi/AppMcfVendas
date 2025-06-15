import React, { useState, useEffect } from 'react';
import { testMultipleConnections } from '../utils/connection-test';

const ConnectionDiagnostic = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runTests = async () => {
    try {
      setLoading(true);
      setError(null);
      const testResults = await testMultipleConnections();
      setResults(testResults);
    } catch (err) {
      setError(err.message);
      console.error('Erro ao executar testes de conexão:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Executar testes automaticamente ao montar o componente
    runTests();
  }, []);

  // Formatar URL para exibição
  const formatUrl = (url) => {
    if (!url) return 'N/A';
    return url.length > 40 ? url.substring(0, 37) + '...' : url;
  };

  return (
    <div className="bg-white shadow rounded-lg p-4 my-4">
      <h2 className="text-xl font-semibold mb-4">Diagnóstico de Conexão</h2>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="mb-4">
        <button 
          onClick={runTests} 
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          {loading ? 'Testando...' : 'Executar Testes de Conexão'}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-2">Executando testes...</span>
        </div>
      )}

      {results && (
        <div className="overflow-x-auto">
          <h3 className="text-lg font-medium mb-2">Resultados</h3>
          <p className="text-sm text-gray-500 mb-4">Timestamp: {results.timestamp}</p>
          
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teste</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalhes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Conexão Atual */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Conexão Atual</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {results.current?.success ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Sucesso
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Falha
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatUrl(results.current?.url)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {results.current?.success ? `${results.current.responseTime}ms` : results.current?.error}
                </td>
              </tr>

              {/* Conexão Local */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Conexão Local</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {results.local?.success ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Sucesso
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Falha
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatUrl(results.local?.url)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {results.local?.success ? `${results.local.responseTime}ms` : results.local?.error}
                </td>
              </tr>

              {/* Conexão Cloudflare (quando aplicável) */}
              {results.cloud && (
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Conexão Cloudflare</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {results.cloud?.success ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Sucesso
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Falha
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatUrl(results.cloud?.url)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {results.cloud?.success ? `${results.cloud.responseTime}ms` : results.cloud?.error}
                  </td>
                </tr>
              )}

              {/* Teste Externo */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Teste Externo</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {results.external?.success ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Sucesso
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Falha
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatUrl(results.external?.url)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {results.external?.success ? `Status: ${results.external.status}` : results.external?.error}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Informações detalhadas do ambiente */}
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Informações do Ambiente</h3>
            <div className="bg-gray-50 p-4 rounded">
              <p><strong>Hostname:</strong> {window.location.hostname}</p>
              <p><strong>Acesso Externo:</strong> {window.location.hostname.includes('mendessolucao.site') || window.location.hostname.includes('ngrok.io') ? 'Sim' : 'Não'}</p>
              <p><strong>Dispositivo Móvel:</strong> {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Sim' : 'Não'}</p>
              <p><strong>User Agent:</strong> {navigator.userAgent}</p>
            </div>
          </div>

          {/* Recomendações */}
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Recomendações</h3>
            <ul className="list-disc pl-5 space-y-2">
              {!results.current?.success && !results.local?.success && (
                <li className="text-red-600">O servidor backend não está acessível. Verifique se o servidor está rodando na porta 8000.</li>
              )}
              {!results.current?.success && results.local?.success && (
                <li className="text-orange-600">Servidor está rodando localmente, mas a configuração de URL da API está incorreta.</li>
              )}
              {results.cloud && !results.cloud?.success && (
                <li className="text-orange-600">Conexão via Cloudflare falhou. Verifique a configuração do Cloudflare Tunnel.</li>
              )}
              {!results.external?.success && (
                <li className="text-orange-600">Teste externo falhou. Verifique a configuração CORS no servidor.</li>
              )}
              {results.current?.success && (
                <li className="text-green-600">Conexão atual está funcionando corretamente!</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionDiagnostic;
